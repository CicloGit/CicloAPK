
// ... existing imports ...
import { 
    ArchitectureNode, 
    DataEntity, 
    Operation, 
    LiquidationFlow, 
    User, 
    EventMatrixModule, 
    EventConfig, 
    StateMachineConfig, 
    PermissionsConfig, 
    ProductionProject, 
    FinancialDetails, 
    AnimalProductionDetails, 
    Property, 
    CultivarFactor, 
    ProductFactor, 
    SalesOffer, 
    Receivable, 
    Expense, 
    InventoryItem, 
    MarketplaceListing, 
    LogisticsEntry, 
    ManagementAlert, 
    ManagementRecord, 
    IntegratedProducer, 
    PartnershipOffer, 
    IntegratorMessage, 
    MarketOpportunity, 
    Employee, 
    TimeRecord, 
    PayrollEntry, 
    PPEOrder, 
    MarketTrend, 
    AggregatedStat, 
    NewsItem, 
    AuctionListing, 
    SectorSpecificData, 
    MarketSaturation, 
    CorporateCard, 
    ProjectStage, 
    AuditEvent, 
    OperatorRequest,
    OperatorTask,
    StockMovement,
    BankAccount,
    Transaction,
    ProductionSector,
    ViewType,
    PartnerStore,
    SustainablePractice,
    CarbonProject,
    CarbonCredit,
    SupplierOrder,
    SupplierFinancialSummary,
    SeedField,
    CertificationStep,
    SeedLot
} from './types';

// FIX: Added all missing exported constants
export const architectureNodes: Record<string, ArchitectureNode> = {
    CH: {
        id: 'CH', label: 'Canais', description: 'Interfaces com o usuário final.',
        children: [
            { id: 'CH1', label: 'Web/Mobile App', description: 'Aplicação principal para produtores, gestores, etc.', children: [] },
            { id: 'CH2', label: 'Portal do Operador', description: 'Interface simplificada para operadores de campo.', children: [] },
            { id: 'CH3', label: 'API Externa', description: 'Integração com sistemas de parceiros (ERPs, etc).', children: [] }
        ]
    },
    CORE: {
        id: 'CORE', label: 'Kernel (Núcleo)', description: 'Componentes centrais e regras de negócio.',
        children: [
            { id: 'A', label: 'A. Endpoint (API Gateway)', description: 'Ponto de entrada para todas as requisições.', children: [] },
            { id: 'B', label: 'B. Gerenciador de Identidade', description: 'Autenticação e autorização de perfis.', children: [] },
            { id: 'C', label: 'C. Motor de Regras', description: 'Validação de regras de negócio pré-execução.', children: [] },
            { id: 'D', label: 'D. Orquestrador de Eventos', description: 'Processa e distribui eventos do sistema.', children: [] },
            { id: 'E', label: 'E. Máquina de Estados', description: 'Controla o ciclo de vida das entidades.', children: [] },
            { id: 'F', label: 'F. Gerador de Evidências', description: 'Coleta e armazena provas digitais.', children: [] },
            { id: 'G', label: 'G. Trilha de Auditoria (Ledger)', description: 'Registro imutável de todas as operações.', children: [] },
            { id: 'H', label: 'H. Motor de Liquidação (UPCL)', description: 'Processa pagamentos, splits e escrow.', children: [] },
            { id: 'I', label: 'I. Notificador', description: 'Envia alertas, e-mails e push notifications.', children: [] },
        ]
    },
    MOD: {
        id: 'MOD', label: 'Módulos Habilitáveis', description: 'Funcionalidades que consomem dados do núcleo.',
        children: [
            { id: 'M1', label: 'M1. Financeiro', description: 'Fluxo de caixa, contas a pagar/receber.', children: [] },
            { id: 'M2', label: 'M2. Estoque', description: 'Controle de insumos e produtos.', children: [] },
            { id: 'M3', label: 'M3. Comercial', description: 'Marketplace, contratos de venda.', children: [] },
            { id: 'M4', label: 'M4. Produção', description: 'Manejo, relatórios de campo.', children: [] },
            { id: 'M5', label: 'M5. Logística', description: 'Controle de fretes e entregas.', children: [] },
        ]
    }
};

export const dataDictionaryEntities: DataEntity[] = [
    { name: 'Projeto', description: 'Representa um ciclo produtivo.', fields: ['id', 'nome', 'tipo', 'status', 'volume_estimado'] },
    { name: 'Evento', description: 'Qualquer ação registrada no sistema.', fields: ['id', 'tipo_evento', 'timestamp', 'ator', 'dados'] },
    { name: 'Transação', description: 'Movimentação financeira na UPCL.', fields: ['id', 'conta_id', 'tipo', 'valor', 'status'] },
    { name: 'Contrato', description: 'Acordo de venda ou parceria.', fields: ['id', 'partes', 'objeto', 'valor', 'clausulas'] },
    { name: 'AtivoDigital', description: 'Representação de um ativo real (ex: saca de soja).', fields: ['id', 'tipo', 'lastro_id', 'proprietario'] },
];

export const operations: Operation[] = [
    { operation: 'Montar Projeto', profile: 'Produtor', entity: 'Projeto', rule: 'Validação CAR', evidence: 'Tipo A (Documental)', effect: 'Cria Projeto, Libera Limite' },
    { operation: 'Solicitar Compra', profile: 'Produtor/Operador', entity: 'Pedido', rule: 'Limite de Crédito', evidence: 'Tipo C (Sistema)', effect: 'Debita Limite, Gera Ordem' },
    { operation: 'Entrada Estoque', profile: 'Estoquista', entity: 'ItemEstoque', rule: 'Validação NF', evidence: 'Tipo B (Foto/Documento)', effect: 'Credita Estoque' },
    { operation: 'Cadastro de Animais', profile: 'Técnico/Produtor', entity: 'Animal', rule: 'Validação Brinco', evidence: 'Tipo B (Foto)', effect: 'Cria Ativo Digital' },
    { operation: 'Escalar venda de Lote', profile: 'Produtor', entity: 'Contrato', rule: 'Validação Saldo', evidence: 'Tipo D (Assinatura Digital)', effect: 'Trava Saldo, Gera Escrow' }
];

