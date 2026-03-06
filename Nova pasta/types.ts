export type ViewType = 
  'dashboard' | 
  'activityContext' |
  'moduleGovernance' |
  'architecture' | 
  'dataDictionary' | 
  'operations' | 
  'flows' | 
  'eventsMatrix' | 
  'systemConfig' | 
  'producerPortal' | 
  'technicianPortal' | 
  'investorPortal' | 
  'supplierPortal' | 
  'integratorPortal' | 
  'operatorPortal' | 
  'finance' | 
  'stock' | 
  'commercial' | 
  'logistics' | 
  'logisticsPortal' |
  'auctionPortal' |
  'auctionBidControl' |
  'legal'|
  'propertyRegistration' |
  'operationalAction' |
  'contracts' |
  'sales' |
  'financials' |
  'accountControl' |
  'management' |
  'futureMarket' |
  'workforce' |
  'workforceEmployees' |
  'workforceTime' |
  'workforcePayroll' |
  'workforcePpe' |
  'workforceOperatorAccess' |
  'operatorLinkRequests' |
  'marketplace' |
  'externalMarketplace' |
  'publicMarket' |
  'aiAnalysis' |
  'liveHandling' |
  'integrations' |
  'fieldOperations' |
  'reports' |
  'carbonMarket' | 
  'customInputRequest' | // New Custom Input Request View
  'milkControl' |
  'screenFlows' |
  'mobileApp';

export type ProductionSector = 
    'Agricultura' | 
    'Hortifruti' | 
    'Fruticultura' |
    'Pecuária (Bovinos Corte)' | 
    'Pecuária (Bovinos Leite)' |
    'Silvicultura' | 
    'Apicultura' | 
    'Piscicultura' | 
    'Avicultura' | 
    'Suinocultura' | 
    'Ovinocultura' |
    'Equinocultura' |
    'Caprinocultura' |
    'Produção de Sementes'; // New Sector

export type OperationalActionType = 
    'registerPlanting' | 
    'soilAnalysis' | 
    'planHarvest' | 
    'sellCrop' | 
    'registerAnimal' | 
    'applyHealthProtocol' | 
    'registerWeight' | 
    'sellBatch' |
    'waterAnalysis' |
    'hiveInspection' |
    'timberMeasure' |
    'dailyCollection' |
    'registerIrrigation' | // New
    'registerMilkVolume' | // New
    'pruning'; // New

export interface ProjectStage {
    id: string;
    label: string;
    status: 'ACTIVE' | 'PLANNED' | 'COMPLETED';
}

export interface SectorSpecificData {
    kpi1Label: string;
    kpi1Value: string;
    kpi2Label: string;
    kpi2Value: string;
    kpi3Label: string;
    kpi3Value: string;
    alerts: { text: string; severity: 'high' | 'medium' | 'low' }[];
    stockLabel: string;
    stockValue: string;
}

export interface ArchitectureNode {
  id: string;
  label: string;
  description: string;
  children: ArchitectureNode[];
}

export interface DataEntity {
  name: string;
  description: string;
  fields: string[];
}

export interface Operation {
  operation: string;
  profile: string;
  entity: string;
  rule: string;
  evidence: string;
  effect: string;
}

export interface LiquidationFlow {
  title: string;
  description: string;
  steps: { name: string, completed: boolean }[];
}

export interface ProductionProject {
  id: string;
  name: string;
  type: ProductionSector;
  variety?: string; // New field for specific activity (e.g., Tilapia, Cria)
  status: 'EM ANDAMENTO' | 'PLANEJAMENTO' | 'CONCLUÍDO';
  volume: string;
  prazo: string;
  precoAlvo: string;
  aReceber: number;
  aPagar: number;
  limiteVigente: number;
  limiteUtilizado: number;
}

export interface FinancialDetails {
    projectId: string;
    totalCost: number;
    realizedRevenue: number;
    futureRevenue: number;
    batches: any[];
}

export interface User {
  uid?: string;
  email?: string;
  tenantId?: string;
  linkedProducerId?: string;
  linkedProducerName?: string;
  linkedPropertyId?: string;
  linkedPropertyName?: string;
  operatorAuthorizationId?: string;
  operatorAuthorizedByUserId?: string;
  producerScopes?: ProducerScopes;
  claimsRole?: ClaimsRole | null;
  profileType?: AccessProfileType;
  documentType?: DocumentType;
  documentNumber?: string;
  stateRegistration?: string;
  specialty?: string;
  councilType?: CouncilType;
  councilNumber?: string;
  simulationOnly?: boolean;
  name: string;
  role:
    | 'Produtor'
    | 'Produtor de Sementes'
    | 'Gestor'
    | 'Técnico'
    | 'Investidor'
    | 'Fornecedor'
    | 'Integradora'
    | 'Operador'
    | 'Leiloeiro'
    | 'Gestor de Trafego'
    | 'Administrador';
}

export type AccessProfileType =
  | 'PRODUTOR'
  | 'EMPRESA_FORNECEDORA'
  | 'EMPRESA_INTEGRADORA'
  | 'OPERADOR'
  | 'LEILOEIRO'
  | 'TECNICO'
  | 'GESTOR';

export type DocumentType = 'CPF' | 'CNPJ' | 'LOGIN';
export type CouncilType = 'CRMV' | 'CFTA' | 'CREA';

export interface ProducerScopes {
  seedProducer?: boolean;
}

export type ClaimsRole =
  | 'PRODUCER'
  | 'SUPPLIER'
  | 'INTEGRATOR'
  | 'AUCTIONEER'
  | 'TECHNICIAN'
  | 'INVESTOR'
  | 'MANAGER'
  | 'TRAFFIC_MANAGER'
  | 'ADMIN'
  | 'OPERATOR';

// UPCL - Universal Payment & Clearing Logic Types
export type TransactionType = 'PIX_IN' | 'PIX_OUT' | 'COMMISSION' | 'SALE' | 'PURCHASE' | 'SPLIT';
export type TransactionStatus = 'COMPLETED' | 'PENDING' | 'FAILED' | 'SCHEDULED';

export interface BankAccount {
    id: string;
    userId: string; // Links to User
    provider: 'ASAAS' | 'OTHER';
    accountNumber: string;
    agency: string;
    balance: number; // Available
    blockedBalance: number; // Escrow / Future
    holderName: string;
    holderDoc: string; // CPF/CNPJ
}

export interface Transaction {
    id: string;
    accountId: string;
    type: TransactionType;
    description: string;
    amount: number;
    date: string;
    status: TransactionStatus;
    counterparty?: string; // Who sent/received
    documentUrl?: string; // Receipt
}

export interface EventMatrixModule {
    title: string;
    description?: string;
    events: EventConfig[];
}

export interface EventConfig {
    event: string;
    module: string;
    rules: string;
    locks: string;
    evidence: string;
    stateMachine: string;
    collections: string;
}

