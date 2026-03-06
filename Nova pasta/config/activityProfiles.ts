import {
  ProducerApplicationArea,
  ProducerInputType,
  ProducerTargetSpecies,
  ProductionSector,
} from '../types';

export interface ActivityAutomationProfile {
  key: string;
  unitLabel: string;
  lotLabel: string;
  lotCategoryLabel: string;
  averageMeasureLabel: string;
  volumeInputLabel: string;
  inventoryLabel: string;
  defaultCommodity: string;
  checklist: string[];
  requiredRegistryFields: string[];
  allowedInputTypes: ProducerInputType[];
  allowedApplicationAreas: ProducerApplicationArea[];
  allowedTargetSpecies: ProducerTargetSpecies[];
  defaultTargetSpecies: ProducerTargetSpecies[];
  defaultInputUnit: string;
  embrapaReferences: Array<{ title: string; url: string }>;
}

const COMMON_PROFILE: ActivityAutomationProfile = {
  key: 'DEFAULT',
  unitLabel: 'unidades',
  lotLabel: 'Lote',
  lotCategoryLabel: 'Categoria',
  averageMeasureLabel: 'Medida media',
  volumeInputLabel: 'Volume',
  inventoryLabel: 'Insumos',
  defaultCommodity: 'Boi Gordo',
  checklist: [
    'Conferir registros operacionais e parametros sanitarios.',
    'Vincular evidencias digitais para cada operacao critica.',
    'Fechar registros financeiros e relatorios de desempenho.',
  ],
  requiredRegistryFields: ['Lote', 'Categoria', 'Quantidade', 'Medida media'],
  allowedInputTypes: ['ADUBO', 'RACAO', 'SAL_MINERAL', 'MEDICAMENTO', 'SEMENTE', 'DEFENSIVO', 'OUTRO'],
  allowedApplicationAreas: ['PASTAGEM', 'LAVOURA', 'CONFINAMENTO', 'AVIARIO', 'CURRAL', 'GERAL'],
  allowedTargetSpecies: ['BOVINOS', 'AVES', 'SUINOS', 'OVINOS', 'CAPRINOS', 'EQUINOS', 'PEIXES'],
  defaultTargetSpecies: ['BOVINOS'],
  defaultInputUnit: 'kg',
  embrapaReferences: [],
};