export const liquidationFlows: LiquidationFlow[] = [
    {
        title: 'Venda de Safra Futura', description: 'Liquidação baseada em marcos de produção agrícola.',
        steps: [
            { name: 'Assinatura do Contrato', completed: true },
            { name: 'Liberação de Crédito (Insumos)', completed: true },
            { name: 'Confirmação de Plantio (Satélite)', completed: false },
            { name: 'Relatório de Colheita', completed: false },
            { name: 'Entrega e Romaneio', completed: false },
            { name: 'Liquidação Final', completed: false }
        ]
    },
    {
        title: 'Venda de Gado para Abate', description: 'Liquidação baseada na entrega e conformidade dos animais.',
        steps: [
            { name: 'Contrato de Venda', completed: true },
            { name: 'Emissão de GTA', completed: true },
            { name: 'Embarque e Transporte', completed: true },
            { name: 'Chegada no Frigorífico', completed: false },
            { name: 'Abate e Classificação de Carcaça', completed: false },
            { name: 'Liberação do Pagamento', completed: false }
        ]
    }
];

export const mockProductionProjects: ProductionProject[] = [
    { id: 'PROJ-001', name: 'Soja Safra 24/25', type: 'Agricultura', status: 'EM ANDAMENTO', volume: '5.000 sc', prazo: 'Mar/25', precoAlvo: 'R$ 130/sc', aReceber: 120500, aPagar: 45200, limiteVigente: 200000, limiteUtilizado: 75000 },
    { id: 'PROJ-002', name: 'Recria Lote A', type: 'Pecuária (Bovinos Corte)', variety: 'Cria', status: 'EM ANDAMENTO', volume: '120 cab', prazo: 'Dez/24', precoAlvo: 'R$ 300/@', aReceber: 250000, aPagar: 80000, limiteVigente: 300000, limiteUtilizado: 150000 },
    { id: 'PROJ-003', name: 'Flores Estufa 1', type: 'Hortifruti', status: 'PLANEJAMENTO', volume: '5.000 vasos', prazo: 'Nov/24', precoAlvo: 'R$ 15/vaso', aReceber: 0, aPagar: 0, limiteVigente: 50000, limiteUtilizado: 0 },
    { id: 'PROJ-004', name: 'Laticínios Lote 1', type: 'Pecuária (Bovinos Leite)', status: 'CONCLUÍDO', volume: '10.000 L', prazo: 'Mai/24', precoAlvo: 'R$ 2,50/L', aReceber: 25000, aPagar: 5000, limiteVigente: 0, limiteUtilizado: 0 },
];

export const mockFinancialDetails: Record<string, FinancialDetails> = {
    'PROJ-001': { projectId: 'PROJ-001', totalCost: 280000, realizedRevenue: 0, futureRevenue: 650000, batches: [] },
    'PROJ-002': { projectId: 'PROJ-002', totalCost: 150000, realizedRevenue: 50000, futureRevenue: 300000, batches: [] },
    'PROJ-003': { projectId: 'PROJ-003', totalCost: 20000, realizedRevenue: 0, futureRevenue: 75000, batches: [] },
    'PROJ-004': { projectId: 'PROJ-004', totalCost: 10000, realizedRevenue: 25000, futureRevenue: 0, batches: [] }
};

export const mockSectorDetails: Record<string, SectorSpecificData> = {
    'PROJ-001': { kpi1Label: 'Estágio Fenológico', kpi1Value: 'V4', kpi2Label: 'Umidade Solo', kpi2Value: '65%', kpi3Label: 'NDVI', kpi3Value: '0.78', alerts: [{ text: 'Alerta de ferrugem na região', severity: 'medium' }], stockLabel: 'Sementes/Defensivos', stockValue: 'R$ 45.000' },
    'PROJ-002': { kpi1Label: 'GMD Médio', kpi1Value: '0.75 kg/dia', kpi2Label: 'Lotação Pasto', kpi2Value: '1.5 UA/ha', kpi3Label: 'Escore Corporal', kpi3Value: '3.5', alerts: [], stockLabel: 'Sal/Ração', stockValue: 'R$ 12.000' },
};

export const mockProjectStages: Record<string, ProjectStage[]> = {
    'PROJ-002': [
        { id: 'cria', label: 'Cria', status: 'COMPLETED' },
        { id: 'recria', label: 'Recria', status: 'ACTIVE' },
        { id: 'engorda', label: 'Engorda', status: 'PLANNED' }
    ]
};

export const mockStageDetails: Record<string, SectorSpecificData> = {
    'recria': { kpi1Label: 'GMD (Recria)', kpi1Value: '0.82 kg/dia', kpi2Label: 'Idade Média', kpi2Value: '18 meses', kpi3Label: 'Peso Médio', kpi3Value: '340 kg', alerts: [], stockLabel: 'Suplemento (Recria)', stockValue: 'R$ 8.000' }
};

export const SECTOR_VARIETIES: Record<string, string[]> = {
    'Agricultura': ['Soja', 'Milho', 'Algodão', 'Café', 'Cana-de-açúcar'],
    'Hortifruti': ['Tomate', 'Alface', 'Morango', 'Batata'],
    'Fruticultura': ['Laranja', 'Maçã', 'Uva', 'Banana', 'Manga'],
    'Pecuária (Bovinos Corte)': ['Cria', 'Recria', 'Engorda', 'Ciclo Completo'],
    'Pecuária (Bovinos Leite)': ['Produção de Leite', 'Criação de Novilhas'],
    'Silvicultura': ['Eucalipto', 'Pinus', 'Teca'],
    'Apicultura': ['Produção de Mel', 'Criação de Rainhas'],
    'Piscicultura': ['Tilápia', 'Tambaqui', 'Camarão'],
    'Avicultura': ['Frango de Corte', 'Poedeiras (Ovos)'],
    'Suinocultura': ['Ciclo Completo', 'Terminação'],
    'Ovinocultura': ['Corte', 'Lã'],
    'Equinocultura': ['Criação', 'Treinamento'],
    'Caprinocultura': ['Leite', 'Corte'],
    'Produção de Sementes': ['Soja', 'Milho', 'Trigo', 'Feijão']
};

