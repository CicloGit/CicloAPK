
import { ProductionSector, ViewType } from '../types';
import FlaskIcon from '../components/icons/FlaskIcon';

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

// Global views that are always allowed regardless of sector if the Role permits
const GLOBAL_VIEWS: ViewType[] = [
    'dashboard', 'integrations', 'architecture', 'dataDictionary', 
    'operations', 'flows', 'eventsMatrix', 'systemConfig', 
    'producerPortal', 'operatorPortal', 'technicianPortal', 
    'investorPortal', 'supplierPortal', 'integratorPortal',
    'financials', 'sales', 'contracts', 'workforce', 'propertyRegistration', // Core modules usually available to all
    'commercial', 'logistics', 'legal', 'finance', 'stock', 'aiAnalysis', 
    'reports', 'fieldOperations', 'carbonMarket', 'customInputRequest'
];

export const getSectorSettings = (sector: ProductionSector | undefined): SectorConfig => {
    if (!sector) {
        // Default / Fallback (Consolidated View / Holding)
        return {
            labels: { liveHandling: 'Manejo RÃ¡pido', management: 'Atividades', unit: 'Item', group: 'Lote' },
            managementTabs: ['Geral', 'ManutenÃ§Ã£o', 'Outros'],
            liveHandling: { title: 'ExecuÃ§Ã£o Operacional', primaryInput: 'Valor', primaryUnit: '-', actions: ['Registrar'] },
            navigation: [
                { view: 'dashboard', label: 'VisÃ£o Consolidada' },
                { view: 'financials', label: 'Financeiro Holding' },
                { view: 'reports', label: 'RelatÃ³rios Gerenciais' },
                { view: 'sales', label: 'Comercial & Vendas' },
                { view: 'contracts', label: 'GestÃ£o de Contratos' },
                { view: 'workforce', label: 'Equipe & RH' },
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
                labels: { liveHandling: 'Monitoramento de Campo', management: 'Tratos Culturais', unit: 'TalhÃ£o', group: 'Safra' },
                managementTabs: ['Plantio', 'PulverizaÃ§Ã£o', 'Colheita', 'AdubaÃ§Ã£o'],
                liveHandling: { 
                    title: 'Monitoramento de Safra', 
                    primaryInput: 'Umidade/EstÃ¡gio', 
                    primaryUnit: '%', 
                    actions: ['Registrar Praga', 'Medir Umidade', 'Finalizar TalhÃ£o'] 
                },
                navigation: [
                    { view: 'dashboard', label: 'Painel da Safra' },
                    { view: 'liveHandling', label: 'Monitoramento de Campo' }, // Adapted Label
                    { view: 'management', label: 'Tratos Culturais' }, // Adapted Label
                    { view: 'fieldOperations', label: 'OperaÃ§Ãµes de MÃ¡quinas' },
                    { view: 'carbonMarket', label: 'Mercado de Carbono' },
                    { view: 'reports', label: 'Produtividade & Insumos' },
                    { view: 'stock', label: 'Estoque de Insumos' },
                    { view: 'futureMarket', label: 'Mercado Futuro (Commodities)' },
                    { view: 'sales', label: 'Venda de Safra' },
                    { view: 'financials', label: 'Custos da Safra' },
                    { view: 'propertyRegistration', label: 'Mapa de TalhÃµes' },
                ],
                supportedViews: [...GLOBAL_VIEWS, 'management', 'futureMarket', 'liveHandling']
            };
        case 'Hortifruti':
        case 'Fruticultura':
            return {
                labels: { liveHandling: 'ClassificaÃ§Ã£o & Packing', management: 'Manejo de Horta/Pomar', unit: 'Canteiro/Estufa', group: 'Lote' },
                managementTabs: ['IrrigaÃ§Ã£o', 'NutriÃ§Ã£o', 'Colheita', 'Poda'],
                liveHandling: { 
                    title: 'Colheita e ClassificaÃ§Ã£o', 
                    primaryInput: 'Peso Colhido', 
                    primaryUnit: 'kg', 
                    actions: ['Registrar Caixa', 'Descarte', 'Controle Qualidade'] 
                },
                navigation: [
                    { view: 'dashboard', label: 'Painel da ProduÃ§Ã£o' },
                    { view: 'liveHandling', label: 'Colheita & Packing' },
                    { view: 'management', label: 'Manejo DiÃ¡rio' },
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
                labels: { liveHandling: 'Curral Inteligente', management: 'Manejo SanitÃ¡rio/Nutricional', unit: 'Animal', group: 'Lote/Pasto' },
                managementTabs: ['NutriÃ§Ã£o', 'Sanidade', 'ReproduÃ§Ã£o', 'MovimentaÃ§Ã£o'],
                liveHandling: { 
                    title: 'Manejo no Curral', 
                    primaryInput: 'Peso', 
                    primaryUnit: 'kg', 
                    actions: ['Vacinar', 'Apartar', 'Pesagem', 'Vermifugar'] 
                },
                navigation: [
                    { view: 'dashboard', label: 'Painel do Rebanho' },
                    { view: 'liveHandling', label: 'Manejo no Curral' },
                    { view: 'management', label: 'Sanidade & NutriÃ§Ã£o' },
                    { view: 'customInputRequest', label: 'Insumo Personalizado' },
                    { view: 'fieldOperations', label: 'OperaÃ§Ãµes de Campo' },
                    { view: 'carbonMarket', label: 'Mercado de Carbono' },
                    { view: 'reports', label: 'GMD & Desempenho' },
                    { view: 'stock', label: 'FarmÃ¡cia & RaÃ§Ã£o' },
                    { view: 'futureMarket', label: 'Mercado Futuro (@)' },
                    { view: 'sales', label: 'Venda de Animais' },
                    { view: 'financials', label: 'Custos por CabeÃ§a' },
                    { view: 'propertyRegistration', label: 'Mapa de Pastos' },
                ],
                supportedViews: [...GLOBAL_VIEWS, 'management', 'liveHandling', 'futureMarket']
            };
        case 'Piscicultura':
            return {
                labels: { liveHandling: 'Biometria e Ãgua', management: 'Manejo de Tanques', unit: 'Tanque', group: 'Lote' },
                managementTabs: ['Qualidade Ãgua', 'ArraÃ§oamento', 'Despesca', 'Sanidade'],
                liveHandling: { 
                    title: 'AnÃ¡lise de Tanque', 
                    primaryInput: 'OxigÃªnio/pH', 
                    primaryUnit: 'mg/L', 
                    actions: ['Medir O2', 'Medir pH', 'Biometria (Peso MÃ©dio)', 'ArraÃ§oar'] 
                },
                navigation: [
                    { view: 'dashboard', label: 'Painel dos Tanques' },
                    { view: 'liveHandling', label: 'Qualidade da Ãgua' },
                    { view: 'management', label: 'AlimentaÃ§Ã£o & Biometria' },
                    { view: 'reports', label: 'ConversÃ£o Alimentar' },
                    { view: 'stock', label: 'RaÃ§Ã£o & QuÃ­micos' },
                    { view: 'sales', label: 'Venda (FrigorÃ­fico)' },
                ],
                supportedViews: [...GLOBAL_VIEWS, 'management', 'liveHandling']
            };
        case 'Avicultura':
            return {
                labels: { liveHandling: 'Coleta e Pesagem', management: 'Manejo AviÃ¡rio', unit: 'GalpÃ£o', group: 'Lote' },
                managementTabs: ['AmbiÃªncia', 'Mortalidade', 'Coleta Ovos', 'NutriÃ§Ã£o'],
                liveHandling: { 
                    title: 'DiÃ¡rio do AviÃ¡rio', 
                    primaryInput: 'Mortalidade', 
                    primaryUnit: 'aves', 
                    actions: ['Coleta Ovos', 'Reg. Mortalidade', 'Temp/Umidade'] 
                },
                navigation: [
                    { view: 'dashboard', label: 'Painel dos GalpÃµes' },
                    { view: 'liveHandling', label: 'DiÃ¡rio de Mortalidade' },
                    { view: 'management', label: 'Controle de AmbiÃªncia' },
                    { view: 'reports', label: 'Performance do Lote' },
                    { view: 'stock', label: 'RaÃ§Ã£o & Vacinas' },
                ],
                supportedViews: [...GLOBAL_VIEWS, 'management', 'liveHandling']
            };
        case 'Apicultura':
            return {
                labels: { liveHandling: 'RevisÃ£o de Colmeia', management: 'Manejo ApiÃ¡rio', unit: 'Colmeia', group: 'ApiÃ¡rio' },
                managementTabs: ['AlimentaÃ§Ã£o', 'Sanidade', 'Colheita Mel', 'Rainhas'],
                liveHandling: { 
                    title: 'InspeÃ§Ã£o de Campo', 
                    primaryInput: 'Quadros Mel', 
                    primaryUnit: 'un', 
                    actions: ['Troca Cera', 'Alimentar', 'Colher'] 
                },
                navigation: [
                    { view: 'dashboard', label: 'Painel do ApiÃ¡rio' },
                    { view: 'liveHandling', label: 'RevisÃ£o de Colmeias' },
                    { view: 'management', label: 'ProduÃ§Ã£o de Mel' },
                    { view: 'stock', label: 'Material & Cera' },
                ],
                supportedViews: [...GLOBAL_VIEWS, 'management', 'liveHandling']
            };
        default:
            return {
                labels: { liveHandling: 'OperaÃ§Ã£o', management: 'Tarefas', unit: 'Unidade', group: 'Grupo' },
                managementTabs: ['Geral', 'ManutenÃ§Ã£o'],
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

