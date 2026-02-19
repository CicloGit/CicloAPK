import { FieldValue, Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';
import { AuditActor, AuditService, VerifyRange } from './auditService.js';
import { EvidencePayload, buildEvidenceHash, validateEvidencePolicy } from './evidenceService.js';
import {
  CoreRole,
  OPERATION_CATALOG,
  OperationType,
  SETTLEMENT_TEMPLATES,
  normalizeCoreRole,
} from './operationsCatalog.js';
import { ensurePositiveAmount, ensureStockAvailability, ensureString } from './rulesEngine.js';
import { PaymentProviderAdapter } from './settlementService.js';
import {
  assertContractTransition,
  assertDisputeTransition,
  assertListingTransition,
  assertOrderTransition,
  assertSettlementTransition,
} from './stateMachine.js';

export interface ActorContext extends AuditActor {
  role: string;
}

type MarketDomain = 'MARKETPLACE' | 'CONSUMER_MARKET';
type ConsumerChannel = 'WHOLESALE_DIRECT' | 'RETAIL_MARKETS';
type ListingCategory = 'OUTPUTS_PRODUCER' | 'INPUTS_INDUSTRY' | 'AUCTION_P2P';
type ListingMode = 'FIXED_PRICE' | 'AUCTION';

interface ResolveOrderInput {
  orderId?: string;
  supplierOrderId?: string;
}

const nowIso = () => new Date().toISOString();
const nowId = (prefix: string) => `${prefix}-${Date.now()}-${Math.round(Math.random() * 1000)}`;
const todayBR = () => new Date().toLocaleDateString('pt-BR');

const getNumber = (value: unknown, fallback = 0): number => {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
};

const normalizeListingCategory = (
  value: unknown,
  fallback: ListingCategory = 'OUTPUTS_PRODUCER'
): ListingCategory => {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'INPUTS_INDUSTRY') {
    return 'INPUTS_INDUSTRY';
  }
  if (normalized === 'AUCTION_P2P') {
    return 'AUCTION_P2P';
  }
  if (normalized === 'OUTPUTS_PRODUCER') {
    return 'OUTPUTS_PRODUCER';
  }
  return fallback;
};

const normalizeListingMode = (value: unknown, category: ListingCategory): ListingMode => {
  if (category === 'AUCTION_P2P') {
    return 'AUCTION';
  }
  return String(value ?? '').trim().toUpperCase() === 'AUCTION' ? 'AUCTION' : 'FIXED_PRICE';
};