export const featureMap: Record<string, { title: string, features: string[] }> = {
    technicianPortal: { title: "Portal do Técnico", features: ["Acompanhamento de Produtores", "Lançamento de Laudos", "Agenda de Visitas"] },
    investorPortal: { title: "Portal do Investidor", features: ["Análise de Oportunidades", "Rentabilidade da Carteira", "Relatórios de Risco"] },
    supplierPortal: { title: "Portal do Fornecedor", features: ["Gestão de Catálogo", "Recebimento de Pedidos", "Controle de Entregas"] },
    finance: { title: "Módulo Financeiro", features: ["Fluxo de Caixa", "Contas a Pagar e Receber", "Conciliação Bancária"] },
    legal: { title: "Módulo Jurídico", features: ["Gestão de Contratos", "Controle de Licenças", "Compliance Ambiental"] }
};

// ... (keep all existing constants up to mockAnimalDetails) ...

export const mockAnimalDetails: Record<string, AnimalProductionDetails> = {
    'PROJ-002': {
        projectId: 'PROJ-002',
        pastures: [
            {
                id: 'pasto01', name: 'Pasto 01 - Maternidade', area: 50, grassHeight: 25, cultivar: 'Brachiaria', estimatedForageProduction: 4000, grazingPeriod: { start: '2024-01-01', end: '2024-12-31' }, entryDate: '2024-01-10', exitDate: '2024-06-30', stockingRate: '1.2 UA/ha', managementRecommendations: [], managementHistory: [],
                animals: [
                    { id: 'M-001', category: 'Matriz', status: 'Prenhez Confirmada' },
                    { id: 'M-002', category: 'Matriz', status: 'Com Cria' },
                    { id: 'C-001', category: 'Bezerro', status: null, motherId: 'M-002' }
                ],
                polygon: [{ x: 10, y: 10 }, { x: 40, y: 10 }, { x: 40, y: 40 }, { x: 10, y: 40 }],
                center: { x: 25, y: 25 }
            },
            {
                id: 'pasto02', name: 'Pasto 02 - Recria', area: 70, grassHeight: 30, cultivar: 'Mombaça', estimatedForageProduction: 6000, grazingPeriod: { start: '2024-01-01', end: '2024-12-31' }, entryDate: '2024-02-15', exitDate: '2024-08-30', stockingRate: '2.5 UA/ha', managementRecommendations: [], managementHistory: [],
                animals: [
                    { id: 'N-055', category: 'Novilha', status: 'Vazia', weight: 320, lastWeighingDate: '2024-05-20' },
                    { id: 'N-056', category: 'Novilha', status: 'Vazia', weight: 315, lastWeighingDate: '2024-05-20' }
                ],
                polygon: [{ x: 50, y: 10 }, { x: 90, y: 10 }, { x: 90, y: 50 }, { x: 50, y: 50 }],
                center: { x: 70, y: 30 }
            }
        ],
        contracts: [
            { id: 'CTR-001', description: 'Venda Futura - Frigorífico Boi Gordo', value: 250000, deadline: '30/11/2024', status: 'VIGENTE', deliveryHistory: [] }
        ]
    }
};

export const mockPropertyData: Property = {
    id: 'PROP-001',
    name: 'Fazenda Boa Esperança',
    carNumber: 'MT-123456-7890',
    totalArea: 1200,
    currentStockingCapacity: 1.5,
    animalCount: 1500,
    pastureManagementHistory: [
        { date: '10/05/2024', action: 'Adubação Nitrogenada', details: '50kg/ha ureia - Pasto 03' },
        { date: '15/04/2024', action: 'Roçada', details: 'Controle de invasoras - Pasto 01' }
    ],
    pastureInvestmentPerHa: 450,
    cattleInvestmentPerHa: 2500,
    infrastructure: [
        { id: 'infra1', type: 'Water', label: 'Bebedouro Central', position: { x: 30, y: 30 }, radiusOfInfluence: 500 },
        { id: 'infra2', type: 'Silo', label: 'Silo Grãos', position: { x: 80, y: 80 } }
    ],
    machinery: [
        { id: 'mac1', type: 'Tractor', label: 'Trator JD 7200', position: { x: 20, y: 20 }, status: 'Active', activity: 'Arando', batteryLevel: 85 },
        { id: 'mac2', type: 'Drone', label: 'Mavic 3M', position: { x: 60, y: 40 }, status: 'Active', activity: 'Mapeamento', batteryLevel: 42 }
    ],
    perimeter: [{ x: 5, y: 5 }, { x: 95, y: 5 }, { x: 95, y: 95 }, { x: 5, y: 95 }],
    satelliteImageUrl: 'https://i.imgur.com/sI13a2s.jpeg',
};

// ... (keep rest of the file unchanged) ...

export const cultivarFactors: CultivarFactor[] = [
    { name: 'Brachiaria brizantha', factor: 1.0 },
    { name: 'Panicum maximum (Mombaça)', factor: 1.5 },
    { name: 'Cynodon (Tifton 85)', factor: 1.8 }
];

