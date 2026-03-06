import { collection, doc, getDoc, getDocs, query, runTransaction, serverTimestamp, setDoc, updateDoc, where } from 'firebase/firestore';
import { AuditChain } from '../lib/auditChain';
import { RulesEngine, hasSufficientStock } from '../lib/rulesEngine';
import { db } from '../config/firebase';
import { AuditEvent, InventoryItem, StockMovement } from '../types';
import { parseDateToTimestamp } from './dateUtils';
import { TenantContext, hasTenantAccess, resolveTenantContext, withTenantFields } from './tenantContext';

const inventoryCollection = collection(db, 'inventoryItems');
const movementCollection = collection(db, 'stockMovements');
const auditCollection = collection(db, 'auditEvents');
const todayBR = () => new Date().toLocaleDateString('pt-BR');

const toInventoryItem = (id: string, raw: Record<string, unknown>): InventoryItem => ({
  id,
  name: String(raw.name ?? ''),
  category: (raw.category as InventoryItem['category']) ?? 'Outro',
  quantity: Number(raw.quantity ?? 0),
  unit: String(raw.unit ?? ''),
  minLevel: Number(raw.minLevel ?? 0),
  location: String(raw.location ?? ''),
  unitCost: raw.unitCost !== undefined && raw.unitCost !== null ? Number(raw.unitCost) : undefined,
  assetTag: raw.assetTag ? String(raw.assetTag) : undefined,
  lastUpdated: String(raw.lastUpdated ?? todayBR()),
});

const toStockMovement = (id: string, raw: Record<string, unknown>): StockMovement => ({
  id,
  itemId: String(raw.itemId ?? ''),
  itemName: String(raw.itemName ?? ''),
  type: (raw.type as StockMovement['type']) ?? 'OUTBOUND_USAGE',
  quantity: Number(raw.quantity ?? 0),
  unit: String(raw.unit ?? ''),
  date: String(raw.date ?? todayBR()),
  status: (raw.status as StockMovement['status']) ?? 'PENDING_APPROVAL',
  requester: String(raw.requester ?? ''),
  invoiceNumber: raw.invoiceNumber ? String(raw.invoiceNumber) : undefined,
  proofUrl: raw.proofUrl ? String(raw.proofUrl) : undefined,
  reason: raw.reason ? String(raw.reason) : undefined,
  auditHash: raw.auditHash ? String(raw.auditHash) : undefined,
});

const toAuditEvent = (id: string, raw: Record<string, unknown>): AuditEvent => ({
  id,
  timestamp: String(raw.timestamp ?? new Date().toISOString()),
  actor: String(raw.actor ?? ''),
  action: String(raw.action ?? ''),
  details: String(raw.details ?? ''),
  geolocation: String(raw.geolocation ?? ''),
  hash: String(raw.hash ?? ''),
  verified: Boolean(raw.verified),
  proofUrl: raw.proofUrl ? String(raw.proofUrl) : undefined,
});

