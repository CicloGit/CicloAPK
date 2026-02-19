import { DataEntity, EventMatrixModule, Operation, User } from '../types';

export type ConsumerMarketChannel = 'WHOLESALE_DIRECT' | 'RETAIL_MARKETS';

export type OperationType =
  | 'MARKET_LISTING_CREATE'
  | 'MARKET_LISTING_PUBLISH'
  | 'MARKET_ORDER_PLACE'
  | 'MARKET_ORDER_RESERVE_STOCK'
  | 'MARKET_CONTRACT_SIGN'
  | 'MARKET_ESCROW_CREATE'
  | 'MARKET_DISPATCH_CONFIRM'
  | 'MARKET_DELIVERY_CONFIRM'
  | 'MARKET_SPLIT_RELEASE'
  | 'MARKET_DISPUTE_OPEN'
  | 'MARKET_DISPUTE_RESOLVE'
  | 'CONSUMER_MARKET_ORDER_CREATE'
  | 'CONSUMER_MARKET_CONTRACT_SIGN'
  | 'CONSUMER_MARKET_DISPATCH_CONFIRM'
  | 'CONSUMER_MARKET_DELIVERY_CONFIRM'
  | 'CONSUMER_MARKET_SETTLEMENT_RELEASE'
  | 'INPUTS_LISTING_CREATE'
  | 'INPUTS_LISTING_PUBLISH'
  | 'INPUTS_ORDER_PLACE'
  | 'INPUTS_DISPATCH_CONFIRM'
  | 'INPUTS_DELIVERY_CONFIRM'
  | 'INPUTS_SETTLEMENT_RELEASE'
  | 'OUTPUTS_LISTING_CREATE'
  | 'OUTPUTS_LISTING_PUBLISH'
  | 'OUTPUTS_ORDER_PLACE'
  | 'OUTPUTS_CONTRACT_SIGN'
  | 'OUTPUTS_DISPATCH_CONFIRM'
  | 'OUTPUTS_DELIVERY_CONFIRM'
  | 'OUTPUTS_SETTLEMENT_RELEASE'
  | 'AUCTION_LISTING_CREATE'
  | 'AUCTION_LISTING_PUBLISH'
  | 'AUCTION_BID_PLACE'
  | 'AUCTION_CLOSE'
  | 'AUCTION_CONTRACT_SIGN'
  | 'AUCTION_DELIVERY_CONFIRM'
  | 'AUCTION_SETTLEMENT_RELEASE';

export type RoleKey = User['role'] | 'ADMIN' | 'TRAFFIC_MANAGER';

export interface OperationDefinition {
  code: OperationType;
  domain: 'MARKETPLACE' | 'CONSUMER_MARKET';
  critical: boolean;
  entity: 'LISTING' | 'ORDER' | 'CONTRACT' | 'SETTLEMENT' | 'DISPUTE';
  allowedRoles: RoleKey[];
  stateMachine: string;
  evidencePolicy: string;
}

export interface EvidencePolicy {
  code: string;
  description: string;
  requireTypeA: boolean;
  requireTypeB: boolean;
  allowTelemetryEquivalent: boolean;
}

export interface StateMachineDefinition {
  entity: string;
  initialState: string;
  transitions: Record<string, string[]>;
}

export interface SettlementTemplate {
  code: string;
  description: string;
  split: Array<{ party: string; share: number }>;
  milestones: Array<{ id: 'M1' | 'M2' | 'M3' | 'M4' | 'M5'; title: string }>;
}

export const CONSUMER_MARKET_CHANNELS: Array<{ code: ConsumerMarketChannel; label: string }> = [
  { code: 'WHOLESALE_DIRECT', label: 'Atacadista Direto' },
  { code: 'RETAIL_MARKETS', label: 'Mercados' },
];

export const EVIDENCE_POLICIES: EvidencePolicy[] = [
  {
    code: 'DISPATCH_A_OR_TELEMETRY',
    description: 'Foto+GPS (Tipo A) ou telemetria equivalente.',
    requireTypeA: true,
    requireTypeB: false,
    allowTelemetryEquivalent: true,
  },
  {
    code: 'DELIVERY_A_AND_OPTIONAL_B',
    description: 'Tipo A obrigatorio; Tipo B exigido quando houver NF/romaneio/aceite.',
    requireTypeA: true,
    requireTypeB: false,
    allowTelemetryEquivalent: false,
  },
  {
    code: 'CONTRACT_B_REQUIRED',
    description: 'Contrato/aceite digital (Tipo B) obrigatorio.',
    requireTypeA: false,
    requireTypeB: true,
    allowTelemetryEquivalent: false,
  },
  {
    code: 'SETTLEMENT_AUDIT_GATE',
    description: 'Liberacao somente com evidencias validadas + trilha de auditoria integra.',
    requireTypeA: false,
    requireTypeB: false,
    allowTelemetryEquivalent: false,
  },
];