export const productFactors: ProductFactor[] = [
    { name: 'Nenhum', factor: 0, performance: 'Manutenção' },
    { name: 'Sal Mineral 80 P', factor: 0.1, performance: '+10% GMD' },
    { name: 'Proteinado Águas', factor: 0.25, performance: '+25% GMD' },
    { name: 'Ração Concentrada 18%', factor: 0.5, performance: '+50% GMD' }
];

export const AVG_WEIGHT_GAIN_PER_UA = 0.6; // kg/day
export const PRICE_PER_KG_LIVE_WEIGHT = 10.50; // R$

export const eventsMatrixData: EventMatrixModule[] = [
    {
        title: 'Módulo Produção',
        events: [
            { event: 'REGISTRO_NASCIMENTO', module: 'PROD', rules: 'RULESET_ANIMAL_REGISTER', locks: 'LOCK_CAR_PENDING', evidence: 'TYPE_A_PHOTO_TAG', stateMachine: 'ANIMAL_LIFECYCLE', collections: 'animals, audit_log' }
        ]
    }
];

export const eventTypesConfig = {
    PRODUCER: ['REGISTER_PLANTING', 'HARVEST_REPORT'],
    FINANCIAL: ['PAYMENT_PROCESSED', 'INVOICE_ISSUED']
};

export const stateMachinesConfig: StateMachineConfig = {
    ANIMAL_LIFECYCLE: ['BORN', 'WEANED', 'FATTENING', 'SOLD'],
    ORDER_LIFECYCLE: ['CREATED', 'PAID', 'SHIPPED', 'DELIVERED']
};

export const permissionsConfig: PermissionsConfig = {
    roles: {
        'Produtor': ['VIEW_DASHBOARD', 'MANAGE_PRODUCTION'],
        'Operador': ['VIEW_TASKS', 'REGISTER_EVENTS']
    }
};

export const firestoreRulesConfig = `
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /projects/{project} {
      allow read: if request.auth != null;
      allow write: if request.auth.token.role == 'Produtor';
    }
  }
}
`;

export const openapiConfig = `
openapi: 3.0.0
info:
  title: Ciclo+ API
  version: 1.0.0
paths:
  /projects:
    get:
      summary: List projects
`;

export const enumsConfig = `
export enum AnimalStatus {
  BORN = 'BORN',
  WEANED = 'WEANED'
}
`;

export const mockSalesOffers: SalesOffer[] = [
    { id: 'SO-001', product: 'Soja em Grãos', quantity: '500 sc', price: 135.50, status: 'ATIVA', date: '01/06/2024' },
    { id: 'SO-002', product: 'Milho Safrinha', quantity: '1000 sc', price: 58.00, status: 'VENDIDO', date: '20/05/2024' }
];

export const mockReceivables: Receivable[] = [
    { 
        id: 'REC-001', 
        origin: 'Venda Lote 45 - Frig. Boi Gordo', 
        value: 125000, 
        dueDate: '15/06/2024', 
        status: 'EM_ESCROW', 
        fiscalEntityId: 'PROP-001-CPF',
        liquidationFlow: {
            title: 'Liquidação Frigorífico',
            description: 'Processo padrão',
            steps: [{ name: 'Abate Confirmado', completed: true }, { name: 'Romaneio Emitido', completed: true }, { name: 'Pagamento Liberado', completed: false }]
        }
    },
    { id: 'REC-002', origin: 'Adiantamento Safra Soja', value: 80000, dueDate: '30/06/2024', status: 'PENDENTE', fiscalEntityId: 'AGRO-LTDA-CNPJ' }
];

export const mockExpenses: Expense[] = [
    { id: 'EXP-001', description: 'Compra de Adubo NPK', supplier: 'AgroFértil', value: 15400, dueDate: '10/06/2024', status: 'A_PAGAR', category: 'Insumos', fiscalEntityId: 'PROP-001-CPF' },
    { id: 'EXP-002', description: 'Manutenção Trator', supplier: 'Oficina Central', value: 2800, dueDate: '05/06/2024', status: 'PAGO', category: 'Manutenção', fiscalEntityId: 'AGRO-LTDA-CNPJ' }
];

export const mockMarketOpportunities: MarketOpportunity[] = [
    { id: 'OPP-001', commodity: 'Soja', buyer: 'Cargill', price: 132.50, unit: 'sc', deliveryWindow: 'Mar/25', minQuantity: '500 sc', location: 'Sorriso-MT' },
    { id: 'OPP-002', commodity: 'Milho', buyer: 'Amaggi', price: 62.00, unit: 'sc', deliveryWindow: 'Jul/24', minQuantity: '1000 sc', location: 'Sinop-MT' },
    { id: 'OPP-003', commodity: 'Boi Gordo', buyer: 'JBS', price: 295.00, unit: '@', deliveryWindow: 'Dez/24', minQuantity: '36 @', location: 'Cuiabá-MT' }
];

export const mockInventoryItems: InventoryItem[] = [
    { id: 'INV-001', name: 'Sal Mineral 80 P', category: 'Insumo', quantity: 45, unit: 'sc', minLevel: 10, location: 'Galpão A', lastUpdated: '01/06/2024' },
    { id: 'INV-002', name: 'Vacina Aftosa', category: 'Medicamento', quantity: 150, unit: 'doses', minLevel: 50, location: 'Geladeira 01', lastUpdated: '20/05/2024' },
    { id: 'INV-003', name: 'Arame Liso', category: 'Ferramenta', quantity: 2, unit: 'rolos', minLevel: 5, location: 'Almoxarifado', lastUpdated: '15/05/2024' },
    { id: 'INV-004', name: 'Diesel S10', category: 'Outro', quantity: 850, unit: 'L', minLevel: 200, location: 'Tanque 01', lastUpdated: '05/06/2024' }
];

export const mockPartnerStores: PartnerStore[] = [
    { id: 'STORE-001', name: 'Agro-Sorriso Ponto de Apoio', location: 'Sorriso, MT' },
    { id: 'STORE-002', name: 'Campo Forte Sinop', location: 'Sinop, MT' },
];