const toEventTimestamp = (event: AuditEvent): number => {
  const parsed = new Date(event.timestamp).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

async function getLatestAuditEvent(context: TenantContext): Promise<AuditEvent | null> {
  const auditSnapshot = await getDocs(query(auditCollection, where('tenantId', '==', context.tenantId)));
  if (auditSnapshot.empty) {
    return null;
  }

  const events = auditSnapshot.docs
    .map((docSnapshot: any) => toAuditEvent(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
    .sort((a: AuditEvent, b: AuditEvent) => toEventTimestamp(b) - toEventTimestamp(a));
  return events[0] ?? null;
}

export const stockService = {
  async listInventory(): Promise<InventoryItem[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(inventoryCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, item: toInventoryItem(docSnapshot.id, raw) };
      })
      .filter((row: { raw: Record<string, unknown> }) => hasTenantAccess(row.raw, context))
      .map((row: { item: InventoryItem }) => row.item)
      .sort((a: InventoryItem, b: InventoryItem) => a.name.localeCompare(b.name));
  },

  async createInventoryItem(payload: Omit<InventoryItem, 'id' | 'lastUpdated'>): Promise<InventoryItem> {
    const context = await resolveTenantContext();
    const newItem: InventoryItem = {
      id: `INV-${Date.now()}`,
      name: payload.name,
      category: payload.category,
      quantity: payload.quantity,
      unit: payload.unit,
      minLevel: payload.minLevel,
      location: payload.location,
      unitCost: payload.unitCost,
      assetTag: payload.assetTag,
      lastUpdated: todayBR(),
    };

    await setDoc(
      doc(db, 'inventoryItems', newItem.id),
      withTenantFields(
        {
          ...newItem,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return newItem;
  },

  async listMovements(): Promise<StockMovement[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(movementCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, movement: toStockMovement(docSnapshot.id, raw) };
      })
      .filter((row: { raw: Record<string, unknown> }) => hasTenantAccess(row.raw, context))
      .map((row: { movement: StockMovement }) => row.movement)
      .sort((a: StockMovement, b: StockMovement) => parseDateToTimestamp(b.date) - parseDateToTimestamp(a.date));
  },

  async registerStockUsage(
    data: { itemId: string; quantity: number; reason: string; proofUrl: string; requester: string }
  ): Promise<{ success: boolean; message?: string; newMovement?: StockMovement; auditEvent?: AuditEvent }> {
    try {
      const context = await resolveTenantContext();

      const itemRef = doc(db, 'inventoryItems', data.itemId);
      const lastAuditEvent = await getLatestAuditEvent(context);
      const previousHash = lastAuditEvent ? lastAuditEvent.hash : '0'.repeat(64);

      const currentInventory = await this.listInventory();
      const item = currentInventory.find((inventoryItem) => inventoryItem.id === data.itemId);

      if (!item) {
        return { success: false, message: 'Item de estoque nao encontrado.' };
      }

      const validation = RulesEngine.validate([hasSufficientStock], { quantity: data.quantity }, { item });
      if (!validation.success) {
        return { success: false, message: validation.errors.join(', ') };
      }

      const auditData: Omit<AuditEvent, 'id' | 'timestamp' | 'hash'> = {
        actor: data.requester,
        action: 'STOCK_OUTBOUND_LOSS',
        details: `Baixa de ${data.quantity} ${item.unit} de ${item.name}. Motivo: ${data.reason}`,
        geolocation: '-15.123, -47.654',
        verified: true,
        proofUrl: data.proofUrl,
      };

      const newAuditEvent = await AuditChain.createAuditEvent(auditData, previousHash);

      const newMovement: StockMovement = {
        id: `MOV-${Date.now()}`,
        itemId: data.itemId,
        itemName: item.name,
        type: 'OUTBOUND_LOSS',
        quantity: data.quantity,
        unit: item.unit,
        date: todayBR(),
        status: 'AUDITED',
        requester: data.requester,
        reason: data.reason,
        proofUrl: data.proofUrl,
        auditHash: newAuditEvent.hash,
      };

      await runTransaction(db, async (transaction: any) => {
        const itemSnapshot = await transaction.get(itemRef);
        if (!itemSnapshot.exists()) {
          throw new Error('Item de estoque nao encontrado.');
        }
        if (!hasTenantAccess(itemSnapshot.data() as Record<string, unknown>, context)) {
          throw new Error('Sem permissao para movimentar item de outro tenant.');
        }

        const itemData = toInventoryItem(itemSnapshot.id, itemSnapshot.data() as Record<string, unknown>);
        const businessValidation = RulesEngine.validate([hasSufficientStock], { quantity: data.quantity }, { item: itemData });
        if (!businessValidation.success) {
          throw new Error(businessValidation.errors.join(', '));
        }

        transaction.update(itemRef, {
          quantity: itemData.quantity - data.quantity,
          lastUpdated: todayBR(),
          updatedAt: serverTimestamp(),
        });

        transaction.set(
          doc(db, 'stockMovements', newMovement.id),
          withTenantFields(
            {
              ...newMovement,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            context
          )
        );

        transaction.set(
          doc(db, 'auditEvents', newAuditEvent.id),
          withTenantFields(
            {
              ...newAuditEvent,
              immutable: true,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            context
          )
        );
      });

      return { success: true, newMovement, auditEvent: newAuditEvent };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao registrar a baixa de estoque.';
      return { success: false, message };
    }
  },

  async confirmInboundEntry(
    movementId: string,
    invoiceNumber: string
  ): Promise<{ success: boolean; message?: string; updatedMovement?: StockMovement }> {
    try {
      const context = await resolveTenantContext();

      const movementRef = doc(db, 'stockMovements', movementId);
      const movementSnapshot = await getDoc(movementRef);
      if (!movementSnapshot.exists()) {
        return { success: false, message: 'Movimentacao nao encontrada.' };
      }
      if (!hasTenantAccess(movementSnapshot.data() as Record<string, unknown>, context)) {
        return { success: false, message: 'Sem permissao para atualizar movimentacao de outro tenant.' };
      }
      const movements = await this.listMovements();
      const movement = movements.find((entry) => entry.id === movementId);

      if (!movement) {
        return { success: false, message: 'Movimentacao nao encontrada.' };
      }

      if (movement.type !== 'INBOUND_PURCHASE') {
        return { success: false, message: 'Somente entradas de compra podem ser confirmadas.' };
      }

      const itemRef = doc(db, 'inventoryItems', movement.itemId);
      await runTransaction(db, async (transaction: any) => {
        const itemSnapshot = await transaction.get(itemRef);
        if (!itemSnapshot.exists()) {
          throw new Error('Item de estoque nao encontrado.');
        }
        if (!hasTenantAccess(itemSnapshot.data() as Record<string, unknown>, context)) {
          throw new Error('Sem permissao para atualizar item de outro tenant.');
        }

        const item = toInventoryItem(itemSnapshot.id, itemSnapshot.data() as Record<string, unknown>);

        transaction.update(itemRef, {
          quantity: item.quantity + movement.quantity,
          lastUpdated: todayBR(),
          updatedAt: serverTimestamp(),
        });

        transaction.update(movementRef, {
          status: 'COMPLETED',
          invoiceNumber,
          updatedAt: serverTimestamp(),
        });
      });

      const updatedMovement: StockMovement = {
        ...movement,
        status: 'COMPLETED',
        invoiceNumber,
      };

      return { success: true, updatedMovement };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Falha ao confirmar entrada.';
      return { success: false, message };
    }
  },

  async appendStockMovement(movement: StockMovement): Promise<void> {
    const context = await resolveTenantContext();
    await setDoc(
      doc(db, 'stockMovements', movement.id),
      withTenantFields(
        {
          ...movement,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );
  },

  async registerInboundPurchase(payload: {
    itemId: string;
    itemName: string;
    quantity: number;
    unit: string;
    requester: string;
    invoiceNumber?: string;
    reason?: string;
  }): Promise<StockMovement> {
    const context = await resolveTenantContext();
    const movement: StockMovement = {
      id: `MOV-${Date.now()}`,
      itemId: payload.itemId,
      itemName: payload.itemName,
      type: 'INBOUND_PURCHASE',
      quantity: payload.quantity,
      unit: payload.unit,
      date: todayBR(),
      status: payload.invoiceNumber ? 'COMPLETED' : 'INVOICE_REQUIRED',
      requester: payload.requester,
      invoiceNumber: payload.invoiceNumber,
      reason: payload.reason,
    };

    const movementRef = doc(db, 'stockMovements', movement.id);
    const itemRef = doc(db, 'inventoryItems', payload.itemId);

    await runTransaction(db, async (transaction: any) => {
      transaction.set(
        movementRef,
        withTenantFields(
          {
            ...movement,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          },
          context
        )
      );

      if (payload.invoiceNumber) {
        const itemSnapshot = await transaction.get(itemRef);
        if (!itemSnapshot.exists()) {
          throw new Error('Item de estoque nao encontrado para entrada.');
        }
        if (!hasTenantAccess(itemSnapshot.data() as Record<string, unknown>, context)) {
          throw new Error('Sem permissao para entrada em item de outro tenant.');
        }
        const itemData = toInventoryItem(itemSnapshot.id, itemSnapshot.data() as Record<string, unknown>);
        transaction.update(itemRef, {
          quantity: itemData.quantity + payload.quantity,
          lastUpdated: todayBR(),
          updatedAt: serverTimestamp(),
        });
      }
    });

    return movement;
  },

  async updateMovementStatus(movementId: string, status: StockMovement['status']): Promise<void> {
    const context = await resolveTenantContext();
    const movementRef = doc(db, 'stockMovements', movementId);
    const snapshot = await getDoc(movementRef);
    if (!snapshot.exists()) {
      throw new Error('Movimentacao nao encontrada.');
    }
    if (!hasTenantAccess(snapshot.data() as Record<string, unknown>, context)) {
      throw new Error('Sem permissao para atualizar movimentacao de outro tenant.');
    }
    await updateDoc(movementRef, { status, updatedAt: serverTimestamp() });
  },
};
