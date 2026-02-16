
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

export const productFactors: ProductFactor[] = [
    { name: 'Nenhum', factor: 0, performance: 'Manutenção' },
    { name: 'Sal Mineral 80 P', factor: 0.1, performance: '+10% GMD' },
    { name: 'Proteinado Águas', factor: 0.25, performance: '+25% GMD' },
    { name: 'Ração Concentrada 18%', factor: 0.5, performance: '+50% GMD' }
];

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
    technicianPortal: { title: 'Portal do Técnico', features: ['Acompanhamento de Produtores', 'Lançamento de Laudos', 'Agenda de Visitas'] },
    investorPortal: { title: 'Portal do Investidor', features: ['Análise de Oportunidades', 'Rentabilidade da Carteira', 'Relatórios de Risco'] },
    supplierPortal: { title: 'Portal do Fornecedor', features: ['Gestão de Catálogo', 'Recebimento de Pedidos', 'Controle de Entregas'] },
    finance: { title: 'Módulo Financeiro', features: ['Fluxo de Caixa', 'Contas a Pagar e Receber', 'Conciliação Bancária'] },
    legal: { title: 'Módulo Jurídico', features: ['Gestão de Contratos', 'Controle de Licenças', 'Compliance Ambiental'] }
};

export const cultivarFactors: CultivarFactor[] = [
    { name: 'Brachiaria brizantha', factor: 1.0 },
    { name: 'Panicum maximum (Mombaça)', factor: 1.5 },
    { name: 'Cynodon (Tifton 85)', factor: 1.8 }
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