const sanitizeErrorMessage = (error: unknown): string => {
  if (error instanceof HttpsError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Falha de operacao.';
};

export class MarketKernel {
  private readonly audit: AuditService;
  private readonly settlement: PaymentProviderAdapter;

  constructor(private readonly db: Firestore) {
    this.audit = new AuditService(db);
    this.settlement = new PaymentProviderAdapter(db);
  }

  private tenantCollection(actor: ActorContext, collectionName: string) {
    return this.db.collection('tenants').doc(actor.tenantId).collection(collectionName);
  }

  private assertListingCategoryForPublisher(role: CoreRole, listingCategory: ListingCategory): void {
    if (role === 'ADMIN' || role === 'MANAGER') {
      return;
    }

    if (role === 'PRODUCER' && listingCategory === 'INPUTS_INDUSTRY') {
      throw new HttpsError(
        'permission-denied',
        'Produtor nao pode publicar INPUTS_INDUSTRY. Use OUTPUTS_PRODUCER ou AUCTION_P2P.'
      );
    }

    if (role === 'SUPPLIER' && listingCategory !== 'INPUTS_INDUSTRY') {
      throw new HttpsError(
        'permission-denied',
        'Fornecedor pode publicar apenas INPUTS_INDUSTRY.'
      );
    }

    if (role === 'INTEGRATOR') {
      throw new HttpsError(
        'permission-denied',
        'Integradora/Industria atua como compradora neste fluxo e nao publica listing.'
      );
    }
  }

  private assertListingCategoryForBuyer(role: CoreRole, listingCategory: ListingCategory): void {
    if (role === 'ADMIN' || role === 'MANAGER') {
      return;
    }

    if (role === 'PRODUCER' && !['INPUTS_INDUSTRY', 'AUCTION_P2P'].includes(listingCategory)) {
      throw new HttpsError(
        'permission-denied',
        'Produtor comprador pode operar apenas INPUTS_INDUSTRY e AUCTION_P2P.'
      );
    }

    if (role === 'INTEGRATOR' && listingCategory !== 'OUTPUTS_PRODUCER') {
      throw new HttpsError(
        'permission-denied',
        'Integradora/Industria compradora visualiza e negocia apenas OUTPUTS_PRODUCER.'
      );
    }
  }

  private resolveOrderDomain(orderData: Record<string, unknown>): MarketDomain {
    return String(orderData.domain ?? 'MARKETPLACE') === 'CONSUMER_MARKET'
      ? 'CONSUMER_MARKET'
      : 'MARKETPLACE';
  }

  private resolveOrderChannel(orderData: Record<string, unknown>): ConsumerChannel {
    return String(orderData.channel ?? 'WHOLESALE_DIRECT') === 'RETAIL_MARKETS'
      ? 'RETAIL_MARKETS'
      : 'WHOLESALE_DIRECT';
  }

  private operationForDomain(
    domain: MarketDomain,
    marketOperation: OperationType,
    consumerOperation: OperationType
  ): OperationType {
    return domain === 'CONSUMER_MARKET' ? consumerOperation : marketOperation;
  }

  private async appendAudit(
    actor: ActorContext,
    operationType: string,
    eventType: string,
    status: 'SUCCESS' | 'REJECTED',
    payload: Record<string, unknown>
  ) {
    return this.audit.append(actor, {
      eventType,
      operationType,
      status,
      payload,
      stream: 'marketplace',
    });
  }

  private async appendModuleEvent(
    actor: ActorContext,
    operationType: string,
    status: 'SUCCESS' | 'REJECTED',
    payload: Record<string, unknown>
  ) {
    const ref = this.tenantCollection(actor, 'moduleEvents').doc();
    await ref.set({
      id: ref.id,
      operationType,
      status,
      payload,
      correlationId: nowId('EVT'),
      actorUid: actor.uid,
      createdAt: FieldValue.serverTimestamp(),
      createdAtIso: nowIso(),
    });
  }

  private async executeOperation<T>(
    actor: ActorContext,
    operationType: OperationType,
    payload: Record<string, unknown>,
    handler: () => Promise<T>
  ): Promise<T> {
    const config = OPERATION_CATALOG[operationType];
    const coreRole = normalizeCoreRole(actor.role);
    if (!coreRole) {
      await this.appendAudit(actor, operationType, 'OPERATION_REJECTED', 'REJECTED', {
        reason: 'role_not_mapped',
        actorRole: actor.role,
        payload,
      });
      throw new HttpsError('permission-denied', 'Role nao mapeada para o kernel.');
    }

    if (!config.allowedRoles.includes(coreRole)) {
      await this.appendAudit(actor, operationType, 'OPERATION_REJECTED', 'REJECTED', {
        reason: 'role_not_allowed',
        actorRole: actor.role,
        payload,
      });
      throw new HttpsError('permission-denied', 'Operacao nao permitida para este perfil.');
    }

    try {
      const response = await handler();
      await this.appendModuleEvent(actor, operationType, 'SUCCESS', payload);
      return response;
    } catch (error) {
      await this.appendModuleEvent(actor, operationType, 'REJECTED', {
        ...payload,
        error: sanitizeErrorMessage(error),
      });
      await this.appendAudit(actor, operationType, 'OPERATION_REJECTED', 'REJECTED', {
        payload,
        error: sanitizeErrorMessage(error),
      });
      throw error;
    }
  }

  private async resolveOrder(actor: ActorContext, input: ResolveOrderInput) {
    const orderId = String(input.orderId ?? '').trim();
    const supplierOrderId = String(input.supplierOrderId ?? '').trim();
    const orders = this.tenantCollection(actor, 'marketOrders');

    if (orderId) {
      const ref = orders.doc(orderId);
      const snapshot = await ref.get();
      if (!snapshot.exists) {
        throw new HttpsError('not-found', 'Pedido nao encontrado.');
      }
      return { ref, id: ref.id, data: snapshot.data() as Record<string, unknown> };
    }

    if (supplierOrderId) {
      const querySnapshot = await orders.where('supplierOrderId', '==', supplierOrderId).limit(1).get();
      if (querySnapshot.empty) {
        throw new HttpsError('not-found', 'Pedido vinculado ao fornecedor nao encontrado.');
      }
      const docSnapshot = querySnapshot.docs[0];
      return {
        ref: docSnapshot.ref,
        id: docSnapshot.id,
        data: docSnapshot.data() as Record<string, unknown>,
      };
    }

    throw new HttpsError('invalid-argument', 'orderId ou supplierOrderId obrigatorio.');
  }

  private async persistEvidences(
    actor: ActorContext,
    orderId: string,
    operationType: OperationType,
    evidences: EvidencePayload[],
    extra?: Record<string, unknown>
  ) {
    const evidenceCollection = this.tenantCollection(actor, 'evidences');
    const writes = evidences.map((evidence) => {
      const ref = evidenceCollection.doc();
      const evidenceHash = evidence.fileHash ?? buildEvidenceHash(evidence);
      return ref.set({
        id: ref.id,
        tenantId: actor.tenantId,
        orderId,
        operationType,
        type: evidence.type,
        hash: evidenceHash,
        storagePath: evidence.storagePath ?? null,
        gps: evidence.gps ?? null,
        telemetry: evidence.telemetry ?? null,
        documents: evidence.documents ?? [],
        metadata: {
          ...(evidence.metadata ?? {}),
          ...(extra ?? {}),
        },
        createdBy: actor.uid,
        createdAt: FieldValue.serverTimestamp(),
        createdAtIso: nowIso(),
      });
    });
    await Promise.all(writes);
  }

  async health() {
    await this.db.collection('tenants').limit(1).get();
    return {
      status: 'ok',
      module: 'market-kernel-v1',
      timestamp: nowIso(),
    };
  }

  async publishListing(
    actor: ActorContext,
    payload: {
      listingId?: string;
      listing?: Record<string, unknown>;
      channel?: ConsumerChannel;
      domain?: MarketDomain;
    }
  ) {
    return this.executeOperation(actor, 'MARKET_LISTING_PUBLISH', payload as Record<string, unknown>, async () => {
      const listingId = String(payload.listingId ?? '').trim() || nowId('LST');
      const listingRef = this.tenantCollection(actor, 'marketListings').doc(listingId);
      const listingSnapshot = await listingRef.get();
      const incoming = payload.listing ?? {};
      const existing = listingSnapshot.exists ? (listingSnapshot.data() as Record<string, unknown>) : {};
      const currentStatus = String(existing.status ?? 'DRAFT');
      const coreRole = normalizeCoreRole(actor.role);
      if (!coreRole) {
        throw new HttpsError('permission-denied', 'Role nao mapeada para publicacao.');
      }

      const previousCategory = normalizeListingCategory(existing.listingCategory, 'OUTPUTS_PRODUCER');
      const listingCategory = normalizeListingCategory(
        incoming.listingCategory ?? incoming.category,
        previousCategory
      );
      const listingMode = normalizeListingMode(
        incoming.listingMode ?? existing.listingMode,
        listingCategory
      );

      if (listingSnapshot.exists && listingCategory !== previousCategory) {
        throw new HttpsError(
          'failed-precondition',
          'listingCategory e imutavel apos criacao da oferta.'
        );
      }
      this.assertListingCategoryForPublisher(coreRole, listingCategory);
      if (listingCategory === 'AUCTION_P2P' && listingMode !== 'AUCTION') {
        throw new HttpsError(
          'failed-precondition',
          'AUCTION_P2P exige listingMode=AUCTION.'
        );
      }

      const productName = ensureString(
        incoming.productName ?? incoming.name ?? existing.productName,
        'listing.productName'
      );
      const supplierName = String(
        incoming.b2bSupplier ?? incoming.supplierName ?? existing.supplierName ?? 'Fornecedor'
      );
      const availableQuantity = getNumber(
        incoming.availableQuantity ?? incoming.b2bStock ?? existing.availableQuantity,
        0
      );
      const price = getNumber(incoming.price ?? incoming.unitPrice ?? existing.price, 0);
      ensurePositiveAmount(availableQuantity, 'listing.availableQuantity');
      ensurePositiveAmount(price, 'listing.price');

      if (currentStatus !== 'PUBLISHED') {
        assertListingTransition(currentStatus, 'PUBLISHED');
      }

      const domain: MarketDomain =
        payload.domain === 'CONSUMER_MARKET' || payload.channel ? 'CONSUMER_MARKET' : this.resolveOrderDomain(existing);

      await listingRef.set(
        {
          id: listingRef.id,
          createdByUserId: String(existing.createdByUserId ?? actor.uid),
          listingCategory,
          listingMode,
          productName,
          supplierName,
          availableQuantity,
          price,
          status: 'PUBLISHED',
          channel: payload.channel ?? this.resolveOrderChannel(existing),
          domain,
          tenantId: actor.tenantId,
          publishedAtIso: nowIso(),
          updatedAt: FieldValue.serverTimestamp(),
          ...(listingSnapshot.exists
            ? {}
            : {
                createdAt: FieldValue.serverTimestamp(),
                createdAtIso: nowIso(),
              }),
        },
        { merge: true }
      );

      await this.appendAudit(actor, 'MARKET_LISTING_PUBLISH', 'LISTING_PUBLISHED', 'SUCCESS', {
        listingId: listingRef.id,
        listingCategory,
        listingMode,
        availableQuantity,
        price,
        domain,
      });

      return {
        listingId: listingRef.id,
        status: 'PUBLISHED',
      };
    });
  }

  async updateListingStatus(
    actor: ActorContext,
    payload: { listingId?: string; status?: 'PUBLISHED' | 'PAUSED' | 'CLOSED' }
  ) {
    return this.executeOperation(actor, 'MARKET_LISTING_PUBLISH', payload as Record<string, unknown>, async () => {
      const listingId = ensureString(payload.listingId, 'listingId');
      const targetStatusRaw = ensureString(payload.status, 'status').toUpperCase();
      if (!['PUBLISHED', 'PAUSED', 'CLOSED'].includes(targetStatusRaw)) {
        throw new HttpsError('invalid-argument', 'status invalido. Use PUBLISHED, PAUSED ou CLOSED.');
      }
      const targetStatus = targetStatusRaw as 'PUBLISHED' | 'PAUSED' | 'CLOSED';
      const listingRef = this.tenantCollection(actor, 'marketListings').doc(listingId);
      const listingSnapshot = await listingRef.get();
      if (!listingSnapshot.exists) {
        throw new HttpsError('not-found', 'Listing nao encontrado.');
      }

      const listingData = listingSnapshot.data() as Record<string, unknown>;
      const currentStatus = String(listingData.status ?? 'DRAFT');
      const coreRole = normalizeCoreRole(actor.role);
      if (!coreRole) {
        throw new HttpsError('permission-denied', 'Role nao mapeada para atualizacao de status.');
      }

      const listingCategory = normalizeListingCategory(listingData.listingCategory, 'OUTPUTS_PRODUCER');
      this.assertListingCategoryForPublisher(coreRole, listingCategory);
      if (currentStatus !== targetStatus) {
        assertListingTransition(currentStatus, targetStatus);
      }

      await listingRef.set(
        {
          status: targetStatus,
          updatedAt: FieldValue.serverTimestamp(),
          updatedAtIso: nowIso(),
        },
        { merge: true }
      );

      const eventType =
        targetStatus === 'PAUSED'
          ? 'LISTING_PAUSED'
          : targetStatus === 'CLOSED'
            ? 'LISTING_CLOSED'
            : 'LISTING_PUBLISHED';

      await this.appendAudit(actor, 'MARKET_LISTING_PUBLISH', eventType, 'SUCCESS', {
        listingId,
        listingCategory,
        status: targetStatus,
      });

      return {
        listingId,
        status: targetStatus,
      };
    });
  }

  async placeOrder(
    actor: ActorContext,
    payload: {
      listingId?: string;
      listing?: Record<string, unknown>;
      quantity?: number;
      unitPrice?: number;
      paymentMethod?: string;
      channel?: ConsumerChannel;
      domain?: MarketDomain;
      transactionId?: string;
    }
  ) {
    const domain: MarketDomain =
      payload.domain === 'CONSUMER_MARKET' || payload.channel ? 'CONSUMER_MARKET' : 'MARKETPLACE';
    const operationType = this.operationForDomain(
      domain,
      'MARKET_ORDER_PLACE',
      'CONSUMER_MARKET_ORDER_CREATE'
    );

    return this.executeOperation(actor, operationType, payload as Record<string, unknown>, async () => {
      const quantity = getNumber(payload.quantity, 0);
      ensurePositiveAmount(quantity, 'quantity');
      const coreRole = normalizeCoreRole(actor.role);
      if (!coreRole) {
        throw new HttpsError('permission-denied', 'Role nao mapeada para pedido.');
      }

      const listingId = String(payload.listingId ?? '').trim() || nowId('LST');
      const listings = this.tenantCollection(actor, 'marketListings');
      const listingRef = listings.doc(listingId);
      const listingSnapshot = await listingRef.get();
      let listingData = listingSnapshot.data() as Record<string, unknown> | undefined;

      if (!listingSnapshot.exists) {
        const listingInput = payload.listing ?? {};
        const productName = ensureString(
          listingInput.productName ?? listingInput.name ?? 'Item',
          'listing.productName'
        );
        const availableQuantity = getNumber(
          listingInput.availableQuantity ?? listingInput.b2bStock ?? quantity,
          quantity
        );
        const price = getNumber(payload.unitPrice ?? listingInput.price ?? listingInput.unitPrice, 0);
        ensurePositiveAmount(price, 'unitPrice');
        const listingCategory = normalizeListingCategory(
          listingInput.listingCategory ?? listingInput.category,
          coreRole === 'SUPPLIER' ? 'INPUTS_INDUSTRY' : 'OUTPUTS_PRODUCER'
        );
        const listingMode = normalizeListingMode(listingInput.listingMode, listingCategory);
        this.assertListingCategoryForPublisher(coreRole, listingCategory);

        listingData = {
          id: listingRef.id,
          createdByUserId: actor.uid,
          listingCategory,
          listingMode,
          productName,
          supplierName: String(listingInput.b2bSupplier ?? listingInput.supplierName ?? 'Fornecedor'),
          availableQuantity,
          price,
          status: 'PUBLISHED',
          channel: payload.channel ?? 'WHOLESALE_DIRECT',
          domain,
          tenantId: actor.tenantId,
          createdAt: FieldValue.serverTimestamp(),
          createdAtIso: nowIso(),
          updatedAt: FieldValue.serverTimestamp(),
        };
        await listingRef.set(listingData, { merge: true });
      }

      const listingStatus = String(listingData?.status ?? 'DRAFT');
      if (listingStatus !== 'PUBLISHED') {
        throw new HttpsError('failed-precondition', 'Listing precisa estar PUBLISHED para aceitar pedido.');
      }
      const listingCategory = normalizeListingCategory(listingData?.listingCategory, 'OUTPUTS_PRODUCER');
      this.assertListingCategoryForBuyer(coreRole, listingCategory);
      if (listingCategory === 'AUCTION_P2P') {
        throw new HttpsError(
          'failed-precondition',
          'AUCTION_P2P exige fluxo de lance dedicado (AUCTION_BID_PLACE).'
        );
      }

      const unitPrice = getNumber(payload.unitPrice ?? listingData?.price, 0);
      ensurePositiveAmount(unitPrice, 'unitPrice');

      const totalAmount = Number((unitPrice * quantity).toFixed(2));
      const orderId = nowId('ORD');
      const supplierOrderId = nowId('SORD');
      const transactionId = String(payload.transactionId ?? nowId('TRX'));
      const channel = payload.channel ?? this.resolveOrderChannel(listingData ?? {});
      const orderRef = this.tenantCollection(actor, 'marketOrders').doc(orderId);

      await orderRef.set({
        id: orderId,
        listingId: listingRef.id,
        supplierOrderId,
        buyerUid: actor.uid,
        quantity,
        unitPrice,
        totalAmount,
        paymentMethod: payload.paymentMethod ?? 'pix',
        status: 'CREATED',
        listingCategory,
        domain,
        channel,
        transactionId,
        tenantId: actor.tenantId,
        createdAt: FieldValue.serverTimestamp(),
        createdAtIso: nowIso(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      await this.db.collection('marketplaceOrders').doc(orderId).set(
        {
          id: orderId,
          customer: actor.uid,
          transactionId,
          totalValue: totalAmount,
          grossValue: totalAmount,
          fees: 0,
          paymentMethod: payload.paymentMethod ?? 'pix',
          status: 'CREATED',
          createdAtLabel: todayBR(),
          items: [
            {
              listingId: listingRef.id,
              productName: String(listingData?.productName ?? 'Produto'),
              supplier: String(listingData?.supplierName ?? 'Fornecedor'),
              quantity,
              unitPrice,
              listingCategory,
              source: domain === 'CONSUMER_MARKET' ? 'LOCAL' : 'B2B',
            },
          ],
          createdBy: actor.uid,
          updatedAt: FieldValue.serverTimestamp(),
          createdAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await this.db.collection('supplierOrders').doc(supplierOrderId).set(
        {
          id: supplierOrderId,
          marketOrderId: orderId,
          customer: actor.uid,
          totalValue: totalAmount,
          date: todayBR(),
          status: 'PENDENTE',
          items: [
            {
              productName: String(listingData?.productName ?? 'Produto'),
              quantity,
            },
          ],
          supplier: String(listingData?.supplierName ?? 'Fornecedor'),
          transactionId,
          createdBy: actor.uid,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await this.appendAudit(actor, operationType, 'ORDER_PLACED', 'SUCCESS', {
        orderId,
        supplierOrderId,
        listingId: listingRef.id,
        listingCategory,
        totalAmount,
        domain,
        channel,
      });

      return { orderId, supplierOrderId, transactionId, status: 'CREATED' };
    });
  }

  async reserveStock(actor: ActorContext, payload: ResolveOrderInput) {
    return this.executeOperation(actor, 'MARKET_ORDER_RESERVE_STOCK', payload as Record<string, unknown>, async () => {
      const order = await this.resolveOrder(actor, payload);
      const listingId = ensureString(order.data.listingId, 'listingId');
      const listingRef = this.tenantCollection(actor, 'marketListings').doc(listingId);
      const quantity = getNumber(order.data.quantity, 0);
      ensurePositiveAmount(quantity, 'order.quantity');

      await this.db.runTransaction(async (tx) => {
        const orderSnapshot = await tx.get(order.ref);
        const listingSnapshot = await tx.get(listingRef);
        if (!orderSnapshot.exists || !listingSnapshot.exists) {
          throw new HttpsError('not-found', 'Pedido ou listing nao encontrado.');
        }

        const orderData = orderSnapshot.data() as Record<string, unknown>;
        const listingData = listingSnapshot.data() as Record<string, unknown>;
        assertOrderTransition(String(orderData.status ?? 'CREATED'), 'RESERVED');

        const available = getNumber(listingData.availableQuantity, 0);
        ensureStockAvailability(quantity, available, listingRef.id);

        tx.update(listingRef, {
          availableQuantity: available - quantity,
          updatedAt: FieldValue.serverTimestamp(),
        });
        tx.update(order.ref, {
          status: 'RESERVED',
          reservedAt: nowIso(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      await this.appendAudit(actor, 'MARKET_ORDER_RESERVE_STOCK', 'STOCK_RESERVED', 'SUCCESS', {
        orderId: order.id,
        listingId,
        quantity,
      });

      return { orderId: order.id, status: 'RESERVED' };
    });
  }

  async signContract(
    actor: ActorContext,
    payload: ResolveOrderInput & {
      contractTerms?: string;
      evidences?: EvidencePayload[];
      contractUrl?: string;
    }
  ) {
    const order = await this.resolveOrder(actor, payload);
    const domain = this.resolveOrderDomain(order.data);
    const operationType = this.operationForDomain(
      domain,
      'MARKET_CONTRACT_SIGN',
      'CONSUMER_MARKET_CONTRACT_SIGN'
    );

    return this.executeOperation(actor, operationType, payload as Record<string, unknown>, async () => {
      const evidences = Array.isArray(payload.evidences) ? payload.evidences.slice() : [];
      if (payload.contractUrl) {
        evidences.push({
          type: 'TYPE_B',
          documents: [{ kind: 'CONTRACT', storagePath: payload.contractUrl }],
        });
      }

      validateEvidencePolicy(OPERATION_CATALOG[operationType].evidencePolicy, evidences);
      assertOrderTransition(String(order.data.status ?? 'CREATED'), 'CONTRACT_PENDING');

      const contractId = nowId('CTR');
      const contractRef = this.tenantCollection(actor, 'marketContracts').doc(contractId);
      await contractRef.set({
        id: contractId,
        orderId: order.id,
        status: 'SIGNED',
        terms: payload.contractTerms ?? 'Contrato Safe Deal v1',
        signedBy: actor.uid,
        signedAtIso: nowIso(),
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      await order.ref.set(
        {
          status: 'CONTRACT_PENDING',
          contractId,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await this.persistEvidences(actor, order.id, operationType, evidences, { contractId });
      await this.appendAudit(actor, operationType, 'CONTRACT_SIGNED', 'SUCCESS', {
        orderId: order.id,
        contractId,
      });

      return {
        orderId: order.id,
        contractId,
        status: 'CONTRACT_PENDING',
      };
    });
  }

  async createEscrow(actor: ActorContext, payload: ResolveOrderInput & { amount?: number }) {
    return this.executeOperation(actor, 'MARKET_ESCROW_CREATE', payload as Record<string, unknown>, async () => {
      const order = await this.resolveOrder(actor, payload);
      assertOrderTransition(String(order.data.status ?? 'CREATED'), 'ESCROW_CREATED');

      const domain = this.resolveOrderDomain(order.data);
      const template = SETTLEMENT_TEMPLATES[domain];
      const totalAmount = getNumber(payload.amount ?? order.data.totalAmount, 0);
      ensurePositiveAmount(totalAmount, 'amount');

      const settlementId = String(order.data.settlementId ?? nowId('SET'));
      await this.settlement.createEscrow(
        { tenantId: actor.tenantId, uid: actor.uid },
        settlementId,
        {
          orderId: order.id,
          amount: totalAmount,
          templateCode: template.code,
        }
      );

      await order.ref.set(
        {
          status: 'ESCROW_CREATED',
          settlementId,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await this.appendAudit(actor, 'MARKET_ESCROW_CREATE', 'ESCROW_CREATED', 'SUCCESS', {
        orderId: order.id,
        settlementId,
        amount: totalAmount,
      });

      return {
        orderId: order.id,
        settlementId,
        status: 'ESCROW_CREATED',
      };
    });
  }

  async confirmDispatch(
    actor: ActorContext,
    payload: ResolveOrderInput & { evidences?: EvidencePayload[]; telemetry?: Record<string, unknown> }
  ) {
    const order = await this.resolveOrder(actor, payload);
    const domain = this.resolveOrderDomain(order.data);
    const operationType = this.operationForDomain(
      domain,
      'MARKET_DISPATCH_CONFIRM',
      'CONSUMER_MARKET_DISPATCH_CONFIRM'
    );

    return this.executeOperation(actor, operationType, payload as Record<string, unknown>, async () => {
      const evidences = Array.isArray(payload.evidences) ? payload.evidences.slice() : [];
      if (payload.telemetry) {
        evidences.push({
          type: 'TYPE_A',
          telemetry: {
            source: String(payload.telemetry.source ?? 'manual-dispatch'),
            capturedAt: String(payload.telemetry.capturedAt ?? nowIso()),
            data: payload.telemetry,
          },
        });
      }

      validateEvidencePolicy(OPERATION_CATALOG[operationType].evidencePolicy, evidences);
      assertOrderTransition(String(order.data.status ?? 'CREATED'), 'DISPATCHED');

      await this.persistEvidences(actor, order.id, operationType, evidences);
      await order.ref.set(
        {
          status: 'DISPATCHED',
          dispatchedAtIso: nowIso(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      const supplierOrderId = String(order.data.supplierOrderId ?? '');
      if (supplierOrderId) {
        await this.db.collection('supplierOrders').doc(supplierOrderId).set(
          {
            status: 'ENVIADO',
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      await this.appendAudit(actor, operationType, 'DISPATCH_CONFIRMED', 'SUCCESS', {
        orderId: order.id,
        supplierOrderId,
      });

      return {
        orderId: order.id,
        status: 'DISPATCHED',
      };
    });
  }

  async confirmDelivery(
    actor: ActorContext,
    payload: ResolveOrderInput & { evidences?: EvidencePayload[]; requireDocumentTypeB?: boolean }
  ) {
    const order = await this.resolveOrder(actor, payload);
    const domain = this.resolveOrderDomain(order.data);
    const operationType = this.operationForDomain(
      domain,
      'MARKET_DELIVERY_CONFIRM',
      'CONSUMER_MARKET_DELIVERY_CONFIRM'
    );

    return this.executeOperation(actor, operationType, payload as Record<string, unknown>, async () => {
      const evidences = Array.isArray(payload.evidences) ? payload.evidences : [];
      validateEvidencePolicy(OPERATION_CATALOG[operationType].evidencePolicy, evidences, {
        requireDocumentTypeB: Boolean(payload.requireDocumentTypeB),
      });

      assertOrderTransition(String(order.data.status ?? 'CREATED'), 'DELIVERED');
      await this.persistEvidences(actor, order.id, operationType, evidences);

      await order.ref.set(
        {
          status: 'DELIVERED',
          deliveredAtIso: nowIso(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      const supplierOrderId = String(order.data.supplierOrderId ?? '');
      if (supplierOrderId) {
        await this.db.collection('supplierOrders').doc(supplierOrderId).set(
          {
            status: 'ENTREGUE',
            updatedAt: FieldValue.serverTimestamp(),
          },
          { merge: true }
        );
      }

      await this.appendAudit(actor, operationType, 'DELIVERY_CONFIRMED', 'SUCCESS', {
        orderId: order.id,
        supplierOrderId,
      });

      return {
        orderId: order.id,
        status: 'DELIVERED',
      };
    });
  }

  async releaseSettlement(
    actor: ActorContext,
    payload: ResolveOrderInput & { settlementId?: string; amount?: number }
  ) {
    const order = await this.resolveOrder(actor, payload);
    const domain = this.resolveOrderDomain(order.data);
    const operationType = this.operationForDomain(
      domain,
      'MARKET_SPLIT_RELEASE',
      'CONSUMER_MARKET_SETTLEMENT_RELEASE'
    );

    return this.executeOperation(actor, operationType, payload as Record<string, unknown>, async () => {
      assertOrderTransition(String(order.data.status ?? 'CREATED'), 'SETTLED');

      const settlementId = String(payload.settlementId ?? order.data.settlementId ?? '');
      if (!settlementId) {
        throw new HttpsError('failed-precondition', 'Pedido sem settlement associado.');
      }

      const settlementRef = this.tenantCollection(actor, 'settlements').doc(settlementId);
      const settlementSnapshot = await settlementRef.get();
      if (!settlementSnapshot.exists) {
        throw new HttpsError('not-found', 'Settlement nao encontrado.');
      }

      const settlementData = settlementSnapshot.data() as Record<string, unknown>;
      const settlementStatus = String(settlementData.status ?? 'CREATED');
      assertSettlementTransition(settlementStatus, 'RELEASED');

      const chainCheck = await this.audit.verifyChain(actor.tenantId, { limit: 2000 });
      if (!chainCheck.valid) {
        throw new HttpsError('failed-precondition', 'AuditChain invalida. Liberacao bloqueada.');
      }

      const orderAuditSnapshot = await this.tenantCollection(actor, 'auditLogs')
        .orderBy('sequence', 'desc')
        .limit(400)
        .get();
      const orderEvents = orderAuditSnapshot.docs.filter((docSnapshot) => {
        const payloadData = docSnapshot.get('payload') as Record<string, unknown>;
        return String(payloadData?.orderId ?? '') === order.id;
      });
      const orderEventTypes = new Set(orderEvents.map((docSnapshot) => String(docSnapshot.get('eventType'))));
      const requiredEvents = [
        'ORDER_PLACED',
        'STOCK_RESERVED',
        'CONTRACT_SIGNED',
        'ESCROW_CREATED',
        'DISPATCH_CONFIRMED',
        'DELIVERY_CONFIRMED',
      ];
      const missing = requiredEvents.filter((eventType) => !orderEventTypes.has(eventType));
      if (missing.length > 0) {
        throw new HttpsError(
          'failed-precondition',
          `Liberacao bloqueada: eventos auditaveis ausentes (${missing.join(', ')}).`
        );
      }

      const evidenceSnapshot = await this.tenantCollection(actor, 'evidences')
        .where('orderId', '==', order.id)
        .get();
      const evidenceOps = new Set(
        evidenceSnapshot.docs.map((docSnapshot) => String(docSnapshot.get('operationType')))
      );

      const hasDispatchEvidence = Array.from(evidenceOps).some((operation) =>
        ['MARKET_DISPATCH_CONFIRM', 'CONSUMER_MARKET_DISPATCH_CONFIRM'].includes(operation)
      );
      const hasDeliveryEvidence = Array.from(evidenceOps).some((operation) =>
        ['MARKET_DELIVERY_CONFIRM', 'CONSUMER_MARKET_DELIVERY_CONFIRM'].includes(operation)
      );
      if (!hasDispatchEvidence || !hasDeliveryEvidence) {
        throw new HttpsError(
          'failed-precondition',
          'Liberacao bloqueada: evidencias obrigatorias de dispatch/delivery nao encontradas.'
        );
      }

      const splitTemplate = SETTLEMENT_TEMPLATES[domain];
      const totalAmount = getNumber(payload.amount ?? settlementData.escrowAmount, 0);
      ensurePositiveAmount(totalAmount, 'amount');

      const splitResult = await this.settlement.split(
        { tenantId: actor.tenantId, uid: actor.uid },
        settlementId,
        {
          totalAmount,
          rules: splitTemplate.split.map((item) => ({ party: item.party, share: item.share })),
        }
      );

      await settlementRef.set(
        {
          milestones: {
            M3: true,
            M4: true,
            M5: true,
          },
          auditVerified: true,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await order.ref.set(
        {
          status: 'SETTLED',
          settledAtIso: nowIso(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      await this.appendAudit(actor, operationType, 'SPLIT_RELEASED', 'SUCCESS', {
        orderId: order.id,
        settlementId,
        totalAmount,
        splitItems: splitResult.items,
      });

      return {
        orderId: order.id,
        settlementId,
        status: 'SETTLED',
        splitItems: splitResult.items,
      };
    });
  }

  async openDispute(
    actor: ActorContext,
    payload: ResolveOrderInput & { reason?: string; message?: string; priority?: 'LOW' | 'MEDIUM' | 'HIGH' }
  ) {
    return this.executeOperation(actor, 'MARKET_DISPUTE_OPEN', payload as Record<string, unknown>, async () => {
      const order = await this.resolveOrder(actor, payload);
      const reason = ensureString(payload.reason, 'reason');
      const disputeRef = this.tenantCollection(actor, 'disputes').doc();
      const ticketRef = this.tenantCollection(actor, 'supportTickets').doc();

      await disputeRef.set({
        id: disputeRef.id,
        orderId: order.id,
        status: 'OPEN',
        reason,
        openedBy: actor.uid,
        createdAt: FieldValue.serverTimestamp(),
        createdAtIso: nowIso(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      await ticketRef.set({
        id: ticketRef.id,
        relatedEntity: 'marketOrder',
        relatedEntityId: order.id,
        disputeId: disputeRef.id,
        subject: `Disputa de pedido ${order.id}`,
        status: 'OPEN',
        priority: payload.priority ?? 'MEDIUM',
        createdBy: actor.uid,
        createdAt: FieldValue.serverTimestamp(),
        createdAtIso: nowIso(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      if (payload.message) {
        const messageRef = this.tenantCollection(actor, 'messages').doc();
        await messageRef.set({
          id: messageRef.id,
          ticketId: ticketRef.id,
          disputeId: disputeRef.id,
          body: payload.message,
          authorUid: actor.uid,
          immutable: true,
          createdAt: FieldValue.serverTimestamp(),
          createdAtIso: nowIso(),
        });
      }

      await this.appendAudit(actor, 'MARKET_DISPUTE_OPEN', 'DISPUTE_OPENED', 'SUCCESS', {
        orderId: order.id,
        disputeId: disputeRef.id,
        ticketId: ticketRef.id,
      });

      return {
        orderId: order.id,
        disputeId: disputeRef.id,
        ticketId: ticketRef.id,
        status: 'OPEN',
      };
    });
  }

  async resolveDispute(
    actor: ActorContext,
    payload: { disputeId?: string; status?: 'RESOLVED' | 'REJECTED'; resolution?: string; note?: string }
  ) {
    return this.executeOperation(actor, 'MARKET_DISPUTE_RESOLVE', payload as Record<string, unknown>, async () => {
      const disputeId = ensureString(payload.disputeId, 'disputeId');
      const targetStatus = payload.status === 'REJECTED' ? 'REJECTED' : 'RESOLVED';
      const disputeRef = this.tenantCollection(actor, 'disputes').doc(disputeId);
      const disputeSnapshot = await disputeRef.get();
      if (!disputeSnapshot.exists) {
        throw new HttpsError('not-found', 'Disputa nao encontrada.');
      }

      const disputeData = disputeSnapshot.data() as Record<string, unknown>;
      assertDisputeTransition(String(disputeData.status ?? 'OPEN'), targetStatus);

      await disputeRef.set(
        {
          status: targetStatus,
          resolution: payload.resolution ?? 'Resolucao registrada no portal de suporte.',
          resolvedBy: actor.uid,
          resolvedAtIso: nowIso(),
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      const auditEventRef = this.tenantCollection(actor, 'approvalsAuditEvents').doc();
      await auditEventRef.set({
        id: auditEventRef.id,
        type: 'DISPUTE_RESOLUTION',
        disputeId,
        decision: targetStatus,
        note: payload.note ?? null,
        actorUid: actor.uid,
        immutable: true,
        createdAt: FieldValue.serverTimestamp(),
        createdAtIso: nowIso(),
      });

      await this.appendAudit(actor, 'MARKET_DISPUTE_RESOLVE', 'DISPUTE_RESOLVED', 'SUCCESS', {
        disputeId,
        status: targetStatus,
      });

      return {
        disputeId,
        status: targetStatus,
      };
    });
  }

  async verifyAuditChain(actor: ActorContext, range?: VerifyRange) {
    const result = await this.audit.verifyChain(actor.tenantId, range);
    return {
      tenantId: actor.tenantId,
      ...result,
    };
  }

  async openSupportTicket(
    actor: ActorContext,
    payload: { orderId?: string; subject?: string; message?: string; priority?: 'LOW' | 'MEDIUM' | 'HIGH' }
  ) {
    const allowedRoles = new Set(['TRAFFIC_MANAGER', 'MANAGER', 'ADMIN']);
    const coreRole = normalizeCoreRole(actor.role);
    if (!coreRole || !allowedRoles.has(coreRole)) {
      throw new HttpsError('permission-denied', 'Sem permissao para abrir ticket de suporte.');
    }

    const subject = ensureString(payload.subject, 'subject');
    const ticketRef = this.tenantCollection(actor, 'supportTickets').doc();
    await ticketRef.set({
      id: ticketRef.id,
      relatedEntity: 'marketOrder',
      relatedEntityId: payload.orderId ?? null,
      subject,
      priority: payload.priority ?? 'MEDIUM',
      status: 'OPEN',
      createdBy: actor.uid,
      createdAt: FieldValue.serverTimestamp(),
      createdAtIso: nowIso(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    if (payload.message) {
      const messageRef = this.tenantCollection(actor, 'messages').doc();
      await messageRef.set({
        id: messageRef.id,
        ticketId: ticketRef.id,
        body: payload.message,
        authorUid: actor.uid,
        immutable: true,
        createdAt: FieldValue.serverTimestamp(),
        createdAtIso: nowIso(),
      });
    }

    await this.appendAudit(actor, 'MARKET_DISPUTE_OPEN', 'SUPPORT_TICKET_OPENED', 'SUCCESS', {
      ticketId: ticketRef.id,
      relatedOrderId: payload.orderId ?? null,
    });

    return { ticketId: ticketRef.id, status: 'OPEN' };
  }

  async addSupportMessage(actor: ActorContext, payload: { ticketId?: string; message?: string }) {
    const ticketId = ensureString(payload.ticketId, 'ticketId');
    const message = ensureString(payload.message, 'message');
    const ticketRef = this.tenantCollection(actor, 'supportTickets').doc(ticketId);
    const ticketSnapshot = await ticketRef.get();
    if (!ticketSnapshot.exists) {
      throw new HttpsError('not-found', 'Ticket nao encontrado.');
    }

    const messageRef = this.tenantCollection(actor, 'messages').doc();
    await messageRef.set({
      id: messageRef.id,
      ticketId,
      body: message,
      authorUid: actor.uid,
      immutable: true,
      createdAt: FieldValue.serverTimestamp(),
      createdAtIso: nowIso(),
    });

    await this.appendAudit(actor, 'MARKET_DISPUTE_OPEN', 'SUPPORT_MESSAGE_ADDED', 'SUCCESS', {
      ticketId,
      messageId: messageRef.id,
    });

    return { ticketId, messageId: messageRef.id };
  }

  async requestSupportApproval(
    actor: ActorContext,
    payload: { ticketId?: string; actionType?: string; reason?: string }
  ) {
    const ticketId = ensureString(payload.ticketId, 'ticketId');
    const actionType = ensureString(payload.actionType, 'actionType');
    const reason = ensureString(payload.reason, 'reason');
    const requestRef = this.tenantCollection(actor, 'approvalRequests').doc();

    await requestRef.set({
      id: requestRef.id,
      ticketId,
      actionType,
      reason,
      status: 'PENDING',
      requestedBy: actor.uid,
      createdAt: FieldValue.serverTimestamp(),
      createdAtIso: nowIso(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    await this.appendAudit(actor, 'MARKET_DISPUTE_OPEN', 'SUPPORT_APPROVAL_REQUESTED', 'SUCCESS', {
      requestId: requestRef.id,
      ticketId,
      actionType,
    });

    return { requestId: requestRef.id, status: 'PENDING' };
  }

  async decideSupportApproval(
    actor: ActorContext,
    payload: { requestId?: string; decision?: 'APPROVED' | 'REJECTED'; note?: string }
  ) {
    const allowedRoles = new Set(['TRAFFIC_MANAGER', 'MANAGER', 'ADMIN']);
    const coreRole = normalizeCoreRole(actor.role);
    if (!coreRole || !allowedRoles.has(coreRole)) {
      throw new HttpsError('permission-denied', 'Sem permissao para aprovar solicitacao.');
    }

    const requestId = ensureString(payload.requestId, 'requestId');
    const decision = payload.decision === 'REJECTED' ? 'REJECTED' : 'APPROVED';
    const requestRef = this.tenantCollection(actor, 'approvalRequests').doc(requestId);
    const requestSnapshot = await requestRef.get();
    if (!requestSnapshot.exists) {
      throw new HttpsError('not-found', 'Solicitacao nao encontrada.');
    }

    await requestRef.set(
      {
        status: decision,
        decidedBy: actor.uid,
        decidedAtIso: nowIso(),
        note: payload.note ?? null,
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    const eventRef = this.tenantCollection(actor, 'approvalsAuditEvents').doc();
    await eventRef.set({
      id: eventRef.id,
      requestId,
      decision,
      note: payload.note ?? null,
      actorUid: actor.uid,
      immutable: true,
      createdAt: FieldValue.serverTimestamp(),
      createdAtIso: nowIso(),
    });

    await this.appendAudit(actor, 'MARKET_DISPUTE_RESOLVE', 'SUPPORT_APPROVAL_DECIDED', 'SUCCESS', {
      requestId,
      decision,
    });

    return { requestId, status: decision };
  }
}
