
import { ProductionSector, ViewType } from '../types';

export interface SectorConfig {
    labels: {
        liveHandling: string; // Name of the live operation module
        management: string;   // Name of the task management module
        unit: string;         // What is a single unit? (Animal, Hectare, Tank)
        group: string;        // What is a group? (Herd, Plot, Batch)
    };
    managementTabs: string[]; // Tabs in Management View
    liveHandling: {
        title: string;
        primaryInput: string; // e.g., "Weight", "pH", "Moisture"
        primaryUnit: string;  // e.g., "kg", "pH", "%"
        actions: string[];
    };
    // NAVIGATION: Defines the menu structure for this sector
    navigation: {
        view: ViewType;
        label: string;
    }[];
    // STRICT BARRIER: Only these views will be visible in the sidebar when this sector is active
    supportedViews: ViewType[];
}

// Global views that are always allowed regardless of sector if the Role permits.
const GLOBAL_VIEWS: ViewType[] = [
    'dashboard', 'integrations', 'architecture', 'dataDictionary',
    'operations', 'flows', 'eventsMatrix', 'systemConfig',
    'producerPortal', 'operatorPortal', 'technicianPortal',
    'investorPortal', 'supplierPortal', 'integratorPortal',
    'financials', 'sales', 'contracts', 'workforceEmployees', 'workforceTime', 'workforcePayroll', 'workforcePpe', 'workforceOperatorAccess', 'propertyRegistration', // Core modules usually available to all
    'commercial', 'logistics', 'logisticsPortal', 'auctionPortal', 'legal', 'finance', 'stock', 'aiAnalysis',
    'reports', 'fieldOperations', 'carbonMarket', 'customInputRequest'
];

const MILK_COMPATIBLE_SECTORS = new Set<ProductionSector>(['Pecu\u00E1ria (Bovinos Leite)']);
const ACTIVITY_CONTEXT_ALWAYS_VISIBLE_VIEWS: ViewType[] = [
    'dashboard',
    'propertyRegistration',
    'workforceEmployees',
    'workforceTime',
    'workforcePayroll',
    'workforcePpe',
    'workforceOperatorAccess',
    'integrations',
    'screenFlows',
    'externalMarketplace',
];