export const STATE_MACHINES: StateMachineDefinition[] = [
  {
    entity: 'Listing',
    initialState: 'DRAFT',
    transitions: {
      DRAFT: ['PUBLISHED'],
      PUBLISHED: ['PAUSED', 'CLOSED'],
      PAUSED: ['PUBLISHED', 'CLOSED'],
      CLOSED: [],
    },
  },
  {
    entity: 'Order',
    initialState: 'CREATED',
    transitions: {
      CREATED: ['RESERVED'],
      RESERVED: ['CONTRACT_PENDING'],
      CONTRACT_PENDING: ['ESCROW_CREATED'],
      ESCROW_CREATED: ['DISPATCHED'],
      DISPATCHED: ['DELIVERED'],
      DELIVERED: ['SETTLED'],
      SETTLED: ['CLOSED'],
      CLOSED: [],
    },
  },
  {
    entity: 'Contract',
    initialState: 'DRAFT',
    transitions: {
      DRAFT: ['SIGNED'],
      SIGNED: ['ACTIVE', 'TERMINATED'],
      ACTIVE: ['COMPLETED', 'TERMINATED'],
      COMPLETED: [],
      TERMINATED: [],
    },
  },
  {
    entity: 'Settlement',
    initialState: 'CREATED',
    transitions: {
      CREATED: ['ESCROWED', 'FAILED'],
      ESCROWED: ['PARTIAL_RELEASED', 'RELEASED', 'FAILED'],
      PARTIAL_RELEASED: ['RELEASED', 'FAILED'],
      RELEASED: [],
      FAILED: [],
    },
  },
  {
    entity: 'Dispute',
    initialState: 'OPEN',
    transitions: {
      OPEN: ['IN_REVIEW', 'REJECTED'],
      IN_REVIEW: ['RESOLVED', 'REJECTED'],
      RESOLVED: [],
      REJECTED: [],
    },
  },
];

export const SETTLEMENT_TEMPLATES: SettlementTemplate[] = [
  {
    code: 'MARKETPLACE_STANDARD',
    description: 'Split padrao Marketplace: produtor + plataforma + logistica.',
    split: [
      { party: 'PRODUCER', share: 0.87 },
      { party: 'PLATFORM', share: 0.08 },
      { party: 'LOGISTICS', share: 0.05 },
    ],
    milestones: [
      { id: 'M1', title: 'Auth/RBAC/Tenant validos' },
      { id: 'M2', title: 'RulesEngine e StateMachine validados' },
      { id: 'M3', title: 'Evidencias Tipo A/B validadas' },
      { id: 'M4', title: 'AuditChain + escrow registrados' },
      { id: 'M5', title: 'Entrega confirmada e split liberado' },
    ],
  },
  {
    code: 'CONSUMER_MARKET_STANDARD',
    description: 'Split canal consumidor (Atacadista Direto / Mercados).',
    split: [
      { party: 'PRODUCER', share: 0.86 },
      { party: 'PLATFORM', share: 0.09 },
      { party: 'LOGISTICS', share: 0.05 },
    ],
    milestones: [
      { id: 'M1', title: 'Auth/RBAC/Tenant validos' },
      { id: 'M2', title: 'RulesEngine e StateMachine validados' },
      { id: 'M3', title: 'Evidencias Tipo A/B validadas' },
      { id: 'M4', title: 'AuditChain + escrow registrados' },
      { id: 'M5', title: 'Entrega confirmada e split liberado' },
    ],
  },
];

