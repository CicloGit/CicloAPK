import { User, ViewType } from '../types';

export type ScreenFlowStage = 'ENTRY' | 'REGISTER' | 'VALIDATE' | 'SETTLE' | 'AUDIT';

export interface ScreenFlowStep {
  id: string;
  title: string;
  description: string;
  view: ViewType;
  path: string;
  stage: ScreenFlowStage;
  requiredEvidence: string[];
}

export interface ScreenFlowDefinition {
  id: string;
  title: string;
  summary: string;
  roles: User['role'][];
  steps: ScreenFlowStep[];
}

export const SCREEN_FLOW_STAGE_LABEL: Record<ScreenFlowStage, string> = {
  ENTRY: 'Entrada',
  REGISTER: 'Lancamento',
  VALIDATE: 'Validacao',
  SETTLE: 'Liquidacao',
  AUDIT: 'Auditoria',
};

const ALL_ROLES: User['role'][] = [
  'Produtor',
  'Produtor de Sementes',
  'Técnico',
  'Investidor',
  'Fornecedor',
  'Integradora',
  'Operador',
  'Gestor de Trafego',
  'Gestor',
  'Administrador',
];

const OPERATION_ROLES: User['role'][] = [
  'Produtor',
  'Produtor de Sementes',
  'Operador',
  'Gestor',
  'Administrador',
  'Técnico',
  'Fornecedor',
  'Integradora',
];

const FINANCIAL_ROLES: User['role'][] = [
  'Produtor',
  'Investidor',
  'Gestor',
  'Administrador',
  'Integradora',
  'Fornecedor',
  'Gestor de Trafego',
];

const VIEW_PATHS: Partial<Record<ViewType, string>> = {
  dashboard: '/dashboard',
  stock: '/stock',
  management: '/management',
  liveHandling: '/live-handling',
  sales: '/sales',
  commercial: '/commercial',
  logistics: '/logistics',
  accountControl: '/account-control',
  reports: '/reports',
  fieldOperations: '/field-operations',
  financials: '/financials',
  flows: '/flows',
  finance: '/finance',
  legal: '/legal',
  integrations: '/integrations',
  contracts: '/contracts',
  propertyRegistration: '/property-registration',
  operatorPortal: '/operator-portal',
  technicianPortal: '/technician-portal',
  supplierPortal: '/supplier-portal',
  integratorPortal: '/integrator-portal',
  investorPortal: '/investor-portal',
  screenFlows: '/screen-flows',
};

const buildPath = (view: ViewType): string =>
  VIEW_PATHS[view] ?? `/${view.replace(/([A-Z])/g, '-$1').toLowerCase()}`;

const step = (
  id: string,
  title: string,
  description: string,
  view: ViewType,
  stage: ScreenFlowStage,
  requiredEvidence: string[] = []
): ScreenFlowStep => ({
  id,
  title,
  description,
  view,
  path: buildPath(view),
  stage,
  requiredEvidence,
});