const PROFILE_BY_SECTOR: Partial<Record<ProductionSector, ActivityAutomationProfile>> = {
  Piscicultura: {
    ...COMMON_PROFILE,
    key: 'PISCICULTURA',
    unitLabel: 'peixes',
    lotLabel: 'Tanque/Lote',
    lotCategoryLabel: 'Sistema de criacao',
    averageMeasureLabel: 'Peso medio (g)',
    volumeInputLabel: 'Biomassa (kg)',
    inventoryLabel: 'Racao e aditivos',
    defaultCommodity: 'Tilapia',
    checklist: [
      'Registrar parametros de qualidade de agua: oxigenio, pH e temperatura.',
      'Controlar biometria e taxa de arracoamento por tanque.',
      'Consolidar mortalidade, conversao alimentar e desempenho por ciclo.',
    ],
    requiredRegistryFields: ['Tanque', 'Biomassa', 'Qualidade da agua', 'Racao'],
    allowedInputTypes: ['RACAO', 'MEDICAMENTO', 'OUTRO'],
    allowedApplicationAreas: ['GERAL', 'CONFINAMENTO'],
    allowedTargetSpecies: ['PEIXES'],
    defaultTargetSpecies: ['PEIXES'],
    defaultInputUnit: 'kg',
    embrapaReferences: [
      {
        title: 'Embrapa - Manual de Boas Praticas de Manejo para a Piscicultura em Viveiros Escavados',
        url: 'https://www.infoteca.cnptia.embrapa.br/infoteca/handle/doc/1150565',
      },
      {
        title: 'Embrapa - Manual de Boas Praticas de Manejo para a Piscicultura em Tanques-Rede',
        url: 'https://www.infoteca.cnptia.embrapa.br/infoteca/handle/doc/1150562',
      },
      {
        title: 'Embrapa - Conceitos basicos de qualidade da agua',
        url: 'https://www.embrapa.br/agencia-de-informacao-tecnologica/criacoes/tilapia/pre-producao/qualidade-da-agua/conceitos-basicos',
      },
    ],
  },
  Suinocultura: {
    ...COMMON_PROFILE,
    key: 'SUINOCULTURA',
    unitLabel: 'suinos',
    lotLabel: 'Baia/Lote',
    lotCategoryLabel: 'Fase de producao',
    averageMeasureLabel: 'Peso medio (kg)',
    volumeInputLabel: 'Consumo (kg)',
    inventoryLabel: 'Racao e biosseguridade',
    defaultCommodity: 'Suino vivo',
    checklist: [
      'Aplicar rotina de biosseguridade (entrada, limpeza e vazio sanitario).',
      'Controlar ambiencia, agua de dessedentacao e conversao alimentar.',
      'Registrar sanidade, ganho diario e mortalidade por lote.',
    ],
    requiredRegistryFields: ['Baia', 'Fase', 'Cabecas', 'Peso medio'],
    allowedInputTypes: ['RACAO', 'MEDICAMENTO', 'SAL_MINERAL', 'OUTRO'],
    allowedApplicationAreas: ['CONFINAMENTO', 'CURRAL', 'GERAL'],
    allowedTargetSpecies: ['SUINOS'],
    defaultTargetSpecies: ['SUINOS'],
    defaultInputUnit: 'kg',
    embrapaReferences: [
      {
        title: 'Embrapa - BioSui: plataforma de monitoramento de biosseguridade em granjas de suinos',
        url: 'https://www.embrapa.br/suinos-e-aves/biosui',
      },
      {
        title: 'Embrapa Suinos e Aves - Manejo da agua na producao de suinos',
        url: 'https://www.embrapa.br/busca-de-noticias/-/noticia/12435643/manejo-da-agua-na-producao-de-suinos',
      },
      {
        title: 'Embrapa - Central de Inteligencia em Saude de Suinos',
        url: 'https://www.embrapa.br/suinos-e-aves/cias',
      },
    ],
  },
  'Pecu\u00E1ria (Bovinos Corte)': {
    ...COMMON_PROFILE,
    key: 'BOVINOCULTURA_CORTE',
    unitLabel: 'cabecas',
    lotLabel: 'Lote/Pasto',
    lotCategoryLabel: 'Categoria zootecnica',
    averageMeasureLabel: 'Peso medio (kg)',
    volumeInputLabel: 'Arrobas/kg',
    inventoryLabel: 'Racao, sal e farmacia',
    defaultCommodity: 'Boi Gordo',
    checklist: [
      'Controlar lotacao, ganho medio diario e condicao corporal.',
      'Registrar protocolo sanitario e movimentacao de lotes.',
      'Conferir desempenho de pasto, suplementacao e venda por lote.',
    ],
    requiredRegistryFields: ['Lote', 'Categoria', 'Cabecas', 'Peso medio'],
    allowedInputTypes: ['RACAO', 'SAL_MINERAL', 'MEDICAMENTO', 'ADUBO', 'OUTRO'],
    allowedApplicationAreas: ['PASTAGEM', 'CURRAL', 'CONFINAMENTO', 'GERAL'],
    allowedTargetSpecies: ['BOVINOS'],
    defaultTargetSpecies: ['BOVINOS'],
    defaultInputUnit: 'kg',
    embrapaReferences: [
      {
        title: 'Embrapa Gado de Corte - Publicacoes de manejo de bovinos de corte',
        url: 'https://www.embrapa.br/gado-de-corte/busca-de-publicacoes/-/publicacao',
      },
      {
        title: 'Embrapa - Boas praticas agropecuarias para bovinos de corte',
        url: 'https://www.embrapa.br/gado-de-corte',
      },
    ],
  },
  'Pecu\u00E1ria (Bovinos Leite)': {
    ...COMMON_PROFILE,
    key: 'BOVINOCULTURA_LEITE',
    unitLabel: 'vacas/lotes',
    lotLabel: 'Lote de lactacao',
    lotCategoryLabel: 'Fase produtiva',
    averageMeasureLabel: 'Litros/animal/dia',
    volumeInputLabel: 'Producao diaria (L)',
    inventoryLabel: 'Racao, volumoso e farmacia',
    defaultCommodity: 'Leite',
    checklist: [
      'Monitorar producao de leite, CCS e qualidade do leite.',
      'Controlar dieta por lote e eventos sanitarios.',
      'Registrar reproducao, secagem e descarte tecnico.',
    ],
    requiredRegistryFields: ['Lote de lactacao', 'Producao diaria', 'Sanidade', 'Custos'],
    allowedInputTypes: ['RACAO', 'SAL_MINERAL', 'MEDICAMENTO', 'ADUBO', 'OUTRO'],
    allowedApplicationAreas: ['PASTAGEM', 'CURRAL', 'CONFINAMENTO', 'GERAL'],
    allowedTargetSpecies: ['BOVINOS'],
    defaultTargetSpecies: ['BOVINOS'],
    defaultInputUnit: 'kg',
    embrapaReferences: [
      {
        title: 'Embrapa Gado de Leite - Publicacoes tecnicas',
        url: 'https://www.embrapa.br/gado-de-leite/publicacoes',
      },
    ],
  },
  Agricultura: {
    ...COMMON_PROFILE,
    key: 'AGRICULTURA',
    unitLabel: 'talhoes',
    lotLabel: 'Talhao/Safra',
    lotCategoryLabel: 'Cultura',
    averageMeasureLabel: 'Produtividade media',
    volumeInputLabel: 'Volume colhido',
    inventoryLabel: 'Sementes, fertilizantes e defensivos',
    defaultCommodity: 'Soja',
    checklist: [
      'Registrar plantio, tratos culturais e operacoes mecanizadas por talhao.',
      'Monitorar custos por hectare, produtividade e perdas.',
      'Consolidar estoque de insumos com rastreabilidade por lote.',
    ],
    requiredRegistryFields: ['Talhao', 'Cultura', 'Area', 'Volume'],
    allowedInputTypes: ['SEMENTE', 'ADUBO', 'DEFENSIVO', 'OUTRO'],
    allowedApplicationAreas: ['LAVOURA', 'GERAL'],
    allowedTargetSpecies: [],
    defaultTargetSpecies: [],
    defaultInputUnit: 'kg',
    embrapaReferences: [
      {
        title: 'Embrapa - Boas praticas em sistemas de producao agricola',
        url: 'https://www.embrapa.br',
      },
    ],
  },
};

export const getActivityAutomationProfile = (
  sector: ProductionSector | undefined
): ActivityAutomationProfile => {
  if (!sector) {
    return COMMON_PROFILE;
  }

  return PROFILE_BY_SECTOR[sector] ?? COMMON_PROFILE;
};