export const OPERATIONS_CATALOG_V1: OperationDefinition[] = [
  {
    code: 'MARKET_LISTING_CREATE',
    domain: 'MARKETPLACE',
    critical: false,
    entity: 'LISTING',
    allowedRoles: ['Produtor', 'Fornecedor', 'Gestor', 'Integradora', 'ADMIN'],
    stateMachine: 'Listing',
    evidencePolicy: 'NONE',
  },
  {
    code: 'MARKET_LISTING_PUBLISH',
    domain: 'MARKETPLACE',
    critical: true,
    entity: 'LISTING',
    allowedRoles: ['Produtor', 'Fornecedor', 'Gestor', 'ADMIN'],
    stateMachine: 'Listing',
    evidencePolicy: 'SETTLEMENT_AUDIT_GATE',
  },
  {
    code: 'MARKET_ORDER_PLACE',
    domain: 'MARKETPLACE',
    critical: true,
    entity: 'ORDER',
    allowedRoles: ['Produtor', 'Gestor', 'Integradora', 'ADMIN'],
    stateMachine: 'Order',
    evidencePolicy: 'NONE',
  },
  {
    code: 'MARKET_ORDER_RESERVE_STOCK',
    domain: 'MARKETPLACE',
    critical: true,
    entity: 'ORDER',
    allowedRoles: ['Fornecedor', 'Gestor', 'ADMIN'],
    stateMachine: 'Order',
    evidencePolicy: 'NONE',
  },
  {
    code: 'MARKET_CONTRACT_SIGN',
    domain: 'MARKETPLACE',
    critical: true,
    entity: 'CONTRACT',
    allowedRoles: ['Produtor', 'Fornecedor', 'Gestor', 'ADMIN'],
    stateMachine: 'Contract',
    evidencePolicy: 'CONTRACT_B_REQUIRED',
  },
  {
    code: 'MARKET_ESCROW_CREATE',
    domain: 'MARKETPLACE',
    critical: true,
    entity: 'SETTLEMENT',
    allowedRoles: ['Gestor', 'ADMIN'],
    stateMachine: 'Settlement',
    evidencePolicy: 'SETTLEMENT_AUDIT_GATE',
  },
  {
    code: 'MARKET_DISPATCH_CONFIRM',
    domain: 'MARKETPLACE',
    critical: true,
    entity: 'ORDER',
    allowedRoles: ['Fornecedor', 'Gestor', 'ADMIN'],
    stateMachine: 'Order',
    evidencePolicy: 'DISPATCH_A_OR_TELEMETRY',
  },
  {
    code: 'MARKET_DELIVERY_CONFIRM',
    domain: 'MARKETPLACE',
    critical: true,
    entity: 'ORDER',
    allowedRoles: ['Produtor', 'Fornecedor', 'Gestor', 'ADMIN'],
    stateMachine: 'Order',
    evidencePolicy: 'DELIVERY_A_AND_OPTIONAL_B',
  },
  {
    code: 'MARKET_SPLIT_RELEASE',
    domain: 'MARKETPLACE',
    critical: true,
    entity: 'SETTLEMENT',
    allowedRoles: ['Gestor', 'ADMIN'],
    stateMachine: 'Settlement',
    evidencePolicy: 'SETTLEMENT_AUDIT_GATE',
  },
  {
    code: 'MARKET_DISPUTE_OPEN',
    domain: 'MARKETPLACE',
    critical: true,
    entity: 'DISPUTE',
    allowedRoles: ['Produtor', 'Fornecedor', 'Gestor', 'TRAFFIC_MANAGER', 'ADMIN'],
    stateMachine: 'Dispute',
    evidencePolicy: 'NONE',
  },
  {
    code: 'MARKET_DISPUTE_RESOLVE',
    domain: 'MARKETPLACE',
    critical: true,
    entity: 'DISPUTE',
    allowedRoles: ['Gestor', 'TRAFFIC_MANAGER', 'ADMIN'],
    stateMachine: 'Dispute',
    evidencePolicy: 'SETTLEMENT_AUDIT_GATE',
  },
  {
    code: 'CONSUMER_MARKET_ORDER_CREATE',
    domain: 'CONSUMER_MARKET',
    critical: true,
    entity: 'ORDER',
    allowedRoles: ['Produtor', 'Gestor', 'Integradora', 'ADMIN'],
    stateMachine: 'Order',
    evidencePolicy: 'NONE',
  },
  {
    code: 'CONSUMER_MARKET_CONTRACT_SIGN',
    domain: 'CONSUMER_MARKET',
    critical: true,
    entity: 'CONTRACT',
    allowedRoles: ['Produtor', 'Gestor', 'ADMIN'],
    stateMachine: 'Contract',
    evidencePolicy: 'CONTRACT_B_REQUIRED',
  },
  {
    code: 'CONSUMER_MARKET_DISPATCH_CONFIRM',
    domain: 'CONSUMER_MARKET',
    critical: true,
    entity: 'ORDER',
    allowedRoles: ['Fornecedor', 'Gestor', 'ADMIN'],
    stateMachine: 'Order',
    evidencePolicy: 'DISPATCH_A_OR_TELEMETRY',
  },
  {
    code: 'CONSUMER_MARKET_DELIVERY_CONFIRM',
    domain: 'CONSUMER_MARKET',
    critical: true,
    entity: 'ORDER',
    allowedRoles: ['Produtor', 'Gestor', 'ADMIN'],
    stateMachine: 'Order',
    evidencePolicy: 'DELIVERY_A_AND_OPTIONAL_B',
  },
  {
    code: 'CONSUMER_MARKET_SETTLEMENT_RELEASE',
    domain: 'CONSUMER_MARKET',
    critical: true,
    entity: 'SETTLEMENT',
    allowedRoles: ['Gestor', 'ADMIN'],
    stateMachine: 'Settlement',
    evidencePolicy: 'SETTLEMENT_AUDIT_GATE',
  },
  {
    code: 'INPUTS_LISTING_CREATE',
    domain: 'MARKETPLACE',
    critical: false,
    entity: 'LISTING',
    allowedRoles: ['Fornecedor', 'Gestor', 'ADMIN'],
    stateMachine: 'Listing',
    evidencePolicy: 'NONE',
  },
  {
    code: 'INPUTS_LISTING_PUBLISH',
    domain: 'MARKETPLACE',
    critical: true,
    entity: 'LISTING',
    allowedRoles: ['Fornecedor', 'Gestor', 'ADMIN'],
    stateMachine: 'Listing',
    evidencePolicy: 'SETTLEMENT_AUDIT_GATE',
  },
  {
    code: 'INPUTS_ORDER_PLACE',
    domain: 'MARKETPLACE',
    critical: true,
    entity: 'ORDER',
    allowedRoles: ['Produtor', 'Gestor', 'ADMIN'],
    stateMachine: 'Order',
    evidencePolicy: 'NONE',
  },
  {
    code: 'INPUTS_DISPATCH_CONFIRM',
    domain: 'MARKETPLACE',
    critical: true,
    entity: 'ORDER',
    allowedRoles: ['Fornecedor', 'Gestor', 'ADMIN'],
    stateMachine: 'Order',
    evidencePolicy: 'DISPATCH_A_OR_TELEMETRY',
  },
  {
    code: 'INPUTS_DELIVERY_CONFIRM',
    domain: 'MARKETPLACE',
    critical: true,
    entity: 'ORDER',
    allowedRoles: ['Produtor', 'Fornecedor', 'Gestor', 'ADMIN'],
    stateMachine: 'Order',
    evidencePolicy: 'DELIVERY_A_AND_OPTIONAL_B',
  },
  {
    code: 'INPUTS_SETTLEMENT_RELEASE',
    domain: 'MARKETPLACE',
    critical: true,
    entity: 'SETTLEMENT',
    allowedRoles: ['Gestor', 'ADMIN'],
    stateMachine: 'Settlement',
    evidencePolicy: 'SETTLEMENT_AUDIT_GATE',
  },
  {
    code: 'OUTPUTS_LISTING_CREATE',
    domain: 'CONSUMER_MARKET',
    critical: false,
    entity: 'LISTING',
    allowedRoles: ['Produtor', 'Gestor', 'ADMIN'],
    stateMachine: 'Listing',
    evidencePolicy: 'NONE',
  },
  {
    code: 'OUTPUTS_LISTING_PUBLISH',
    domain: 'CONSUMER_MARKET',
    critical: true,
    entity: 'LISTING',
    allowedRoles: ['Produtor', 'Gestor', 'ADMIN'],
    stateMachine: 'Listing',
    evidencePolicy: 'SETTLEMENT_AUDIT_GATE',
  },
  {
    code: 'OUTPUTS_ORDER_PLACE',
    domain: 'CONSUMER_MARKET',
    critical: true,
    entity: 'ORDER',
    allowedRoles: ['Integradora', 'Gestor', 'ADMIN'],
    stateMachine: 'Order',
    evidencePolicy: 'NONE',
  },
  {
    code: 'OUTPUTS_CONTRACT_SIGN',
    domain: 'CONSUMER_MARKET',
    critical: true,
    entity: 'CONTRACT',
    allowedRoles: ['Produtor', 'Integradora', 'Gestor', 'ADMIN'],
    stateMachine: 'Contract',
    evidencePolicy: 'CONTRACT_B_REQUIRED',
  },
  {
    code: 'OUTPUTS_DISPATCH_CONFIRM',
    domain: 'CONSUMER_MARKET',
    critical: true,
    entity: 'ORDER',
    allowedRoles: ['Produtor', 'Gestor', 'ADMIN'],
    stateMachine: 'Order',
    evidencePolicy: 'DISPATCH_A_OR_TELEMETRY',
  },
  {
    code: 'OUTPUTS_DELIVERY_CONFIRM',
    domain: 'CONSUMER_MARKET',
    critical: true,
    entity: 'ORDER',
    allowedRoles: ['Integradora', 'Gestor', 'ADMIN'],
    stateMachine: 'Order',
    evidencePolicy: 'DELIVERY_A_AND_OPTIONAL_B',
  },
  {
    code: 'OUTPUTS_SETTLEMENT_RELEASE',
    domain: 'CONSUMER_MARKET',
    critical: true,
    entity: 'SETTLEMENT',
    allowedRoles: ['Gestor', 'ADMIN'],
    stateMachine: 'Settlement',
    evidencePolicy: 'SETTLEMENT_AUDIT_GATE',
  },
  {
    code: 'AUCTION_LISTING_CREATE',
    domain: 'MARKETPLACE',
    critical: false,
    entity: 'LISTING',
    allowedRoles: ['Produtor', 'Gestor', 'ADMIN'],
    stateMachine: 'Listing',
    evidencePolicy: 'NONE',
  },
  {
    code: 'AUCTION_LISTING_PUBLISH',
    domain: 'MARKETPLACE',
    critical: true,
    entity: 'LISTING',
    allowedRoles: ['Produtor', 'Gestor', 'ADMIN'],
    stateMachine: 'Listing',
    evidencePolicy: 'SETTLEMENT_AUDIT_GATE',
  },
  {
    code: 'AUCTION_BID_PLACE',
    domain: 'MARKETPLACE',
    critical: true,
    entity: 'ORDER',
    allowedRoles: ['Produtor', 'Gestor', 'ADMIN'],
    stateMachine: 'Order',
    evidencePolicy: 'NONE',
  },
  {
    code: 'AUCTION_CLOSE',
    domain: 'MARKETPLACE',
    critical: true,
    entity: 'ORDER',
    allowedRoles: ['Produtor', 'Gestor', 'ADMIN'],
    stateMachine: 'Order',
    evidencePolicy: 'SETTLEMENT_AUDIT_GATE',
  },
  {
    code: 'AUCTION_CONTRACT_SIGN',
    domain: 'MARKETPLACE',
    critical: true,
    entity: 'CONTRACT',
    allowedRoles: ['Produtor', 'Gestor', 'ADMIN'],
    stateMachine: 'Contract',
    evidencePolicy: 'CONTRACT_B_REQUIRED',
  },
  {
    code: 'AUCTION_DELIVERY_CONFIRM',
    domain: 'MARKETPLACE',
    critical: true,
    entity: 'ORDER',
    allowedRoles: ['Produtor', 'Gestor', 'ADMIN'],
    stateMachine: 'Order',
    evidencePolicy: 'DELIVERY_A_AND_OPTIONAL_B',
  },
  {
    code: 'AUCTION_SETTLEMENT_RELEASE',
    domain: 'MARKETPLACE',
    critical: true,
    entity: 'SETTLEMENT',
    allowedRoles: ['Gestor', 'ADMIN'],
    stateMachine: 'Settlement',
    evidencePolicy: 'SETTLEMENT_AUDIT_GATE',
  },
];