export const SCREEN_FLOW_CATALOG: ScreenFlowDefinition[] = [
  {
    id: 'F-001',
    title: 'Governanca de Fluxos de Telas',
    summary: 'Fluxo mestre para garantir que todos os lancamentos e funcoes sigam o mesmo padrao operacional.',
    roles: ALL_ROLES,
    steps: [
      step('F001-S1', 'Painel Inicial', 'Entrada no ambiente de trabalho e visao do dia.', 'dashboard', 'ENTRY'),
      step('F001-S2', 'Fluxos de Telas', 'Consulta do roteiro oficial de navegacao e validacoes.', 'screenFlows', 'VALIDATE'),
      step('F001-S3', 'Execucao de Modulo', 'Abertura do modulo operacional para lancamento.', 'management', 'REGISTER'),
      step('F001-S4', 'Relatorios e Auditoria', 'Conferencia de rastreabilidade e evidencias digitais.', 'reports', 'AUDIT', ['timeline', 'hash']),
    ],
  },
  {
    id: 'F-100',
    title: 'Cadastro Animal e Formacao de Lote',
    summary: 'Cadastro unitario com rastreio por brinco e consolidacao em lote distribuido na propriedade.',
    roles: OPERATION_ROLES,
    steps: [
      step('F100-S1', 'Cadastro da Propriedade', 'Confere talhoes/pastos e estrutura de rastreio.', 'propertyRegistration', 'ENTRY'),
      step('F100-S2', 'Cadastro no Estoque Animal', 'Registro por unidade com identificador unico.', 'stock', 'REGISTER', ['brinco', 'qr']),
      step('F100-S3', 'Manejo e Agrupamento', 'Leitura de brinco e consolidacao em lotes operacionais.', 'liveHandling', 'VALIDATE', ['qr', 'foto', 'video']),
      step('F100-S4', 'Relatorio de Lotes', 'Auditoria da composicao e historico de movimentacoes.', 'reports', 'AUDIT'),
    ],
  },
  {
    id: 'F-110',
    title: 'PDV Animal Unitario',
    summary: 'Venda por leitura de brinco com emissao fiscal automatica e rastreabilidade completa.',
    roles: OPERATION_ROLES,
    steps: [
      step('F110-S1', 'Selecao de Lote para Venda', 'Preparacao do lote comercial a partir do estoque rastreado.', 'stock', 'ENTRY', ['brinco']),
      step('F110-S2', 'PDV Comercial e Vendas', 'Lancamento da venda com leitura de brinco e composicao automatica do lote.', 'sales', 'REGISTER', ['qr', 'foto', 'video']),
      step('F110-S3', 'Liquidacao SROW', 'Aplicacao da logica de bloqueio/liberacao por marcos.', 'accountControl', 'SETTLE', ['nf-e']),
      step('F110-S4', 'Relatorio Fiscal e Auditoria', 'Conferencia final com trilha digital de evidencias.', 'reports', 'AUDIT', ['xml-nfe']),
    ],
  },
  {
    id: 'F-120',
    title: 'PDV Animal por Peso',
    summary: 'Venda para especies de dificil separacao unitaria com base em pesagem certificada.',
    roles: OPERATION_ROLES,
    steps: [
      step('F120-S1', 'Manejo e Pesagem', 'Captura do peso oficial por lote e validacao operacional.', 'liveHandling', 'ENTRY', ['balanca']),
      step('F120-S2', 'PDV por Peso', 'Lancamento de venda com quantidade apurada na balanca.', 'sales', 'REGISTER', ['qr-balanca']),
      step('F120-S3', 'Liquidacao SROW', 'Retencao e liberacao financeira conforme status da entrega.', 'accountControl', 'SETTLE'),
      step('F120-S4', 'Relatorio de Fechamento', 'Evidencias consolidadas para auditoria e fiscal.', 'reports', 'AUDIT'),
    ],
  },
  {
    id: 'F-130',
    title: 'PDV Plantacoes por Talhao',
    summary: 'Venda de producao agricola identificada por talhao e medida em peso ou caixas.',
    roles: OPERATION_ROLES,
    steps: [
      step('F130-S1', 'Operacao de Campo', 'Identificacao de talhao e volume colhido.', 'fieldOperations', 'ENTRY', ['talhao']),
      step('F130-S2', 'PDV Plantacoes', 'Venda por peso/caixas com documento de autorizacao.', 'sales', 'REGISTER', ['qr-balanca', 'autorizacao-venda']),
      step('F130-S3', 'Logistica de Saida', 'Vinculo de veiculo, romaneio e carga.', 'logistics', 'VALIDATE', ['placa-veiculo']),
      step('F130-S4', 'Liquidacao e Fechamento', 'Aplicacao SROW e emissao fiscal do processo.', 'accountControl', 'SETTLE'),
      step('F130-S5', 'Relatorio de Safra Vendida', 'Auditoria final por talhao, peso e documento fiscal.', 'reports', 'AUDIT'),
    ],
  },
  {
    id: 'F-140',
    title: 'Remessa para Leilao',
    summary: 'Fluxo com emissao de NF somente apos finalizacao do leilao.',
    roles: OPERATION_ROLES,
    steps: [
      step('F140-S1', 'Registro de Remessa', 'Lancamento da remessa com destino de leilao.', 'sales', 'REGISTER', ['remessa']),
      step('F140-S2', 'Acompanhamento Comercial', 'Acompanha andamento e resultado do lote em leilao.', 'commercial', 'VALIDATE'),
      step('F140-S3', 'Finalizacao e NF', 'Emissao fiscal apenas apos venda concluida.', 'sales', 'SETTLE', ['nf-e']),
      step('F140-S4', 'Relatorio de Leilao', 'Consolidacao de resultado, valores e evidencias.', 'reports', 'AUDIT'),
    ],
  },
  {
    id: 'F-150',
    title: 'Venda de Bens da Propriedade',
    summary: 'Bens de uso devem ser identificados no estoque e seguir fluxo de venda/leilao.',
    roles: OPERATION_ROLES,
    steps: [
      step('F150-S1', 'Inventario de Bens', 'Identificacao do bem e status patrimonial.', 'stock', 'ENTRY', ['asset-tag']),
      step('F150-S2', 'Comercializacao de Bem', 'Lancamento da venda direta ou para leilao.', 'sales', 'REGISTER', ['foto-bem', 'autorizacao']),
      step('F150-S3', 'Fechamento Financeiro', 'Apuracao de receita e baixa do ativo.', 'financials', 'SETTLE'),
      step('F150-S4', 'Relatorio Patrimonial', 'Auditoria de baixa patrimonial e evidencias.', 'reports', 'AUDIT'),
    ],
  },
  {
    id: 'F-160',
    title: 'Escrow/SROW em Todas as Vendas',
    summary: 'Padrao obrigatorio de bloqueio e liberacao financeira para cada venda registrada no PDV.',
    roles: FINANCIAL_ROLES,
    steps: [
      step('F160-S1', 'Contrato e Condicoes', 'Definicao de marcos de liberacao para recebiveis.', 'contracts', 'ENTRY'),
      step('F160-S2', 'Fluxo de Liquidacao', 'Configura as etapas e criterios de desbloqueio.', 'flows', 'VALIDATE'),
      step('F160-S3', 'Conta Vinculada', 'Controle de bloqueio/liberacao por recebivel.', 'accountControl', 'SETTLE'),
      step('F160-S4', 'Conferencia Financeira', 'Consolidacao no modulo financeiro.', 'finance', 'AUDIT'),
    ],
  },
  {
    id: 'F-170',
    title: 'Auditoria Digital Obrigatoria',
    summary: 'Toda operacao deve registrar evidencia digital com QR, foto, video ou documentos equivalentes.',
    roles: ALL_ROLES,
    steps: [
      step('F170-S1', 'Captura Operacional', 'Registro de evidencia durante a operacao.', 'liveHandling', 'REGISTER', ['qr', 'foto', 'video']),
      step('F170-S2', 'Integracao e Assinatura', 'Persistencia e integracao de dados de evidencia.', 'integrations', 'VALIDATE'),
      step('F170-S3', 'Conformidade Legal', 'Conferencia juridica e fiscal dos registros.', 'legal', 'VALIDATE'),
      step('F170-S4', 'Relatorio Auditavel', 'Historico final pronto para auditoria externa.', 'reports', 'AUDIT'),
    ],
  },
  {
    id: 'F-180',
    title: 'Operador de Campo ao Fechamento',
    summary: 'Fluxo operacional para equipes de execucao com fechamento no modulo de vendas e auditoria.',
    roles: ['Operador', 'Gestor', 'Administrador'],
    steps: [
      step('F180-S1', 'Portal do Operador', 'Entrada operacional e recebimento de tarefas.', 'operatorPortal', 'ENTRY'),
      step('F180-S2', 'Coleta em Campo', 'Captura de dados e provas da execucao.', 'liveHandling', 'REGISTER'),
      step('F180-S3', 'Lancamento Comercial', 'Conclusao da entrega no PDV comercial.', 'sales', 'SETTLE'),
      step('F180-S4', 'Relatorio de Execucao', 'Auditoria do ciclo completo da tarefa.', 'reports', 'AUDIT'),
    ],
  },
  {
    id: 'F-190',
    title: 'Fornecedor e Logistica de Entrega',
    summary: 'Fluxo para entrada de fornecimento e rastreio logistico ate o fechamento.',
    roles: ['Fornecedor', 'Gestor de Trafego', 'Gestor', 'Administrador'],
    steps: [
      step('F190-S1', 'Portal do Fornecedor', 'Entrada da empresa fornecedora.', 'supplierPortal', 'ENTRY'),
      step('F190-S2', 'Registro de Estoque', 'Lancamento de item e lote para movimentacao.', 'stock', 'REGISTER'),
      step('F190-S3', 'Operacao Logistica', 'Expedicao e comprovacao de transporte.', 'logistics', 'VALIDATE'),
      step('F190-S4', 'Relatorio de Entregas', 'Conferencia final e historico da entrega.', 'reports', 'AUDIT'),
    ],
  },
];

export const getScreenFlowsForRole = (role: User['role'] | null | undefined): ScreenFlowDefinition[] => {
  if (!role) {
    return SCREEN_FLOW_CATALOG;
  }

  return SCREEN_FLOW_CATALOG.filter((flow) => flow.roles.includes(role));
};

export const getScreenFlowsForView = (
  view: ViewType | null | undefined,
  role?: User['role'] | null
): ScreenFlowDefinition[] => {
  if (!view) {
    return [];
  }

  return getScreenFlowsForRole(role).filter((flow) => flow.steps.some((flowStep) => flowStep.view === view));
};

export const getPrimaryScreenFlowForView = (
  view: ViewType | null | undefined,
  role?: User['role'] | null
): ScreenFlowDefinition | null => {
  const matches = getScreenFlowsForView(view, role);
  return matches.length > 0 ? matches[0] : null;
};