export interface StateMachineConfig {
    [key: string]: string[];
}

export interface PermissionsConfig {
    roles: {
        [role: string]: string[];
    }
}

export interface Animal {
    id: string;
    category: string;
    status: AnimalStatus | null;
    weight?: number;
    lastWeighingDate?: string;
    motherId?: string;
}

export interface Pasture {
    id: string;
    name: string;
    area: number;
    grassHeight: number;
    cultivar: string;
    estimatedForageProduction: number;
    grazingPeriod: { start: string, end: string };
    entryDate: string;
    exitDate: string;
    stockingRate: string;
    managementRecommendations: string[];
    managementHistory: string[];
    animals: Animal[];
    polygon?: { x: number, y: number }[];
    center?: { x: number, y: number };
    geoPolygon?: { lat: number; lon: number }[];
    geoCenter?: { lat: number; lon: number };
}

export interface Delivery {
    date: string;
    quantity: string;
}

export type ContractStatus = 'VIGENTE' | 'RENOVAR' | 'ENCERRADO';

export interface Contract {
    id: string;
    description: string;
    value: number;
    deadline: string;
    status: ContractStatus;
    deliveryHistory: Delivery[];
    counterparty?: string;
    signedAt?: string;
    originalFileUrl?: string;
    originalFileName?: string;
    originalFileHash?: string;
    notes?: string;
}

export interface AnimalProductionDetails {
    projectId: string;
    pastures: Pasture[];
    contracts: Contract[];
}

export interface PastureManagementHistoryItem {
    date: string;
    action: string;
    details: string;
}

export interface MapInfrastructure {
    id: string;
    type: 'Water' | 'Silo' | 'Corral' | 'House' | 'Trough';
    label: string;
    position: { x: number, y: number };
    radiusOfInfluence?: number;
}

export interface Machinery {
    id: string;
    type: 'Tractor' | 'Harvester' | 'Drone' | 'Truck';
    label: string;
    position: { x: number, y: number };
    status: 'Active' | 'Idle' | 'Maintenance';
    activity?: string;
    batteryLevel?: number;
}

export interface Property {
    id: string;
    name: string;
    carNumber: string;
    totalArea: number;
    currentStockingCapacity: number;
    animalCount: number;
    pastureManagementHistory: PastureManagementHistoryItem[];
    pastureInvestmentPerHa?: number;
    cattleInvestmentPerHa?: number;
    infrastructure?: MapInfrastructure[];
    machinery?: Machinery[];
    perimeter?: { x: number, y: number }[];
    satelliteImageUrl?: string;
}

export interface CultivarFactor {
    name: string;
    factor: number;
}

export interface ProductFactor {
    name: string;
    factor: number;
    performance: string;
}

export type SalesOfferStatus = 'ATIVA' | 'VENDIDO' | 'CANCELADA';
export type ConsumerMarketChannel = 'WHOLESALE_DIRECT' | 'RETAIL_MARKETS';
export type ListingCategory = 'OUTPUTS_PRODUCER' | 'INPUTS_INDUSTRY' | 'AUCTION_P2P';
export type ListingMode = 'FIXED_PRICE' | 'AUCTION';
export type ListingPriceModel = 'FIXED' | 'TIERED' | 'QUOTE_REQUIRED' | 'AUCTION';
export type ProducerSaleSourceType = 'ANIMAL_UNIT_LOT' | 'ANIMAL_WEIGHT' | 'CROP' | 'ASSET';
export type ProducerSaleSettlementMode = 'DIRECT_SALE' | 'AUCTION_REMESSA';
export type ProducerFiscalStatus =
    | 'NF_EMITIDA'
    | 'AGUARDANDO_FINALIZACAO_LEILAO'
    | 'AGUARDANDO_EMISSAO';
export type ProducerEscrowStatus = 'ATIVO' | 'LIBERADO';
export type ProducerSaleEvidenceType =
    | 'QR_CODE'
    | 'SCALE_QR'
    | 'PHOTO'
    | 'VIDEO'
    | 'SALE_AUTHORIZATION'
    | 'VEHICLE';

export interface SalesOffer {
    id: string;
    product: string;
    quantity: string;
    price: number;
    channel?: ConsumerMarketChannel;
    listingCategory?: ListingCategory;
    listingMode?: ListingMode;
    offerType?: 'PRODUTO' | 'ANIMAL' | 'UTENSILIO';
    description?: string;
    location?: string;
    auctionStartAt?: string;
    auctionEndAt?: string;
    auctionDurationDays?: number;
    minimumBid?: number;
    status: SalesOfferStatus;
    date: string;
}

export interface ProducerSaleEvidence {
    id: string;
    type: ProducerSaleEvidenceType;
    createdAt: string;
    reference?: string;
    url?: string;
    hash?: string;
    notes?: string;
}

export type ProducerBuyerDocumentType = 'CPF' | 'CNPJ';

export interface ProducerBuyerProfile {
    name: string;
    documentType: ProducerBuyerDocumentType;
    documentNumber: string;
    stateRegistration?: string;
    email: string;
    phone: string;
    addressStreet: string;
    addressNumber: string;
    addressDistrict: string;
    addressCity: string;
    addressState: string;
    addressZipCode: string;
}

export interface ProducerPdvSale {
    id: string;
    createdAt: string;
    sourceType: ProducerSaleSourceType;
    settlementMode: ProducerSaleSettlementMode;
    fiscalStatus: ProducerFiscalStatus;
    escrowStatus: ProducerEscrowStatus;
    escrowAmount: number;
    escrowId?: string;
    escrowCreatedAt?: string;
    escrowReleasedAt?: string;
    buyer: string;
    buyerProfile?: ProducerBuyerProfile;
    description: string;
    unitPrice: number;
    totalValue: number;
    actor: string;
    lotId?: string;
    animalIds?: string[];
    headcount?: number;
    totalWeightKg?: number;
    fieldPlot?: string;
    boxes?: number;
    boxSize?: string;
    qualityGrade?: string;
    assetItemId?: string;
    assetName?: string;
    saleAuthorizationCode?: string;
    vehiclePlate?: string;
    scaleQrCode?: string;
    deferFiscalEmission?: boolean;
    auctionFinishedAt?: string;
    fiscalDocumentNumber?: string;
    fiscalIssuedAt?: string;
    evidences: ProducerSaleEvidence[];
    auditHash?: string;
}

export type ReceivableStatus = 'PENDENTE' | 'EM_ESCROW' | 'LIQUIDADO' | 'ATRASADO';

export interface Receivable {
    id: string;
    origin: string;
    value: number;
    dueDate: string;
    status: ReceivableStatus;
    fiscalEntityId: string;
    liquidationFlow?: LiquidationFlow;
}

export type ExpenseStatus = 'A_PAGAR' | 'PAGO' | 'ATRASADO';