export const OPERATIONS_CATALOG_VERSION = '2026-02-16.market-v1';

export const toOperationsTableRows = (): Operation[] =>
  OPERATIONS_CATALOG_V1.map((entry) => ({
    operation: entry.code,
    profile: entry.allowedRoles.join(', '),
    entity: entry.entity,
    rule: entry.critical
      ? 'Operacao critica: executar somente via Cloud Functions + RBAC/Tenant.'
      : 'Operacao nao critica: leitura/cadastro controlados por rules.',
    evidence: entry.evidencePolicy === 'NONE' ? 'Nao obrigatoria' : entry.evidencePolicy,
    effect: `${entry.stateMachine} / ${entry.domain}`,
  }));

export const toEventsMatrixModules = (): EventMatrixModule[] => [
  {
    title: 'Marketplace + Venda Mercado Consumidor',
    description:
      'Matriz de eventos oficial para operacoes criticas com enforcement de Auth/RBAC/Tenant, regras, evidencias, auditoria e settlement.',
    events: OPERATIONS_CATALOG_V1.map((entry) => ({
      event: entry.code,
      module: entry.domain,
      rules: entry.critical
        ? 'Auth -> RBAC -> Tenant -> RulesEngine -> StateMachine'
        : 'Rules Firestore + validacao de schema',
      locks: entry.critical ? 'LOCK_ON_CONFLICT / ESCROW_GUARD / AUDIT_GUARD' : 'N/A',
      evidence:
        entry.evidencePolicy === 'DISPATCH_A_OR_TELEMETRY'
          ? 'Tipo A (foto+gps) ou telemetria'
          : entry.evidencePolicy === 'DELIVERY_A_AND_OPTIONAL_B'
            ? 'Tipo A + Tipo B quando aplicavel'
            : entry.evidencePolicy === 'CONTRACT_B_REQUIRED'
              ? 'Tipo B obrigatorio'
              : entry.evidencePolicy === 'SETTLEMENT_AUDIT_GATE'
                ? 'AuditChain + evidencias validadas'
                : 'Nao obrigatoria',
      stateMachine: entry.stateMachine,
      collections: 'tenants/{tenantId}/market* + settlements + evidences + auditLogs',
    })),
  },
];