export const mockMarketplaceListings: MarketplaceListing[] = [
    { 
        id: 'MKT-001', 
        productName: 'Adubo NPK 04-14-08', 
        b2bSupplier: 'AgroFértil Indústria', 
        price: 180.00, 
        unit: 'sc 50kg', 
        rating: 4.8, 
        category: 'Fertilizantes', 
        isPartnerStore: true,
        localPartnerStoreId: 'STORE-001',
        localStock: 25,
        b2bStock: 1000,
        deliveryTimeB2B: '3 dias'
    },
    { 
        id: 'MKT-002', 
        productName: 'Semente Soja Intacta', 
        b2bSupplier: 'Sementes Ouro', 
        price: 450.00, 
        unit: 'sc 40kg', 
        rating: 4.9, 
        category: 'Sementes', 
        isPartnerStore: true,
        localPartnerStoreId: 'STORE-001',
        localStock: 10,
        b2bStock: 500,
        deliveryTimeB2B: '5 dias'
    },
    { 
        id: 'MKT-003', 
        productName: 'Glifosato 480', 
        b2bSupplier: 'Defensivos Brasil', 
        price: 65.00, 
        unit: 'L', 
        rating: 4.5, 
        category: 'Defensivos', 
        isPartnerStore: false,
        localPartnerStoreId: 'STORE-001',
        localStock: 0,
        b2bStock: 2000,
        deliveryTimeB2B: '2 dias'
    },
    { 
        id: 'MKT-004', 
        productName: 'Sal Mineral 90', 
        b2bSupplier: 'NutriBoi Indústria', 
        price: 95.00, 
        unit: 'sc 30kg', 
        rating: 4.7, 
        category: 'Nutrição Animal', 
        isPartnerStore: true,
        localPartnerStoreId: 'STORE-002',
        localStock: 50,
        b2bStock: 800,
        deliveryTimeB2B: '4 dias'
    }
];

export const mockCorporateCards: CorporateCard[] = [
    { id: 'CARD-001', holderName: 'João Silva', linkedAccount: 'Conta Principal', last4Digits: '4242', balance: 15000.00, network: 'Ciclo+ Private' },
    { id: 'CARD-002', holderName: 'Maria Souza', linkedAccount: 'Conta Gerência', last4Digits: '8812', balance: 5000.00, network: 'Mastercard' }
];

export const mockLogisticsEntries: LogisticsEntry[] = [
    { id: 'LOG-001', type: 'Entrega', description: 'Entrega de Adubo - Pedido #4521', origin: 'AgroFértil (Sorriso)', destination: 'Fazenda Boa Esperança', date: 'Hoje, 14:00', status: 'EM_TRANSITO', driver: 'Carlos Lima', plate: 'QRA-1234' },
    { id: 'LOG-002', type: 'Coleta', description: 'Coleta de Lote - 45 Cabeças', origin: 'Fazenda Boa Esperança', destination: 'Frigorífico Boi Gordo', date: 'Amanhã, 08:00', status: 'AGENDADO' }
];

export const mockManagementAlerts: ManagementAlert[] = [
    { id: 'ALT-001', target: 'Pasto 01', type: 'Nutrition', message: 'Reposição de Sal Mineral necessária', reason: 'Estoque estimado acabou', severity: 'WARNING', dueDate: 'Hoje' },
    { id: 'ALT-002', target: 'Lote 03', type: 'Health', message: 'Reforço Vacina Aftosa', reason: 'Calendário Sanitário', severity: 'CRITICAL', dueDate: 'Em 2 dias' },
    { id: 'ALT-003', target: 'Talhão 05', type: 'Agriculture', message: 'Monitoramento de Pragas', reason: 'Alerta Regional', severity: 'INFO', dueDate: 'Semana que vem' }
];

export const mockManagementHistory: ManagementRecord[] = [
    { id: 'HIST-001', date: '01/06/2024', target: 'Pasto 02', actionType: 'Alimentação', product: 'Sal Proteinado', quantity: '5 sc', executor: 'José Silva' },
    { id: 'HIST-002', date: '28/05/2024', target: 'Lote 01', actionType: 'Vacinação', product: 'Raiva', quantity: '120 doses', executor: 'Dr. Marcos' }
];

// UPDATED FOR BLIND INTEGRATION LOGIC
export const mockIntegratedProducers: IntegratedProducer[] = [
    { id: 'INT-001', maskedName: 'Produtor Certificado #492', region: 'Médio Norte - MT (Raio 100km)', productionType: 'Cria', status: 'Disponível', capacity: '500 bezerros/ano', auditScore: 98, lastAuditDate: '10/05/2024' },
    { id: 'INT-002', maskedName: 'Produtor Certificado #221', region: 'Médio Norte - MT (Raio 150km)', productionType: 'Recria', status: 'Negociando', capacity: '800 cabeças (Pasto)', auditScore: 92, lastAuditDate: '01/06/2024' },
    { id: 'INT-003', maskedName: 'Produtor Certificado #885', region: 'Sul - MT (Raio 200km)', productionType: 'Engorda', status: 'Disponível', capacity: '1.200 cabeças (Confinamento)', auditScore: 99, lastAuditDate: 'Hoje' },
    { id: 'INT-004', maskedName: 'Produtor Certificado #102', region: 'Oeste - BA (Raio 50km)', productionType: 'Agricultura', status: 'Contratado', capacity: '2.000 sacas Soja', auditScore: 100, lastAuditDate: '15/05/2024' }
];

export const mockPartnershipOffers: PartnershipOffer[] = [
    { 
        id: 'OFF-001', 
        title: 'Aquisição de Bezerros (Nelore Padrão)', 
        description: 'Demanda para compra de 5.000 cabeças para recria. Contrato de 12 meses com preço indexado.', 
        type: 'Integração Vertical', 
        status: 'Aberta', 
        applicants: 12 
    },
    { 
        id: 'OFF-002', 
        title: 'Fomento Nutricional (Troca por @)', 
        description: 'Fornecimento de nutrição para terminação em troca de preferência de compra no abate.', 
        type: 'Fomento (Insumos)', 
        status: 'Aberta', 
        applicants: 45 
    }
];

