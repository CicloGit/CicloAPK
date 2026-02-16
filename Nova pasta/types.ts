
export type ViewType = 
  'dashboard' | 
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
  'publicMarket' |
  'aiAnalysis' |
  'liveHandling' |
  'integrations' |
  'fieldOperations' |
  'reports' |
  'carbonMarket' | 
  'customInputRequest' | // New Custom Input Request View
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
  name: string;
  role: 'Produtor' | 'Gestor' | 'Técnico' | 'Investidor' | 'Fornecedor' | 'Integradora' | 'Operador' | 'Produtor de Sementes';
}

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

export interface SalesOffer {
    id: string;
    product: string;
    quantity: string;
    price: number;
    status: SalesOfferStatus;
    date: string;
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
    category: 'Insumo' | 'Medicamento' | 'Ferramenta' | 'Outro';
    quantity: number;
    unit: string;
    minLevel: number;
    location: string;
    lastUpdated: string;
}

export interface PartnerStore {
    id: string;
    name: string;
    location: string; // City, State
}

export interface MarketplaceListing {
    id: string;
    productName: string;
    b2bSupplier: string; // The main industry/distributor
    price: number;
    unit: string;
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


export interface LogisticsEntry {
    id: string;
    type: 'Entrega' | 'Coleta' | 'Transferência';
    description: string;
    origin: string;
    destination: string;
    date: string;
    status: 'SOLICITADO' | 'AGENDADO' | 'EM_TRANSITO' | 'ENTREGUE';
    driver?: string;
    plate?: string;
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
    name: string;
    role: string;
    type: 'CLT' | 'Temporário' | 'PJ';
    status: 'Ativo' | 'Férias' | 'Afastado';
    hourlyRate?: number;
    monthlySalary?: number;
}

export interface TimeRecord {
    id: string;
    employeeId: string;
    date: string;
    hours: number;
    activity: string;
    status: 'Pendente' | 'Aprovado' | 'Rejeitado';
}

export interface PayrollEntry {
    id: string;
    employeeId: string;
    period: string;
    amount: number;
    status: 'Pendente' | 'Pago';
    dueDate: string;
}

export interface PPEOrder {
    id: string;
    requesterId: string;
    items: string;
    date: string;
    status: 'Solicitado' | 'Entregue';
    conformityDoc: boolean;
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
    title: string;
    executor: string;
    timestamp: string;
    status: 'COMPLETED' | 'PENDING_REVIEW' | 'REJECTED';
    proofType: 'PHOTO' | 'GPS' | 'AUDIO';
    details: string;
    geolocation: string;
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
    category: string;
    headcount: number;
    averageWeightKg: number;
    createdAt: string;
}

export interface ProducerInput {
    id: string;
    name: string;
    inputType: ProducerInputType;
    applicationArea: ProducerApplicationArea;
    targetSpecies: ProducerTargetSpecies[];
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
    | 'EQUINOS';

export interface ProducerExpense {
    id: string;
    description: string;
    category: 'OPERACIONAL' | 'INSUMO' | 'MANUTENCAO' | 'PESSOAL' | 'OUTROS';
    amount: number;
    date: string;
    source: 'OPERADOR' | 'ADMINISTRADOR' | 'SISTEMA';
    relatedActivityId?: string;
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