export const getSectorSettings = (sector: ProductionSector | undefined): SectorConfig => {
    if (!sector) {
        // Default / Fallback (Consolidated View / Holding)
        return {
            labels: { liveHandling: 'Manejo Rapido', management: 'Atividades', unit: 'Item', group: 'Lote' },
            managementTabs: ['Geral', 'Manutencao', 'Outros'],
            liveHandling: { title: 'Execucao Operacional', primaryInput: 'Valor', primaryUnit: '-', actions: ['Registrar'] },
            navigation: [
                { view: 'dashboard', label: 'Visao Consolidada' },
                { view: 'financials', label: 'Financeiro Holding' },
                { view: 'reports', label: 'Relatorios Gerenciais' },
                { view: 'sales', label: 'Comercial & Vendas' },
                { view: 'contracts', label: 'Gestao de Contratos' },
                { view: 'workforceEmployees', label: 'RH - Colaboradores' },
                { view: 'propertyRegistration', label: 'Propriedades' },
                { view: 'carbonMarket', label: 'Mercado de Carbono' },
            ],
            supportedViews: [...GLOBAL_VIEWS, 'liveHandling', 'management', 'futureMarket']
        };
    }

    switch (sector) {
        case 'Agricultura':
        case 'Silvicultura':
            return {
                labels: { liveHandling: 'Monitoramento de Campo', management: 'Tratos Culturais', unit: 'Talhao', group: 'Safra' },
                managementTabs: ['Plantio', 'Pulverizacao', 'Colheita', 'Adubacao'],
                liveHandling: {
                    title: 'Monitoramento de Safra',
                    primaryInput: 'Umidade/Estagio',
                    primaryUnit: '%',
                    actions: ['Registrar Praga', 'Medir Umidade', 'Finalizar Talhao']
                },
                navigation: [
                    { view: 'dashboard', label: 'Painel da Safra' },
                    { view: 'liveHandling', label: 'Monitoramento de Campo' }, // Adapted Label
                    { view: 'management', label: 'Tratos Culturais' }, // Adapted Label
                    { view: 'fieldOperations', label: 'Operacoes de Maquinas' },
                    { view: 'carbonMarket', label: 'Mercado de Carbono' },
                    { view: 'reports', label: 'Produtividade & Insumos' },
                    { view: 'stock', label: 'Estoque de Insumos' },
                    { view: 'futureMarket', label: 'Mercado Futuro (Commodities)' },
                    { view: 'sales', label: 'Venda de Safra' },
                    { view: 'financials', label: 'Custos da Safra' },
                    { view: 'propertyRegistration', label: 'Mapa de Talhoes' },
                ],
                supportedViews: [...GLOBAL_VIEWS, 'management', 'futureMarket', 'liveHandling']
            };
        case 'Hortifruti':
        case 'Fruticultura':
            return {
                labels: { liveHandling: 'Classificacao & Packing', management: 'Manejo de Horta/Pomar', unit: 'Canteiro/Estufa', group: 'Lote' },
                managementTabs: ['Irrigacao', 'Nutricao', 'Colheita', 'Poda'],
                liveHandling: {
                    title: 'Colheita e Classificacao',
                    primaryInput: 'Peso Colhido',
                    primaryUnit: 'kg',
                    actions: ['Registrar Caixa', 'Descarte', 'Controle Qualidade']
                },
                navigation: [
                    { view: 'dashboard', label: 'Painel da Producao' },
                    { view: 'liveHandling', label: 'Colheita & Packing' },
                    { view: 'management', label: 'Manejo Diario' },
                    { view: 'fieldOperations', label: 'Tarefas de Campo' },
                    { view: 'stock', label: 'Embalagens & Insumos' },
                    { view: 'sales', label: 'Venda Mercado Consumidor (Atacadista Direto / Mercados)' },
                    { view: 'financials', label: 'Fluxo de Caixa' },
                ],
                supportedViews: [...GLOBAL_VIEWS, 'management', 'liveHandling']
            };
        case 'Pecuária (Bovinos Corte)':
        case 'Pecuária (Bovinos Leite)':
        case 'Ovinocultura':
        case 'Caprinocultura':
        case 'Suinocultura':
        case 'Equinocultura':
            return {
                labels: { liveHandling: 'Curral Inteligente', management: 'Manejo Sanitario/Nutricional', unit: 'Animal', group: 'Lote/Pasto' },
                managementTabs: ['Nutricao', 'Sanidade', 'Reproducao', 'Movimentacao'],
                liveHandling: {
                    title: 'Manejo no Curral',
                    primaryInput: 'Peso',
                    primaryUnit: 'kg',
                    actions: ['Vacinar', 'Apartar', 'Pesagem', 'Vermifugar']
                },
                navigation: [
                    { view: 'dashboard', label: 'Painel do Rebanho' },
                    { view: 'liveHandling', label: 'Manejo no Curral' },
                    { view: 'management', label: 'Sanidade & Nutricao' },
                    { view: 'customInputRequest', label: 'Insumo Personalizado' },
                    { view: 'fieldOperations', label: 'OperaÃ§Ãµes de Campo' },
                    { view: 'carbonMarket', label: 'Mercado de Carbono' },
                    { view: 'reports', label: 'GMD & Desempenho' },
                    { view: 'stock', label: 'Farmacia & Racao' },
                    { view: 'futureMarket', label: 'Mercado Futuro (@)' },
                    { view: 'sales', label: 'Venda de Animais' },
                    { view: 'financials', label: 'Custos por Cabeca' },
                    { view: 'propertyRegistration', label: 'Mapa de Pastos' },
                ],
                supportedViews: [...GLOBAL_VIEWS, 'management', 'liveHandling', 'futureMarket']
            };
        case 'Piscicultura':
            return {
                labels: { liveHandling: 'Biometria e Agua', management: 'Manejo de Tanques', unit: 'Tanque', group: 'Lote' },
                managementTabs: ['Qualidade Agua', 'Arracoamento', 'Despesca', 'Sanidade'],
                liveHandling: {
                    title: 'Analise de Tanque',
                    primaryInput: 'Oxigenio/pH',
                    primaryUnit: 'mg/L',
                    actions: ['Medir O2', 'Medir pH', 'Biometria (Peso Medio)', 'Arracoar']
                },
                navigation: [
                    { view: 'dashboard', label: 'Painel dos Tanques' },
                    { view: 'liveHandling', label: 'Qualidade da Agua' },
                    { view: 'management', label: 'Alimentacao & Biometria' },
                    { view: 'reports', label: 'Conversao Alimentar' },
                    { view: 'stock', label: 'RaÃ§Ã£o & Quimicos' },
                    { view: 'sales', label: 'Venda (Frigorifico)' },
                ],
                supportedViews: [...GLOBAL_VIEWS, 'management', 'liveHandling']
            };
        case 'Avicultura':
            return {
                labels: { liveHandling: 'Coleta e Pesagem', management: 'Manejo Aviario', unit: 'Galpao', group: 'Lote' },
                managementTabs: ['Ambiencia', 'Mortalidade', 'Coleta Ovos', 'Nutricao'],
                liveHandling: {
                    title: 'Diario do Aviario',
                    primaryInput: 'Mortalidade',
                    primaryUnit: 'aves',
                    actions: ['Coleta Ovos', 'Reg. Mortalidade', 'Temp/Umidade']
                },
                navigation: [
                    { view: 'dashboard', label: 'Painel dos Galpoes' },
                    { view: 'liveHandling', label: 'Diario de Mortalidade' },
                    { view: 'management', label: 'Controle de Ambiencia' },
                    { view: 'reports', label: 'Performance do Lote' },
                    { view: 'stock', label: 'RaÃ§Ã£o & Vacinas' },
                ],
                supportedViews: [...GLOBAL_VIEWS, 'management', 'liveHandling']
            };
        case 'Apicultura':
            return {
                labels: { liveHandling: 'Revisao de Colmeia', management: 'Manejo Apiario', unit: 'Colmeia', group: 'Apiario' },
                managementTabs: ['Alimentacao', 'Sanidade', 'Colheita Mel', 'Rainhas'],
                liveHandling: {
                    title: 'Inspecao de Campo',
                    primaryInput: 'Quadros Mel',
                    primaryUnit: 'un',
                    actions: ['Troca Cera', 'Alimentar', 'Colher']
                },
                navigation: [
                    { view: 'dashboard', label: 'Painel do Apiario' },
                    { view: 'liveHandling', label: 'Revisao de Colmeias' },
                    { view: 'management', label: 'Producao de Mel' },
                    { view: 'stock', label: 'Material & Cera' },
                ],
                supportedViews: [...GLOBAL_VIEWS, 'management', 'liveHandling']
            };
        default:
            return {
                labels: { liveHandling: 'Operacao', management: 'Tarefas', unit: 'Unidade', group: 'Grupo' },
                managementTabs: ['Geral', 'Manutencao'],
                liveHandling: { title: 'Registro', primaryInput: 'Valor', primaryUnit: '-', actions: ['Registrar'] },
                navigation: [
                    { view: 'dashboard', label: 'Painel Geral' },
                    { view: 'management', label: 'Atividades' },
                    { view: 'financials', label: 'Financeiro' },
                ],
                supportedViews: [...GLOBAL_VIEWS, 'management', 'liveHandling']
            };
    }
};

export const isMilkModuleSupportedBySector = (sector: ProductionSector | undefined): boolean =>
    Boolean(sector && MILK_COMPATIBLE_SECTORS.has(sector));

export const resolveActivityScopedViews = (sector: ProductionSector | undefined): ViewType[] => {
    const sectorSettings = getSectorSettings(sector);
    const allowed = new Set<ViewType>([
        ...ACTIVITY_CONTEXT_ALWAYS_VISIBLE_VIEWS,
        ...sectorSettings.navigation.map((entry) => entry.view),
    ]);

    if (isMilkModuleSupportedBySector(sector)) {
        allowed.add('milkControl');
    }

    return Array.from(allowed);
};