export const mockIntegratorMessages: IntegratorMessage[] = [
    { id: 'MSG-001', from: 'Integradora', to: 'All', content: 'Prezados, o prazo para envio dos laudos sanitários encerra na sexta-feira.', date: 'Hoje, 09:00', isUrgent: true },
    { id: 'MSG-002', from: 'Fazenda Alvorada', to: 'Integradora', content: 'Solicito visita técnica para avaliação do lote 4.', date: 'Ontem, 16:30', isUrgent: false }
];

// ... (keep rest of constants) ...
export const mockEmployees: Employee[] = [
    { id: 'EMP-001', name: 'José Silva', role: 'Capataz', type: 'CLT', status: 'Ativo', monthlySalary: 4500 },
    { id: 'EMP-002', name: 'Maria Oliveira', role: 'Cozinheira', type: 'CLT', status: 'Ativo', monthlySalary: 2800 },
    { id: 'EMP-003', name: 'Carlos Souza', role: 'Tratorista', type: 'Temporário', status: 'Ativo', hourlyRate: 45 }
];

export const mockTimeRecords: TimeRecord[] = [
    { id: 'TR-001', employeeId: 'EMP-003', date: '05/06/2024', hours: 8.5, activity: 'Plantio Talhão 2', status: 'Aprovado' },
    { id: 'TR-002', employeeId: 'EMP-003', date: '04/06/2024', hours: 9.0, activity: 'Manutenção Cerca', status: 'Pendente' }
];

export const mockPayroll: PayrollEntry[] = [
    { id: 'PAY-001', employeeId: 'EMP-001', period: 'Maio/2024', amount: 4500, status: 'Pago', dueDate: '05/06/2024' },
    { id: 'PAY-002', employeeId: 'EMP-003', period: 'Semana 22', amount: 1850, status: 'Pendente', dueDate: '07/06/2024' }
];

export const mockPPEOrders: PPEOrder[] = [
    { id: 'PPE-001', requesterId: 'EMP-003', items: 'Luvas, Óculos de Proteção', date: '01/06/2024', status: 'Entregue', conformityDoc: true },
    { id: 'PPE-002', requesterId: 'EMP-001', items: 'Botina Segurança', date: '20/05/2024', status: 'Entregue', conformityDoc: true }
];

export const mockMarketTrends: MarketTrend[] = [
    { commodity: 'Soja', price: 135.20, unit: 'sc 60kg', trend: 'up', change: '+1.2%' },
    { commodity: 'Milho', price: 58.50, unit: 'sc 60kg', trend: 'down', change: '-0.5%' },
    { commodity: 'Boi Gordo', price: 295.00, unit: '@', trend: 'stable', change: '0.0%' },
    { commodity: 'Algodão', price: 145.00, unit: '@', trend: 'up', change: '+0.8%' }
];

export const mockRegionalStats: AggregatedStat[] = [
    { label: 'Área Monitorada', value: '450.000 ha', description: 'Total na região' },
    { label: 'Safra Soja 23/24', value: '98% Plantado', description: 'Dentro da janela ideal' },
    { label: 'Volume Negociado', value: 'R$ 2.5 Bi', description: 'Últimos 12 meses' },
    { label: 'Previsão Chuva', value: '35mm', description: 'Próximos 5 dias' }
];

export const mockNewsItems: NewsItem[] = [
    { id: 'NEWS-001', title: 'Exportações de Soja batem recorde em Maio', summary: 'Volume embarcado supera em 15% o mesmo período do ano passado, impulsionado pela demanda asiática.', source: 'AgroNews', date: '2h atrás', category: 'Mercado' },
    { id: 'NEWS-002', title: 'Frente Fria deve atingir o Sul na próxima semana', summary: 'Meteorologia alerta para risco de geada em áreas de baixada no RS e SC.', source: 'ClimaTempo', date: '5h atrás', category: 'Clima' },
    { id: 'NEWS-003', title: 'Nova tecnologia de drones promete reduzir uso de defensivos', summary: 'Aplicação localizada via IA pode gerar economia de até 40% nos custos.', source: 'TechAgro', date: '1d atrás', category: 'Tecnologia' }
];

export const mockAuctionListings: AuctionListing[] = [
    { id: 'AUC-001', title: 'Leilão Elite Genética Nelore', date: '15/06/2024', location: 'Uberaba, MG', category: 'Gado de Corte', lotCount: 45, organizer: 'Programa Leilões', status: 'Agendado' },
    { id: 'AUC-002', title: 'Leilão Virtual Gado de Corte', date: 'Hoje', location: 'Online', category: 'Gado de Corte', lotCount: 120, organizer: 'Estância Bahia', status: 'Em Andamento' }
];

export const mockMarketSaturation: MarketSaturation[] = [
    { id: 'SAT-001', commodity: 'Soja', totalDemand: 1000000, currentProduction: 850000, unit: 'ton', riskLevel: 'Balanced', projectedPriceDrop: '-2%', maxSafePrice: 140.00, averageContractPrice: 132.00, averageRealizedPrice: 128.00, marketAveragePrice: 135.00 },
    { id: 'SAT-002', commodity: 'Milho', totalDemand: 800000, currentProduction: 950000, unit: 'ton', riskLevel: 'Oversupply', projectedPriceDrop: '-15%', maxSafePrice: 65.00, averageContractPrice: 55.00, averageRealizedPrice: 60.00, marketAveragePrice: 58.00 }
];