export const toDataDictionaryEntities = (): DataEntity[] => [
  {
    name: 'tenants/{tenantId}/marketListings',
    description: 'Catalogo de ofertas do marketplace e do canal consumidor.',
    fields: ['id', 'status', 'productName', 'quantityAvailable', 'price', 'channel'],
  },
  {
    name: 'tenants/{tenantId}/marketOrders',
    description: 'Pedidos com ciclo completo de estados e referencia de settlement.',
    fields: ['id', 'status', 'listingId', 'quantity', 'buyerUid', 'channel', 'settlementId'],
  },
  {
    name: 'tenants/{tenantId}/marketContracts',
    description: 'Contratos Safe Deal com aceite e trilha de assinatura.',
    fields: ['id', 'status', 'orderId', 'terms', 'signatures', 'evidenceRefs'],
  },
  {
    name: 'tenants/{tenantId}/settlements',
    description: 'Escrow/split por marcos UPCL com provider stub auditavel.',
    fields: ['id', 'status', 'orderId', 'templateCode', 'escrowAmount', 'releases', 'splits'],
  },
  {
    name: 'tenants/{tenantId}/evidences',
    description: 'Metadados de evidencias Tipo A/B com hash, actor e operacao.',
    fields: ['id', 'operationType', 'type', 'hash', 'storagePath', 'gps', 'telemetry', 'documents'],
  },
  {
    name: 'tenants/{tenantId}/auditLogs',
    description: 'Append-only com hash encadeado por tenant/stream.',
    fields: ['id', 'eventType', 'prevHash', 'hash', 'payload', 'createdAt', 'actorUid'],
  },
  {
    name: 'tenants/{tenantId}/disputes',
    description: 'Disputas do marketplace com decisao auditada.',
    fields: ['id', 'status', 'orderId', 'reason', 'openedBy', 'resolution'],
  },
  {
    name: 'tenants/{tenantId}/moduleEvents',
    description: 'Eventos tecnicos de modulo para observabilidade operacional.',
    fields: ['id', 'operationType', 'status', 'correlationId', 'createdAt'],
  },
  {
    name: 'tenants/{tenantId}/supportTickets',
    description: 'Tickets de suporte para pedido/contrato/entrega/liquidacao.',
    fields: ['id', 'orderId', 'status', 'subject', 'createdBy', 'priority'],
  },
  {
    name: 'tenants/{tenantId}/messages',
    description: 'Mensagens imutaveis vinculadas a ticket/disputa e auditadas.',
    fields: ['id', 'ticketId', 'body', 'authorUid', 'createdAt', 'immutable'],
  },
];
