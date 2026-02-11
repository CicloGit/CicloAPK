
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
            labels: { liveHandling: 'Manejo Rápido', management: 'Atividades', unit: 'Item', group: 'Lote' },
            managementTabs: ['Geral', 'Manutenção', 'Outros'],
            liveHandling: { title: 'Execução Operacional', primaryInput: 'Valor', primaryUnit: '-', actions: ['Registrar'] },
            navigation: [
                { view: 'dashboard', label: 'Visão Consolidada' },
                { view: 'financials', label: 'Financeiro Holding' },
                { view: 'reports', label: 'Relatórios Gerenciais' },
                { view: 'sales', label: 'Comercial & Vendas' },
                { view: 'contracts', label: 'Gestão de Contratos' },
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
                labels: { liveHandling: 'Monitoramento de Campo', management: 'Tratos Culturais', unit: 'Talhão', group: 'Safra' },
                managementTabs: ['Plantio', 'Pulverização', 'Colheita', 'Adubação'],
                liveHandling: { 
                    title: 'Monitoramento de Safra', 
                    primaryInput: 'Umidade/Estágio', 
                    primaryUnit: '%', 
                    actions: ['Registrar Praga', 'Medir Umidade', 'Finalizar Talhão'] 
                },
                navigation: [
                    { view: 'dashboard', label: 'Painel da Safra' },
                    { view: 'liveHandling', label: 'Monitoramento de Campo' }, // Adapted Label
                    { view: 'management', label: 'Tratos Culturais' }, // Adapted Label
                    { view: 'fieldOperations', label: 'Operações de Máquinas' },
                    { view: 'carbonMarket', label: 'Mercado de Carbono' },
                    { view: 'reports', label: 'Produtividade & Insumos' },
                    { view: 'stock', label: 'Estoque de Insumos' },
                    { view: 'futureMarket', label: 'Mercado Futuro (Commodities)' },
                    { view: 'sales', label: 'Venda de Safra' },
                    { view: 'financials', label: 'Custos da Safra' },
                    { view: 'propertyRegistration', label: 'Mapa de Talhões' },
                ],
                supportedViews: [...GLOBAL_VIEWS, 'management', 'futureMarket', 'liveHandling']
            };
        case 'Hortifruti':
        case 'Fruticultura':
            return {
                labels: { liveHandling: 'Classificação & Packing', management: 'Manejo de Horta/Pomar', unit: 'Canteiro/Estufa', group: 'Lote' },
                managementTabs: ['Irrigação', 'Nutrição', 'Colheita', 'Poda'],
                liveHandling: { 
                    title: 'Colheita e Classificação', 
                    primaryInput: 'Peso Colhido', 
                    primaryUnit: 'kg', 
                    actions: ['Registrar Caixa', 'Descarte', 'Controle Qualidade'] 
                },
                navigation: [
                    { view: 'dashboard', label: 'Painel da Produção' },
                    { view: 'liveHandling', label: 'Colheita & Packing' },
                    { view: 'management', label: 'Manejo Diário' },
                    { view: 'fieldOperations', label: 'Tarefas de Campo' },
                    { view: 'stock', label: 'Embalagens & Insumos' },
                    { view: 'sales', label: 'Vendas (Ceasa/Varejo)' },
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
                labels: { liveHandling: 'Curral Inteligente', management: 'Manejo Sanitário/Nutricional', unit: 'Animal', group: 'Lote/Pasto' },
                managementTabs: ['Nutrição', 'Sanidade', 'Reprodução', 'Movimentação'],
                liveHandling: { 
                    title: 'Manejo no Curral', 
                    primaryInput: 'Peso', 
                    primaryUnit: 'kg', 
                    actions: ['Vacinar', 'Apartar', 'Pesagem', 'Vermifugar'] 
                },
                navigation: [
                    { view: 'dashboard', label: 'Painel do Rebanho' },
                    { view: 'liveHandling', label: 'Manejo no Curral' },
                    { view: 'management', label: 'Sanidade & Nutrição' },
                    { view: 'customInputRequest', label: 'Insumo Personalizado' },
                    { view: 'fieldOperations', label: 'Operações de Campo' },
                    { view: 'carbonMarket', label: 'Mercado de Carbono' },
                    { view: 'reports', label: 'GMD & Desempenho' },
                    { view: 'stock', label: 'Farmácia & Ração' },
                    { view: 'futureMarket', label: 'Mercado Futuro (@)' },
                    { view: 'sales', label: 'Venda de Animais' },
                    { view: 'financials', label: 'Custos por Cabeça' },
                    { view: 'propertyRegistration', label: 'Mapa de Pastos' },
                ],
                supportedViews: [...GLOBAL_VIEWS, 'management', 'liveHandling', 'futureMarket']
            };
        case 'Piscicultura':
            return {
                labels: { liveHandling: 'Biometria e Água', management: 'Manejo de Tanques', unit: 'Tanque', group: 'Lote' },
                managementTabs: ['Qualidade Água', 'Arraçoamento', 'Despesca', 'Sanidade'],
                liveHandling: { 
                    title: 'Análise de Tanque', 
                    primaryInput: 'Oxigênio/pH', 
                    primaryUnit: 'mg/L', 
                    actions: ['Medir O2', 'Medir pH', 'Biometria (Peso Médio)', 'Arraçoar'] 
                },
                navigation: [
                    { view: 'dashboard', label: 'Painel dos Tanques' },
                    { view: 'liveHandling', label: 'Qualidade da Água' },
                    { view: 'management', label: 'Alimentação & Biometria' },
                    { view: 'reports', label: 'Conversão Alimentar' },
                    { view: 'stock', label: 'Ração & Químicos' },
                    { view: 'sales', label: 'Venda (Frigorífico)' },
                ],
                supportedViews: [...GLOBAL_VIEWS, 'management', 'liveHandling']
            };
        case 'Avicultura':
            return {
                labels: { liveHandling: 'Coleta e Pesagem', management: 'Manejo Aviário', unit: 'Galpão', group: 'Lote' },
                managementTabs: ['Ambiência', 'Mortalidade', 'Coleta Ovos', 'Nutrição'],
                liveHandling: { 
                    title: 'Diário do Aviário', 
                    primaryInput: 'Mortalidade', 
                    primaryUnit: 'aves', 
                    actions: ['Coleta Ovos', 'Reg. Mortalidade', 'Temp/Umidade'] 
                },
                navigation: [
                    { view: 'dashboard', label: 'Painel dos Galpões' },
                    { view: 'liveHandling', label: 'Diário de Mortalidade' },
                    { view: 'management', label: 'Controle de Ambiência' },
                    { view: 'reports', label: 'Performance do Lote' },
                    { view: 'stock', label: 'Ração & Vacinas' },
                ],
                supportedViews: [...GLOBAL_VIEWS, 'management', 'liveHandling']
            };
        case 'Apicultura':
            return {
                labels: { liveHandling: 'Revisão de Colmeia', management: 'Manejo Apiário', unit: 'Colmeia', group: 'Apiário' },
                managementTabs: ['Alimentação', 'Sanidade', 'Colheita Mel', 'Rainhas'],
                liveHandling: { 
                    title: 'Inspeção de Campo', 
                    primaryInput: 'Quadros Mel', 
                    primaryUnit: 'un', 
                    actions: ['Troca Cera', 'Alimentar', 'Colher'] 
                },
                navigation: [
                    { view: 'dashboard', label: 'Painel do Apiário' },
                    { view: 'liveHandling', label: 'Revisão de Colmeias' },
                    { view: 'management', label: 'Produção de Mel' },
                    { view: 'stock', label: 'Material & Cera' },
                ],
                supportedViews: [...GLOBAL_VIEWS, 'management', 'liveHandling']
            };
        default:
            return {
                labels: { liveHandling: 'Operação', management: 'Tarefas', unit: 'Unidade', group: 'Grupo' },
                managementTabs: ['Geral', 'Manutenção'],
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