export const mockUsers: User[] = [
    { name: 'João Silva', role: 'Produtor' },
    { name: 'Maria Souza', role: 'Gestor' },
    { name: 'Carlos Lima', role: 'Técnico' },
    { name: 'Ana Pereira', role: 'Investidor' },
    { name: 'Pedro Santos', role: 'Fornecedor' },
    { name: 'Sementes Agro', role: 'Produtor de Sementes' },
    { name: 'AgroCorp', role: 'Integradora' },
    { name: 'José da Silva', role: 'Operador' }
];

export const mockOperatorRequests: OperatorRequest[] = [
    {
        id: 'REQ-001',
        type: 'PURCHASE',
        item: 'Sal Mineral 80kg',
        quantity: '20 sacas',
        priority: 'HIGH',
        requester: 'José da Silva (Capataz)',
        date: 'Hoje, 07:30',
        status: 'PENDING'
    },
    {
        id: 'REQ-002',
        type: 'MAINTENANCE',
        item: 'Trator John Deere - Troca de Óleo',
        priority: 'MEDIUM',
        requester: 'Marcos Oliveira',
        date: 'Ontem, 16:00',
        status: 'APPROVED'
    },
    {
        id: 'REQ-003',
        type: 'PURCHASE',
        item: 'Arame Liso',
        quantity: '5 rolos',
        priority: 'LOW',
        requester: 'José da Silva (Capataz)',
        date: '2 dias atrás',
        status: 'REJECTED'
    }
];

export const mockAuditEvents: AuditEvent[] = [
    { id: 'AUD-001', timestamp: '07/06/2024 10:30:45', actor: 'José da Silva', action: 'PESAGEM', details: 'Pesagem Individual - Lote 03', geolocation: '-12.93, -52.11', hash: '8f9d...a1b2', verified: true, proofUrl: 'https://via.placeholder.com/150' },
    { id: 'AUD-002', timestamp: '07/06/2024 09:15:20', actor: 'Sistema IoT', action: 'TELEMETRIA', details: 'Leitura Silo 01 - Nível 45%', geolocation: '-12.93, -52.11', hash: '3c4e...f5a1', verified: true },
    { id: 'AUD-003', timestamp: '06/06/2024 16:45:00', actor: 'Maria Souza', action: 'APROVAÇÃO', details: 'Aprovação Pedido #REQ-002', geolocation: 'Remoto (IP 192.168...)', hash: '7b2a...9c8d', verified: true }
];

export const mockOperatorTasks: OperatorTask[] = [
    { id: 'TSK-001', title: 'Vacinação Lote 03', executor: 'José da Silva', timestamp: 'Hoje, 09:30', status: 'PENDING_REVIEW', proofType: 'PHOTO', details: 'Vacina Aftosa aplicada em 120 cabeças', geolocation: '-12.93, -52.11' },
    { id: 'TSK-002', title: 'Conserto Cerca Pasto 1', executor: 'Marcos Oliveira', timestamp: 'Ontem, 16:00', status: 'COMPLETED', proofType: 'PHOTO', details: 'Substituição de 3 postes e arame esticado', geolocation: '-12.93, -52.11' },
    { id: 'TSK-003', title: 'Ronda Noturna', executor: 'José da Silva', timestamp: 'Ontem, 22:00', status: 'COMPLETED', proofType: 'GPS', details: 'Ronda perimetral concluída sem ocorrências', geolocation: '-12.93, -52.11' }
];

export const mockStockMovements: StockMovement[] = [
    { id: 'MOV-001', itemId: 'INV-001', itemName: 'Sal Mineral 80 P', type: 'INBOUND_PURCHASE', quantity: 50, unit: 'sc', date: '01/06/2024', status: 'COMPLETED', requester: 'José Silva', invoiceNumber: 'NF-12345' },
    { id: 'MOV-002', itemId: 'INV-001', itemName: 'Sal Mineral 80 P', type: 'OUTBOUND_USAGE', quantity: 5, unit: 'sc', date: '05/06/2024', status: 'AUDITED', requester: 'Operação Campo' },
    { id: 'MOV-003', itemId: 'INV-003', itemName: 'Arame Liso', type: 'OUTBOUND_LOSS', quantity: 1, unit: 'rolo', date: '02/06/2024', status: 'AUDITED', requester: 'Marcos Oliveira', reason: 'Dano chuva', proofUrl: 'https://via.placeholder.com/150' },
    { id: 'MOV-004', itemId: 'INV-004', itemName: 'Diesel S10', type: 'INBOUND_PURCHASE', quantity: 1000, unit: 'L', date: 'Hoje', status: 'INVOICE_REQUIRED', requester: 'José Silva' }
];

// UPCL / ASAAS FINANCIAL MOCK DATA
export const mockBankAccounts: Record<string, BankAccount> = {
    'Produtor': {
        id: 'ACC-PROD-001',
        userId: 'Produtor',
        provider: 'ASAAS',
        accountNumber: '40291-1',
        agency: '0001',
        balance: 45200.50,
        blockedBalance: 125000.00, // Escrow
        holderName: 'João Silva (Fazenda Boa Esperança)',
        holderDoc: '123.456.789-00'
    },
    'Técnico': {
        id: 'ACC-TECH-002',
        userId: 'Técnico',
        provider: 'ASAAS',
        accountNumber: '39221-X',
        agency: '0001',
        balance: 3850.00,
        blockedBalance: 0,
        holderName: 'Carlos Lima (Veterinário)',
        holderDoc: '987.654.321-11'
    },
    'Operador': {
        id: 'ACC-OP-003',
        userId: 'Operador',
        provider: 'ASAAS',
        accountNumber: '11293-9',
        agency: '0001',
        balance: 1250.00,
        blockedBalance: 0,
        holderName: 'José da Silva',
        holderDoc: '111.222.333-44'
    }
};