export interface Expense {
    id: string;
    description: string;
    supplier: string;
    value: number;
    dueDate: string;
    status: ExpenseStatus;
    category: string;
    fiscalEntityId: string;
}

export interface InventoryItem {
    id: string;
    name: string;
    category: 'Insumo' | 'Medicamento' | 'Ferramenta' | 'Consumivel' | 'Bem Patrimonial' | 'Outro';
    quantity: number;
    unit: string;
    minLevel: number;
    location: string;
    unitCost?: number;
    assetTag?: string;
    lastUpdated: string;
}

export interface PartnerStore {
    id: string;
    name: string;
    location: string; // City, State
}

export interface MarketplaceListing {
    id: string;
    tenantId?: string;
    createdByUserId?: string;
    listingCategory: ListingCategory;
    listingMode: ListingMode;
    productName: string;
    productType?: string;
    sector?: string;
    productionSector?: string;
    b2bSupplier: string; // The main industry/distributor
    price: number;
    priceModel?: ListingPriceModel;
    unit: string;
    quantityAvailable?: number;
    region?: string;
    status?: 'DRAFT' | 'PUBLISHED' | 'PAUSED' | 'CLOSED';
    createdAt?: string;
    updatedAt?: string;
    rating: number;
    category: string;
    isPartnerStore: boolean; // Is the B2B supplier a direct partner?
    
    // Dual-Stock Logic
    localPartnerStoreId: string; // ID of the physical store hub
    localStock: number; // Qty available for immediate pickup
    b2bStock: number; // Qty available from the main distributor
    deliveryTimeB2B: string; // e.g., "3-5 dias"
}

export interface CartItem extends MarketplaceListing {
    quantity: number;
    source: 'LOCAL' | 'B2B'; // Where is the user pulling stock from?
}

export interface ProducerMarketplaceProfile {
    id: string;
    producerName: string;
    productionTags: string[];
    region: string;
    hasActiveOffer: boolean;
    creditScore: number;
    contractGoalRate: number;
    marketplaceScore: number;
}

export interface ProducerPurchaseNeed {
    id: string;
    requesterUserId?: string;
    requesterName: string;
    targetProducerId: string;
    targetProducerName: string;
    product: string;
    quantity: string;
    notes?: string;
    status: 'ABERTA' | 'EM_NEGOCIACAO' | 'ENCERRADA' | 'CANCELADA';
    createdAt: string;
}

export type NetworkNeedSourcePortal = 'PRODUCER' | 'INTEGRATOR' | 'SUPPLIER' | 'AUCTIONEER' | 'OPERATOR';
export type NetworkNeedStatus = 'ABERTA' | 'EM_ATENDIMENTO' | 'CONTRATADA' | 'ENCERRADA' | 'CANCELADA';
export type NetworkNeedVisibility = 'TENANT' | 'NETWORK';

export interface NetworkNeed {
    id: string;
    tenantId?: string;
    createdByUserId?: string;
    sourcePortal: NetworkNeedSourcePortal;
    sourceRecordId?: string;
    title: string;
    description: string;
    product?: string;
    quantity?: string;
    region?: string;
    requesterName: string;
    requesterRole: User['role'];
    targetProducerId?: string;
    targetProducerName?: string;
    visibleToRoles: Array<User['role']>;
    visibility: NetworkNeedVisibility;
    status: NetworkNeedStatus;
    createdAt: string;
    updatedAt: string;
}


export type LogisticsEvidenceType = 'QR' | 'PHOTO' | 'VIDEO' | 'WEIGHT_QR' | 'SALE_AUTHORIZATION';

export interface LogisticsEvidence {
    id: string;
    type: LogisticsEvidenceType;
    reference: string;
    actor: string;
    createdAt: string;
}

export type LogisticsHaulProfile = 'CURTA_DISTANCIA' | 'LONGA_DISTANCIA';
export type LogisticsTransportMode = 'ELETRICO' | 'COMBUSTAO' | 'FERROVIA';

export type LogisticsStatus =
    | 'SOLICITADO'
    | 'ACEITO'
    | 'CARREGAMENTO_AUTORIZADO'
    | 'EM_TRANSITO'
    | 'AGUARDANDO_DESCARGA'
    | 'DESCARGA_AUTORIZADA'
    | 'FINALIZADO'
    | 'CANCELADO';

export interface LogisticsEntry {
    id: string;
    tenantId?: string;
    requestorUserId?: string;
    requestorName?: string;
    carrierUserId?: string;
    carrierName?: string;
    type: 'Entrega' | 'Coleta' | 'Transferencia';
    description: string;
    origin: string;
    destination: string;
    date: string;
    distanceKm?: number;
    haulProfile?: LogisticsHaulProfile;
    railAvailable?: boolean;
    recommendedTransportMode?: LogisticsTransportMode;
    selectedTransportMode?: LogisticsTransportMode;
    transportPolicyReason?: string;
    status: LogisticsStatus;
    driver?: string;
    plate?: string;
    currentLocation?: string;
    trackingCode?: string;
    loadAuthorizedAt?: string;
    unloadAuthorizedAt?: string;
    loadAuthorizedBy?: string;
    unloadAuthorizedBy?: string;
    immutableAuditHash?: string;
    evidences: LogisticsEvidence[];
    openForMarketplace?: boolean;
}

export type AlertSeverity = 'CRITICAL' | 'WARNING' | 'INFO';

export interface ManagementAlert {
    id: string;
    target: string;
    type: 'Nutrition' | 'Health' | 'Agriculture';
    message: string;
    reason: string;
    severity: AlertSeverity;
    dueDate: string;
}

export interface ManagementRecord {
    id: string;
    date: string;
    target: string;
    actionType: string;
    product: string;
    quantity: string;
    executor: string;
    targetType?: 'PASTURE' | 'LOT' | 'ANIMAL' | 'CULTURE';
    pastureId?: string;
    lotId?: string;
    animalId?: string;
    cultureId?: string;
    soilType?: ProducerSoilType;
    climateRegion?: PublicClimateRegion;
    season?: CropSeason;
    rainfallMm?: number;
    fertilizationKgHa?: number;
    animalHandlingDays?: number;
    estimatedProductivityKgHa?: number;
    estimatedNutrientIndex?: number;
    recommendations?: string[];
}

// Updated for Blind Integration Logic
export interface IntegratedProducer {
    id: string;
    maskedName: string; // e.g. "Produtor Certificado #492"
    region: string; // e.g. "Médio Norte - MT (Raio 100km)"
    productionType: 'Cria' | 'Recria' | 'Engorda' | 'Ciclo Completo' | 'Agricultura';
    status: 'Disponível' | 'Negociando' | 'Contratado';
    capacity: string; // e.g. "500 bezerros/ano"
    auditScore: number; // 0-100
    lastAuditDate: string;
}

