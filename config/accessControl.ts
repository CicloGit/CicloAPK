import { User, ViewType } from '../types';

const ADMIN_VISUALIZATION_VIEWS: ViewType[] = [
  'dashboard',
  'architecture',
  'dataDictionary',
  'operations',
  'flows',
  'eventsMatrix',
  'systemConfig',
  'producerPortal',
  'technicianPortal',
  'investorPortal',
  'supplierPortal',
  'integratorPortal',
  'operatorPortal',
  'finance',
  'stock',
  'commercial',
  'logistics',
  'legal',
  'propertyRegistration',
  'operationalAction',
  'contracts',
  'sales',
  'financials',
  'accountControl',
  'management',
  'futureMarket',
  'workforce',
  'publicMarket',
  'aiAnalysis',
  'liveHandling',
  'integrations',
  'fieldOperations',
  'reports',
  'carbonMarket',
  'customInputRequest',
  'mobileApp',
  'marketplace',
];

export const roleAccessConfig: Record<User['role'], ViewType[]> = {
  Produtor: [
    'dashboard',
    'producerPortal',
    'stock',
    'commercial',
    'logistics',
    'propertyRegistration',
    'contracts',
    'sales',
    'financials',
    'accountControl',
    'management',
    'futureMarket',
    'workforce',
    'liveHandling',
    'integrations',
    'fieldOperations',
    'reports',
    'carbonMarket',
    'customInputRequest',
    'marketplace',
  ],
  'Produtor de Sementes': ['dashboard', 'stock', 'reports', 'integrations', 'financials', 'marketplace'],
  'T\u00E9cnico': ['dashboard', 'technicianPortal', 'producerPortal', 'liveHandling', 'operatorPortal', 'marketplace'],
  Investidor: ['dashboard', 'investorPortal', 'finance'],
  Fornecedor: ['dashboard', 'supplierPortal', 'stock', 'logistics', 'integrations', 'marketplace'],
  Operador: ['operatorPortal', 'liveHandling', 'marketplace'],
  Gestor: [...ADMIN_VISUALIZATION_VIEWS],
  Integradora: [
    'dashboard',
    'integratorPortal',
    'contracts',
    'financials',
    'logistics',
    'integrations',
    'commercial',
  ],
  'Gestor de Trafego': [
    'dashboard',
    'supplierPortal',
    'logistics',
    'legal',
    'financials',
    'operations',
    'eventsMatrix',
    'integrations',
  ],
  Administrador: [...ADMIN_VISUALIZATION_VIEWS],
};

const normalizeRole = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export const getRoleAccess = (role: string | null | undefined): ViewType[] => {
  if (!role) {
    return [];
  }

  const directRole = role as User['role'];
  if (roleAccessConfig[directRole]) {
    return roleAccessConfig[directRole];
  }

  const normalizedRole = normalizeRole(role);
  const matchedRole = (Object.keys(roleAccessConfig) as User['role'][]).find(
    (configuredRole) => normalizeRole(configuredRole) === normalizedRole
  );

  if (matchedRole) {
    return roleAccessConfig[matchedRole];
  }

  return [];
};

export const canAccessView = (user: User, view: ViewType): boolean => {
  return getRoleAccess(user.role).includes(view);
};