export const mockTransactions: Transaction[] = [
    { id: 'TRX-001', accountId: 'ACC-PROD-001', type: 'SALE', description: 'Venda Lote 45 (Sinal)', amount: 15000.00, date: '01/06/2024', status: 'COMPLETED', counterparty: 'Frigorífico Boi Gordo' },
    { id: 'TRX-002', accountId: 'ACC-PROD-001', type: 'PURCHASE', description: 'Compra Marketplace #9921', amount: -450.00, date: '05/06/2024', status: 'COMPLETED', counterparty: 'AgroFértil' },
    { id: 'TRX-003', accountId: 'ACC-TECH-002', type: 'COMMISSION', description: 'Comissão Laudo Sanitário', amount: 350.00, date: '02/06/2024', status: 'COMPLETED', counterparty: 'Sistema (Split)' },
    { id: 'TRX-004', accountId: 'ACC-OP-003', type: 'PIX_IN', description: 'Pagamento Diária', amount: 150.00, date: '03/06/2024', status: 'COMPLETED', counterparty: 'Fazenda Boa Esperança' },
    { id: 'TRX-005', accountId: 'ACC-PROD-001', type: 'SPLIT', description: 'Taxa Plataforma', amount: -22.50, date: '01/06/2024', status: 'COMPLETED', counterparty: 'Ciclo+' }
];

// --- CARBON MARKET MOCK DATA ---
export const mockSustainablePractices: SustainablePractice[] = [
    { id: 'P01', name: 'Plantio Direto', description: 'Minimiza o revolvimento do solo, mantendo a cobertura de palhada.', sequestrationFactor: 1.5 },
    { id: 'P02', name: 'Recuperação de Pastagem Degradada', description: 'Melhora a qualidade do solo e a capacidade de lotação.', sequestrationFactor: 2.5 },
    { id: 'P03', name: 'Integração Lavoura-Pecuária-Floresta (ILPF)', description: 'Sistema integrado que otimiza o uso da terra.', sequestrationFactor: 4.0 },
];

export const mockCarbonProjects: CarbonProject[] = [
    { id: 'CP001', name: 'Plantio Direto - Safra 24/25', practiceId: 'P01', area: 250, startDate: '01/10/2024', status: 'ATIVO', estimatedSequestration: 375 },
    { id: 'CP002', name: 'Recuperação Pasto 04', practiceId: 'P02', area: 80, startDate: '01/03/2024', status: 'EM_VERIFICACAO', estimatedSequestration: 200 },
    { id: 'CP003', name: 'Projeto ILPF - Gleba C', practiceId: 'P03', area: 120, startDate: '15/05/2023', status: 'VERIFICADO', estimatedSequestration: 480 },
];

export const mockCarbonCredits: CarbonCredit[] = [
    { id: 'CC001', projectId: 'CP003', vintage: 2023, quantity: 480, status: 'DISPONIVEL', certificateHash: '0x8a2b...c9f1' },
    { id: 'CC002', projectId: 'CP002', vintage: 2024, quantity: 200, status: 'EM_NEGOCIACAO', certificateHash: '0x3d1e...a4b6' },
];

// --- SUPPLIER PORTAL MOCK DATA ---
export const mockSupplierOrders: SupplierOrder[] = [
  { id: 'ORD-S001', customer: 'Fazenda Boa Esperança', items: [{ productName: 'Adubo NPK 04-14-08', quantity: 10 }], totalValue: 1800.00, date: '05/06/2024', status: 'PENDENTE' },
  { id: 'ORD-S002', customer: 'Sítio Santo Antônio', items: [{ productName: 'Semente Soja Intacta', quantity: 5 }], totalValue: 2250.00, date: '04/06/2024', status: 'ENVIADO' },
  { id: 'ORD-S003', customer: 'Fazenda Água Limpa', items: [{ productName: 'Glifosato 480', quantity: 20 }], totalValue: 1300.00, date: '01/06/2024', status: 'ENTREGUE' },
];

export const mockSupplierFinancials: SupplierFinancialSummary[] = [
    { month: 'Maio/2024', totalSales: 48200.00, platformFees: 2410.00, netPayout: 45790.00, status: 'PAGO' },
    { month: 'Junho/2024', totalSales: 15300.00, platformFees: 765.00, netPayout: 14535.00, status: 'A PAGAR' },
];

// --- SEED PRODUCER MOCK DATA ---
export const mockSeedFields: SeedField[] = [
    { id: 'SF-01', name: 'Campo 01A', variety: 'Soja TMG 7062 IPRO', generation: 'C1', area: 50, status: 'FLORACAO', expectedYield: 65 },
    { id: 'SF-02', name: 'Campo 02B', variety: 'Milho AG 8700 PRO4', generation: 'S1', area: 80, status: 'CRESCIMENTO', expectedYield: 180 },
    { id: 'SF-03', name: 'Campo 03', variety: 'Soja TMG 7062 IPRO', generation: 'C2', area: 60, status: 'COLHEITA', expectedYield: 68 },
];

export const mockCertificationProcess: CertificationStep[] = [
    { name: 'Inscrição de Campo', status: 'APROVADO', date: '10/10/2023' },
    { name: 'Vistoria de Floração', status: 'APROVADO', date: '20/12/2023' },
    { name: 'Vistoria de Pré-Colheita', status: 'EM_ANALISE' },
    { name: 'Teste de Germinação e Vigor', status: 'PENDENTE' },
    { name: 'Emissão do Certificado', status: 'PENDENTE' },
];

export const mockSeedLots: SeedLot[] = [
    { id: 'LOT-S-001', fieldId: 'SF-03', variety: 'Soja TMG 7062 IPRO', generation: 'C2', quantity: 3500, germinationRate: 98, purity: 99.5, storageLocation: 'Silo 05' },
    { id: 'LOT-S-002', fieldId: 'SF-03', variety: 'Soja TMG 7062 IPRO', generation: 'C2', quantity: 500, germinationRate: 95, purity: 99.2, storageLocation: 'Silo 05 (Bag)' },
];