export interface PartnershipOffer {
    id: string;
    title: string;
    description: string;
    // Updated types to reflect Demand/Origination, not selling
    type: 'Compra Garantida' | 'Fomento (Insumos)' | 'Integração Vertical' | 'Parceria Estratégica';
    status: 'Aberta' | 'Encerrada';
    applicants: number;
}

export type UpclDemandStatus = 'ABERTA' | 'EM_NEGOCIACAO' | 'FECHADA' | 'CANCELADA';
export type UpclClosureStatus = 'ENVIADA' | 'EM_ANALISE' | 'ACEITA' | 'REJEITADA' | 'CONTRATO_GERADO';

export interface UpclContractDemand {
    id: string;
    tenantId?: string;
    createdByUserId?: string;
    companyUserId: string;
    companyName: string;
    title: string;
    product: string;
    description: string;
    demandType: PartnershipOffer['type'];
    targetVolume: number;
    unit: string;
    targetPrice: number;
    currency: string;
    region?: string;
    deadline: string;
    status: UpclDemandStatus;
    acceptedClosureId?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface UpclContractClosure {
    id: string;
    tenantId?: string;
    createdByUserId?: string;
    demandId: string;
    producerUserId: string;
    producerName: string;
    producerDocument?: string;
    offeredVolume: number;
    unit: string;
    requestedPrice: number;
    currency: string;
    notes?: string;
    status: UpclClosureStatus;
    contractId?: string;
    approvedByUserId?: string;
    approvedAt?: string;
    createdAt: string;
    updatedAt?: string;
}

export interface IntegratorMessage {
    id: string;
    from: string;
    to: string;
    content: string;
    date: string;
    isUrgent: boolean;
}

export interface MarketOpportunity {
    id: string;
    commodity: string;
    buyer: string;
    price: number;
    unit: string;
    deliveryWindow: string;
    minQuantity: string;
    location: string;
}

export interface Employee {
    id: string;
    tenantId?: string;
    propertyId?: string;
    producerId?: string;
    userId?: string;
    name: string;
    role: string;
    type: 'CLT' | 'Temporário' | 'PJ';
    status: 'Ativo' | 'Férias' | 'Afastado';
    hourlyRate?: number;
    monthlySalary?: number;
}

export interface TimeRecord {
    id: string;
    tenantId?: string;
    propertyId?: string;
    producerId?: string;
    employeeId: string;
    date: string;
    hours: number;
    activity: string;
    status: 'Pendente' | 'Aprovado' | 'Rejeitado';
}

export interface PayrollEntry {
    id: string;
    tenantId?: string;
    propertyId?: string;
    producerId?: string;
    employeeId: string;
    period: string;
    amount: number;
    status: 'Pendente' | 'Pago';
    dueDate: string;
}

export interface PPEOrder {
    id: string;
    tenantId?: string;
    propertyId?: string;
    producerId?: string;
    requesterId: string;
    items: string;
    date: string;
    status: 'Solicitado' | 'Entregue';
    conformityDoc: boolean;
}

export interface MilkTank {
    id: string;
    tenantId?: string;
    propertyId?: string;
    name: string;
    capacityKg: number;
    currentWeightKg: number;
    status: 'ATIVO' | 'MANUTENCAO' | 'INATIVO';
    updatedAt: string;
    createdAt: string;
}

export interface MilkDepositAuthorization {
    id: string;
    tenantId?: string;
    propertyId?: string;
    producerId?: string;
    producerName: string;
    producerCredential: string;
    badgeId: string;
    identityDocument: string;
    authorizedByUserId?: string;
    authorizedByName?: string;
    authorizedAt: string;
    validUntil: string;
    status: 'ATIVA' | 'USADA' | 'CANCELADA';
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

export interface MilkSampleTest {
    id: string;
    tenantId?: string;
    tankId: string;
    producerCredential: string;
    batchCode: string;
    fatPercent: number;
    proteinPercent: number;
    ccs: number;
    temperatureC: number;
    result: 'APROVADA' | 'REJEITADA' | 'ALERTA';
    collectedAt: string;
    collectedBy?: string;
    notes?: string;
}

export interface MilkTankEntry {
    id: string;
    tenantId?: string;
    tankId: string;
    authorizationId: string;
    producerCredential: string;
    producerName: string;
    badgeId: string;
    weightBeforeKg: number;
    weightAddedKg: number;
    weightAfterKg: number;
    recordedAt: string;
    recordedBy?: string;
    sampleTestId?: string;
}

export interface OperatorAccessAuthorization {
    id: string;
    tenantId: string;
    producerId: string;
    producerName: string;
    propertyId: string;
    propertyName: string;
    propertyRegistrationNumber: string;
    operatorName: string;
    operatorDocumentNumber: string;
    operatorAuthEmail: string;
    status: 'ATIVO' | 'CONCLUIDO' | 'CANCELADO';
    createdByUserId: string;
    createdAt: string;
    linkedUserId?: string;
    linkedAt?: string;
}

export interface OperatorPropertyLinkRequest {
    id: string;
    operatorName: string;
    operatorDocumentNumber: string;
    operatorAuthEmail: string;
    propertyRegistrationNumber: string;
    propertyName?: string;
    status: 'PENDENTE' | 'APROVADO' | 'REJEITADO' | 'CANCELADO';
    createdAt: string;
    decidedAt?: string;
    decidedByUserId?: string;
    authorizationId?: string;
}

export interface MarketTrend {
    commodity: string;
    price: number;
    unit: string;
    trend: 'up' | 'down' | 'stable';
    change: string;
}

export interface AggregatedStat {
    label: string;
    value: string;
    description: string;
}

export interface NewsItem {
    id: string;
    title: string;
    summary: string;
    source: string;
    date: string;
    category: 'Mercado' | 'Clima' | 'Tecnologia';
}

export interface AuctionListing {
    id: string;
    title: string;
    date: string;
    location: string;
    category: string;
    lotCount: number;
    organizer: string;
    status: 'Agendado' | 'Em Andamento' | 'Finalizado';
}

export interface MarketSaturation {
    id: string;
    commodity: string;
    totalDemand: number;
    currentProduction: number;
    unit: string;
    riskLevel: 'Opportunity' | 'Balanced' | 'Warning' | 'Oversupply';
    projectedPriceDrop: string;
    maxSafePrice: number;
    averageContractPrice: number;
    averageRealizedPrice: number;
    marketAveragePrice: number;
}

export type PublicMarketPriceCategory = 'COMMODITY' | 'LIVESTOCK' | 'INPUT';

export interface PublicMarketPriceItem {
    symbol: string;
    category: PublicMarketPriceCategory;
    name: string;
    unit: string;
    currency: string;
    price: number;
    change1d: number;
    change7d: number;
    change30d: number;
    source?: string;
    sourceRef?: string;
    region?: string;
    updatedAt?: string | null;
}

export interface PublicInputCostIndex {
    window7d: number;
    window30d: number;
    componentsUsed: Array<{
        symbol: string;
        weight: number;
        change7d: number;
        change30d: number;
    }>;
    staleComponents: string[];
    updatedAt?: string | null;
}

export interface PublicMarketSummary {
    updatedAt: string;
    countsByCategory: Record<PublicMarketPriceCategory, number>;
    topCommodities: PublicMarketPriceItem[];
    topLivestock: PublicMarketPriceItem[];
    topInputs: PublicMarketPriceItem[];
    inputCostIndex: PublicInputCostIndex | null;
}

export interface ExternalMarketBenchmarkItem {
    id: string;
    symbol: string;
    name: string;
    category: PublicMarketPriceCategory;
    unit: string;
    currency: string;
    internalPrice: number | null;
    externalAveragePrice: number;
    spreadPct: number | null;
    externalSampleSize: number;
    updatedAt: string;
}

export interface ExternalMarketBenchmark {
    updatedAt: string;
    internalDataAvailable: boolean;
    stale: boolean;
    items: ExternalMarketBenchmarkItem[];
}

export interface ExternalNewsDigestItem {
    id: string;
    title: string;
    summary: string;
    date: string;
    category: 'Mercado';
    sourceLabel: string;
    link: string;
}

export interface ExternalNewsDigest {
    updatedAt: string;
    stale: boolean;
    items: ExternalNewsDigestItem[];
}

export type PublicClimateRegion = 'NORTE' | 'NORDESTE' | 'CENTRO_OESTE' | 'SUDESTE' | 'SUL';

export interface PublicClimateForecastDay {
    date: string;
    tempMinC: number;
    tempMaxC: number;
    precipitationProbabilityPct: number;
    precipitationMm: number;
    windMaxKmh: number;
}

export interface PublicClimateForecast {
    region: PublicClimateRegion;
    regionLabel: string;
    referenceCity: string;
    updatedAt: string;
    stale: boolean;
    days: PublicClimateForecastDay[];
}

export interface CorporateCard {
    id: string;
    holderName: string;
    linkedAccount: string;
    last4Digits: string;
    balance: number;
    network: string;
}

export interface AuditEvent {
    id: string;
    timestamp: string;
    actor: string;
    action: string;
    details: string;
    geolocation: string;
    hash: string;
    verified: boolean;
    proofUrl?: string;
}

export interface OperatorRequest {
    id: string;
    tenantId?: string;
    propertyId?: string;
    propertyName?: string;
    producerId?: string;
    producerName?: string;
    requesterUserId?: string;
    type: 'PURCHASE' | 'MAINTENANCE';
    item: string;
    quantity?: string;
    priority: 'LOW' | 'MEDIUM' | 'HIGH';
    requester: string;
    date: string;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface OperatorTask {
    id: string;
    tenantId?: string;
    propertyId?: string;
    propertyName?: string;
    producerId?: string;
    producerName?: string;
    assignedOperatorUserId?: string;
    title: string;
    executor: string;
    timestamp: string;
    status: 'COMPLETED' | 'PENDING_REVIEW' | 'REJECTED';
    proofType: 'PHOTO' | 'GPS' | 'AUDIO';
    details: string;
    geolocation: string;
    proofUrl?: string;
    proofMimeType?: string;
}

export type StockMovementType = 'INBOUND_PURCHASE' | 'OUTBOUND_USAGE' | 'OUTBOUND_LOSS';
export type StockStatus = 'PENDING_APPROVAL' | 'APPROVED' | 'INVOICE_REQUIRED' | 'COMPLETED' | 'AUDITED';

export interface StockMovement {
    id: string;
    itemId: string;
    itemName: string;
    type: StockMovementType;
    quantity: number;
    unit: string;
    date: string;
    status: StockStatus;
    requester: string;
    invoiceNumber?: string; // Only for Inbound
    proofUrl?: string;      // Only for Loss
    reason?: string;        // Only for Loss
    auditHash?: string;     // Link to the audit event
}

export type AnimalStatus = 'Protocolada' | 'Inseminada' | 'Prenhez Confirmada' | 'Gestação Final' | 'Com Cria' | 'Vazia';

// --- CARBON MARKET TYPES ---
export interface SustainablePractice {
    id: string;
    name: string;
    description: string;
    sequestrationFactor: number; // tCO2e / hectare / year
}

export interface CarbonProject {
    id: string;
    name: string;
    practiceId: string;
    area: number; // hectares
    startDate: string;
    status: 'PLANEJAMENTO' | 'ATIVO' | 'EM_VERIFICACAO' | 'VERIFICADO';
    estimatedSequestration: number; // total tCO2e
}

export interface CarbonCredit {
    id: string;
    projectId: string;
    vintage: number; // Year of sequestration
    quantity: number; // tCO2e
    status: 'DISPONIVEL' | 'EM_NEGOCIACAO' | 'VENDIDO';
    certificateHash: string;
}

export interface ProducerAnimalLot {
    id: string;
    name: string;
    trackingCode?: string;
    category: string;
    headcount: number;
    averageWeightKg: number;
    species?: ProducerAnimal['species'];
    phase?: string;
    ageInDays?: number;
    pastureId?: string;
    animalIds?: string[];
    trackingMode?: 'UNIT' | 'WEIGHT';
    totalWeightKg?: number;
    distributionArea?: string;
    lifecycleStatus?: 'ACTIVE' | 'TRANSFERRED' | 'CYCLE_CLOSED';
    primitiveOriginCode?: string;
    primitiveOriginLocation?: string;
    ownershipTrail?: ProducerTraceEvent[];
    createdAt: string;
}

export interface ProducerTraceEvent {
    at: string;
    eventType: 'CREATED' | 'LOT_CREATED' | 'TRANSFERRED' | 'CYCLE_CLOSED' | 'GENEALOGY_LINKED';
    ownerLabel?: string;
    locationLabel?: string;
    relatedCode?: string;
    notes?: string;
}

export interface ProducerAnimal {
    id: string;
    earringCode: string;
    trackingCode?: string;
    species: 'BOVINO' | 'SUINO' | 'OVINO' | 'CAPRINO' | 'EQUINO' | 'AVE' | 'PEIXE' | 'OUTRO';
    category: string;
    trackingMode: 'UNIT' | 'WEIGHT';
    currentWeightKg?: number;
    pastureId?: string;
    lotId?: string;
    status: 'ACTIVE' | 'IN_LOT' | 'AUCTION' | 'SOLD';
    lifecycleStatus?: 'ACTIVE' | 'TRANSFERRED' | 'CYCLE_CLOSED';
    primitiveOriginCode?: string;
    primitiveOriginLocation?: string;
    parentAnimalIds?: string[];
    genealogyCode?: string;
    ownershipTrail?: ProducerTraceEvent[];
    createdAt: string;
}

export interface ProducerInput {
    id: string;
    name: string;
    inputType: ProducerInputType;
    applicationArea: ProducerApplicationArea;
    targetSpecies: ProducerTargetSpecies[];
    launchLinkType?: 'GERAL' | 'ANIMAL' | 'LOTE' | 'TALHAO';
    linkedAnimalId?: string;
    linkedLotId?: string;
    linkedPlotId?: string;
    unit: string;
    unitCost: number;
    stock: number;
    createdAt: string;
}

export type ProducerInputType =
    | 'ADUBO'
    | 'RACAO'
    | 'SAL_MINERAL'
    | 'MEDICAMENTO'
    | 'SEMENTE'
    | 'DEFENSIVO'
    | 'OUTRO';

export type ProducerApplicationArea =
    | 'PASTAGEM'
    | 'LAVOURA'
    | 'CONFINAMENTO'
    | 'AVIARIO'
    | 'CURRAL'
    | 'GERAL';

export type ProducerTargetSpecies =
    | 'BOVINOS'
    | 'AVES'
    | 'SUINOS'
    | 'OVINOS'
    | 'CAPRINOS'
    | 'EQUINOS'
    | 'PEIXES';

export type ProducerSoilType = 'ARENOSO' | 'ARGILOSO' | 'SILTOSO' | 'MISTO';
export type CropSeason = 'VERAO' | 'OUTONO' | 'INVERNO' | 'PRIMAVERA';
export type ProducerCultureStage =
    | 'SEMENTEIRA'
    | 'EMERGENCIA'
    | 'VEGETATIVO'
    | 'FLORACAO'
    | 'FRUTIFICACAO'
    | 'MATURACAO'
    | 'COLHEITA';
export type ProducerPlantCondition = 'EXCELENTE' | 'BOA' | 'ATENCAO' | 'CRITICA';

export interface ProducerCultureProfile {
    id: string;
    name: string;
    species: string;
    pastureId: string;
    region: PublicClimateRegion;
    soilType: ProducerSoilType;
    plantedAt: string;
    currentStage: ProducerCultureStage;
    currentCondition: ProducerPlantCondition;
    nutrientN: number;
    nutrientP: number;
    nutrientK: number;
    nutrientIndex: number;
    estimatedProductivityKgHa: number;
    lastRainMm: number;
    lastSeason: CropSeason;
    lastAiConfidence?: number;
    lastPhotoUrl?: string;
    lastPhotoHash?: string;
    lastAnalysisAt?: string;
    updatedAt?: string;
    createdAt: string;
}

export interface ProducerCultureAnalysisRecord {
    id: string;
    cultureId: string;
    cultureName: string;
    stage: ProducerCultureStage;
    condition: ProducerPlantCondition;
    diagnosis: string;
    confidence: number;
    recommendation: string;
    nutrientN: number;
    nutrientP: number;
    nutrientK: number;
    nutrientIndex: number;
    estimatedProductivityKgHa: number;
    rainfallMm: number;
    season: CropSeason;
    region: PublicClimateRegion;
    soilType: ProducerSoilType;
    photoUrl?: string;
    photoHash?: string;
    createdAt: string;
}

export interface ProducerExpense {
    id: string;
    description: string;
    category: 'OPERACIONAL' | 'INSUMO' | 'MANUTENCAO' | 'PESSOAL' | 'OUTROS';
    amount: number;
    date: string;
    source: 'OPERADOR' | 'ADMINISTRADOR' | 'SISTEMA';
    relatedActivityId?: string;
    relatedPastureId?: string;
    areaHa?: number;
    expectedRevenue?: number;
    realizedRevenue?: number;
    profit?: number;
}

export interface ProducerOperationalActivity {
    id: string;
    title: string;
    details: string;
    actor: string;
    actorRole: 'OPERADOR' | 'ADMINISTRADOR';
    date: string;
    relatedLotId?: string;
}

// --- SUPPLIER PORTAL ERP ---
export type SupplierOrderStatus = 'PENDENTE' | 'ENVIADO' | 'ENTREGUE';

export interface SupplierOrder {
  id: string;
  customer: string;
  items: { productName: string; quantity: number }[];
  totalValue: number;
  date: string;
  status: SupplierOrderStatus;
}

export interface SupplierFinancialSummary {
  month: string;
  totalSales: number;
  platformFees: number;
  netPayout: number;
  status: 'PAGO' | 'A PAGAR';
}

export type SupplierPdvConnectorStatus = 'CONNECTED' | 'DISCONNECTED' | 'ERROR';
export type SupplierPdvSyncStatus = 'SUCCESS' | 'FAILED' | 'NEVER';

export interface SupplierPdvConnector {
  id: string;
  providerName: string;
  baseUrl: string;
  apiKeyMasked: string;
  routeOffersToPdv: boolean;
  autoImportEnabled: boolean;
  status: SupplierPdvConnectorStatus;
  lastSyncAt?: string;
  lastSyncStatus: SupplierPdvSyncStatus;
  lastSyncMessage?: string;
  immutableAuditHash?: string;
}

export interface SupplierExternalProductPayload {
  externalId: string;
  name: string;
  category?: string;
  unit: string;
  price: number;
  stock: number;
  region?: string;
  sectorHint?: string;
  evidenceReference: string;
}

export type ExternalMarketplaceStatus = 'ATIVA' | 'PENDENTE' | 'ERRO' | 'INATIVA';
export type ExternalMarketplacePortal =
  | 'PRODUTOR'
  | 'FORNECEDOR'
  | 'INTEGRADORA'
  | 'OPERADOR'
  | 'LEILOEIRO'
  | 'TECNICO'
  | 'INVESTIDOR'
  | 'GESTOR'
  | 'ADMINISTRADOR'
  | 'GESTOR_TRAFEGO';

export interface ExternalMarketplaceBridge {
  id: string;
  tenantId?: string;
  createdByUserId?: string;
  platformName: string;
  apiBaseUrl: string;
  storefrontUrl: string;
  apiClientId: string;
  apiTokenHint?: string;
  status: ExternalMarketplaceStatus;
  visibleToRoles: Array<User['role']>;
  notes?: string;
  lastSyncAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalMarketplaceApiItemPayload {
  externalId: string;
  title: string;
  description?: string;
  segment: string;
  unit: string;
  price: number;
  stock: number;
  targetPortals: ExternalMarketplacePortal[];
  sourceUrl?: string;
}

export interface ExternalMarketplaceItem {
  id: string;
  tenantId?: string;
  createdByUserId?: string;
  bridgeId: string;
  externalId: string;
  title: string;
  description?: string;
  segment: string;
  unit: string;
  price: number;
  stock: number;
  targetPortals: ExternalMarketplacePortal[];
  sourceUrl?: string;
  conflictWithInternal: boolean;
  conflictReason?: string;
  createdAt: string;
  updatedAt: string;
}

export type RealModuleKey = 'ERP_CORE' | 'MPV_CICLO' | 'CEREBRO_NEXUS';
export type RealModuleEnvironment = 'LOCAL' | 'HOMOLOGACAO' | 'PRODUCAO';
export type RealModuleAuthMode = 'NONE' | 'BEARER' | 'API_KEY';
export type RealModuleHealthStatus = 'ONLINE' | 'OFFLINE' | 'UNCONFIGURED' | 'DISABLED' | 'DEGRADED';
export type RealModuleCriticality = 'CORE' | 'HIGH' | 'MEDIUM';

export interface RealModuleHealthCheck {
  status: RealModuleHealthStatus;
  checkedAt: string;
  message: string;
  targetUrl?: string;
  latencyMs?: number;
  httpStatus?: number;
}

export interface RealModuleRuntime {
  moduleKey: RealModuleKey;
  displayName: string;
  description: string;
  owningSystem: string;
  criticality: RealModuleCriticality;
  baseUrl: string;
  healthPath: string;
  manifestPath: string;
  environment: RealModuleEnvironment;
  authMode: RealModuleAuthMode;
  credentialRef: string;
  enabled: boolean;
  capabilities: string[];
  lastConfiguredAt?: string;
  lastConfiguredBy?: string;
  lastHealthCheck?: RealModuleHealthCheck | null;
}

export interface RealModuleRuntimeDraft {
  baseUrl: string;
  healthPath: string;
  manifestPath: string;
  environment: RealModuleEnvironment;
  authMode: RealModuleAuthMode;
  credentialRef: string;
  enabled: boolean;
  capabilitiesText: string;
}

export type RealModuleManifestSource = 'DIRECT' | 'NEXUS' | 'CATALOG';

export interface RealModuleManifest {
  moduleKey: RealModuleKey;
  displayName: string;
  description: string;
  owningSystem: string;
  capabilities: string[];
  healthPath: string;
  manifestPath: string;
  source: RealModuleManifestSource;
  status: RealModuleHealthStatus;
  sourceUrl: string;
  checkedAt: string;
  message: string;
  runtimeHealthMessage?: string;
  runtimeTargetUrl?: string;
  manifest?: Record<string, unknown>;
}

export type RealModuleNexusSeverity = 'INFO' | 'WARNING' | 'CRITICAL';
export type RealModuleNexusDomain = 'MARKET' | 'SUPPORT' | 'INTEGRATION' | 'GOVERNANCE';

export interface RealModuleNexusSignal {
  id: string;
  tenantId: string;
  auditId: string;
  sequence: number;
  stream: string;
  eventType: string;
  operationType: string;
  auditStatus: string;
  actorUid: string;
  actorRole: string;
  eventCreatedAtIso: string;
  observedAtIso: string;
  severity: RealModuleNexusSeverity;
  domain: RealModuleNexusDomain;
  summary: string;
  recommendedAction: string;
  tags: string[];
}

export interface RealModuleNexusSummary {
  tenantId: string;
  totalSignals: number;
  lastSignalAtIso?: string;
  lastSeverity?: RealModuleNexusSeverity;
  lastEventType?: string;
  lastSummary?: string;
  lastAuditSequence?: number;
  severityCounts?: Record<string, number>;
  domainCounts?: Record<string, number>;
  statusCounts?: Record<string, number>;
}

export interface RealModuleNexusFeed {
  summary: RealModuleNexusSummary;
  signals: RealModuleNexusSignal[];
}

// --- AUCTIONEER PORTAL ---
export type AuctionLotStatus =
  | 'RECEBIDO'
  | 'EM_ANALISE'
  | 'PENDENTE_COMPLEMENTO'
  | 'APROVADO'
  | 'PUBLICADO'
  | 'EM_LEILAO'
  | 'FINALIZADO'
  | 'REPROVADO';

export type AuctionMediaType = 'VIDEO' | 'PHOTO' | 'QR';

export type AuctionTransportStatus = 'PENDENTE' | 'AGENDADO' | 'EM_TRANSITO' | 'CONCLUIDO';
export type AuctionPaymentStatus = 'PENDENTE' | 'EM_ESCROW' | 'PARCIAL' | 'QUITADO';
export type AuctionLiveStreamStatus = 'PREPARACAO' | 'AO_VIVO' | 'ENCERRADA';
export type AuctionModality = 'PRESENCIAL' | 'ONLINE' | 'HIBRIDO';
export type AuctionParticipantChannel = 'PRESENCIAL' | 'ONLINE';
export type AuctionEventStatus = 'RASCUNHO' | 'AGENDADO' | 'AO_VIVO' | 'ENCERRADO' | 'CANCELADO';
export type AuctionStreamProvider = 'YOUTUBE' | 'VIMEO' | 'MEET' | 'TEAMS' | 'RTMP' | 'OUTRO';

export interface AuctionLotMedia {
  id: string;
  type: AuctionMediaType;
  reference: string;
  createdAt: string;
}

export interface AuctionBidEntry {
  id: string;
  bidderId?: string;
  bidderName: string;
  amount: number;
  channel?: AuctionParticipantChannel;
  validatedByAuctioneer?: boolean;
  receivedByAssistant?: boolean;
  receivedByAssistantAt?: string;
  receivedByAssistantName?: string;
  createdAt: string;
}

export type AuctionBidSignalStatus = 'RECEBIDO' | 'VALIDADO' | 'REJEITADO';

export interface AuctionBidSignal {
  id: string;
  tenantId?: string;
  lotId: string;
  lotName?: string;
  auctionEventId?: string;
  bidderName: string;
  amount: number;
  channel: AuctionParticipantChannel;
  status: AuctionBidSignalStatus;
  assistantUserId?: string;
  assistantName?: string;
  assistantNote?: string;
  evidenceReference?: string;
  validatedByUserId?: string;
  validatedByName?: string;
  validatedAt?: string;
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuctionLot {
  id: string;
  tenantId?: string;
  producerId?: string;
  producerName: string;
  sourceLotId?: string;
  propertyId?: string;
  propertyName?: string;
  propertyRegistrationNumber?: string;
  locationLabel?: string;
  geoCenter?: { lat: number; lon: number };
  lotName: string;
  category: string;
  headcount?: number;
  totalWeightKg?: number;
  reservePrice?: number;
  isPublicOffer?: boolean;
  auctionStartAt?: string;
  auctionDate?: string;
  auctionEndAt?: string;
  auctionDurationDays?: number;
  bidCount?: number;
  highestBid?: number;
  bidHistory?: AuctionBidEntry[];
  winningBidId?: string;
  winningBidderName?: string;
  winningBidAmount?: number;
  winnerChannel?: AuctionParticipantChannel;
  commercialLockActiveUntil?: string;
  lotAssemblyProfile?: string;
  assignedAuctioneerUserId?: string;
  assignedAuctioneerName?: string;
  assignedAuctionEventId?: string;
  distanceToAuctionParkKm?: number;
  allowedModalities?: AuctionModality[];
  currentModality?: AuctionModality;
  transportStatus?: AuctionTransportStatus;
  transportProvider?: string;
  transportVehicle?: string;
  transportNotes?: string;
  paymentStatus?: AuctionPaymentStatus;
  paymentAmountDue?: number;
  paymentAmountPaid?: number;
  paymentNotes?: string;
  documentReferences?: string[];
  fiscalNoteReferences?: string[];
  liveStreamUrl?: string;
  liveStreamStatus?: AuctionLiveStreamStatus;
  liveStreamStartedAt?: string;
  liveStreamEndedAt?: string;
  status: AuctionLotStatus;
  contactInfo?: string;
  notes?: string;
  media: AuctionLotMedia[];
  protocolAuditOk: boolean;
  protocolMediaOk: boolean;
  protocolTraceabilityOk: boolean;
  finalizedAt?: string;
  createdAt: string;
  updatedAt: string;
  immutableAuditHash?: string;
}

export interface AuctioneerProfile {
  id: string;
  tenantId?: string;
  userId: string;
  name: string;
  parkName: string;
  parkDocument?: string;
  city: string;
  state: string;
  parkLatitude: number;
  parkLongitude: number;
  serviceRadiusKm: number;
  modalities: AuctionModality[];
  supportsOnlineBidding: boolean;
  supportsLiveStream: boolean;
  liveStreamProvider?: AuctionStreamProvider;
  defaultLiveStreamUrl?: string;
  contactPhone?: string;
  contactEmail?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuctionEventLotLink {
  lotId: string;
  lotName: string;
  producerName: string;
  reservePrice?: number;
  currentBid?: number;
  status: AuctionLotStatus;
}

export interface AuctionEvent {
  id: string;
  tenantId?: string;
  auctioneerUserId: string;
  auctioneerName: string;
  auctioneerParkName: string;
  title: string;
  modality: AuctionModality;
  status: AuctionEventStatus;
  startsAt: string;
  endsAt: string;
  checkInOpensAt?: string;
  liveStreamProvider?: AuctionStreamProvider;
  liveStreamUrl?: string;
  liveStreamStatus: AuctionLiveStreamStatus;
  lots: AuctionEventLotLink[];
  onlineBidEnabled: boolean;
  inPersonEnabled: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  immutableAuditHash?: string;
}

// --- TECHNICIAN PORTAL ---
export type TechnicianDemandPriority = 'ALTA' | 'MEDIA' | 'BAIXA';
export type TechnicianDemandStatus = 'ABERTA' | 'EM_ATENDIMENTO' | 'CONCLUIDA';
export type TechnicianVisitStatus = 'AGENDADA' | 'CONCLUIDA' | 'NAO_REALIZADA';
export type TechnicianTaskStatus = 'PENDENTE' | 'CONCLUIDA' | 'ATRASADA';
export type TechnicianDocumentType = 'LAUDO' | 'TRT' | 'RECEITUARIO';
export type TechnicianDocumentStatus = 'RASCUNHO' | 'EMITIDO';

export interface TechnicianProducerFollowUp {
  id: string;
  technicianUserId: string;
  producerId: string;
  producerName: string;
  producerDocument?: string;
  propertyName: string;
  region: string;
  activity: string;
  status: 'ATIVO' | 'PAUSADO';
  openDemands: number;
  lastVisitAt?: string;
}

export interface TechnicianProducerDemand {
  id: string;
  technicianUserId: string;
  producerId: string;
  producerName: string;
  title: string;
  description: string;
  priority: TechnicianDemandPriority;
  status: TechnicianDemandStatus;
  createdAt: string;
  dueDate?: string;
}

export interface TechnicianVisitCheckpoint {
  id: string;
  label: string;
  done: boolean;
  checkedAt?: string;
}

export interface TechnicianVisitPlan {
  id: string;
  technicianUserId: string;
  producerId: string;
  producerName: string;
  scheduledAt: string;
  status: TechnicianVisitStatus;
  checkpoints: TechnicianVisitCheckpoint[];
  notes?: string;
}

export interface TechnicianTask {
  id: string;
  technicianUserId: string;
  producerId: string;
  producerName: string;
  title: string;
  description?: string;
  dueDate?: string;
  status: TechnicianTaskStatus;
}

export interface TechnicianFieldReport {
  id: string;
  technicianUserId: string;
  producerId: string;
  producerName: string;
  title: string;
  summary: string;
  imageUrls: string[];
  evidenceReference?: string;
  createdAt: string;
  immutableAuditHash?: string;
}

export interface TechnicianRuleUpdate {
  id: string;
  region: string;
  title: string;
  summary: string;
  sourceLabel: string;
  sourceUrl?: string;
  publishedAt: string;
}

export interface TechnicianProductRule {
  id: string;
  productName: string;
  activeIngredient: string;
  bulaSummary: string;
  allowedActivities: string[];
  blockedRegions: string[];
  requiresTrt: boolean;
  lastUpdatedAt: string;
}

export interface TechnicianPrescriptionDraft {
  draftText: string;
  warnings: string[];
}

export interface TechnicianTechnicalDocument {
  id: string;
  technicianUserId: string;
  producerId: string;
  producerName: string;
  region: string;
  activity: string;
  category: string;
  councilType: CouncilType;
  councilNumber: string;
  documentType: TechnicianDocumentType;
  status: TechnicianDocumentStatus;
  diagnosis: string;
  selectedProductIds: string[];
  draftText: string;
  warnings: string[];
  evidenceReference?: string;
  createdAt: string;
  issuedAt?: string;
  immutableAuditHash?: string;
}

// --- SEED PRODUCER TYPES ---
export type SeedFieldStatus = 'PREPARO' | 'PLANTIO' | 'CRESCIMENTO' | 'FLORACAO' | 'COLHEITA' | 'CERTIFICADO';
export type SeedGeneration = 'G1' | 'G2' | 'C1' | 'C2' | 'S1' | 'S2';

export interface SeedField {
  id: string;
  name: string; // e.g., "Campo 01A"
  variety: string; // e.g., "Soja BRS 5980"
  generation: SeedGeneration;
  area: number; // in hectares
  status: SeedFieldStatus;
  expectedYield: number; // in sc/ha
}

export interface CertificationStep {
  name: string;
  status: 'PENDENTE' | 'EM_ANALISE' | 'APROVADO';
  date?: string;
}

export interface SeedLot {
  id: string;
  fieldId: string;
  variety: string;
  generation: SeedGeneration;
  quantity: number; // in sc (sacks)
  germinationRate: number; // percentage
  purity: number; // percentage
  storageLocation: string;
}
