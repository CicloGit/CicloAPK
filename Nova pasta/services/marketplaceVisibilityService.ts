import { ClaimsRole, ListingCategory, User } from '../types';

export type MarketplaceTenantType = 'PRODUCER_TENANT' | 'SUPPLIER_TENANT' | 'BUYER_TENANT';
export type MarketplaceActiveTab = 'INPUTS' | 'AUCTION' | 'OUTPUTS';

export interface MarketplaceVisibleCategoriesParams {
  role?: User['role'] | null;
  claimsRole?: ClaimsRole | null;
  tenantType?: MarketplaceTenantType | null;
  activeTab: MarketplaceActiveTab;
}

export interface MarketplaceTabDefinition {
  id: MarketplaceActiveTab;
  label: string;
  description: string;
}

const INPUTS_CATEGORY: ListingCategory = 'INPUTS_INDUSTRY';
const OUTPUTS_CATEGORY: ListingCategory = 'OUTPUTS_PRODUCER';
const AUCTION_CATEGORY: ListingCategory = 'AUCTION_P2P';

const DEFAULT_PRODUCER_TABS: MarketplaceTabDefinition[] = [
  {
    id: 'INPUTS',
    label: 'Comprar Insumos',
    description: 'Ofertas de insumos, acessorios e implementos para a producao.',
  },
  {
    id: 'AUCTION',
    label: 'Leilao',
    description: 'Ofertas entre produtores no modo leilao P2P.',
  },
];

const DEFAULT_INDUSTRY_BUYER_TABS: MarketplaceTabDefinition[] = [
  {
    id: 'OUTPUTS',
    label: 'Comprar do Produtor',
    description: 'Compra de producao ofertada por produtores.',
  },
];

const DEFAULT_SUPPLIER_TABS: MarketplaceTabDefinition[] = [
  {
    id: 'INPUTS',
    label: 'Minhas Ofertas',
    description: 'Gestao das suas ofertas de insumos para produtores.',
  },
];

const DEFAULT_GENERIC_TABS: MarketplaceTabDefinition[] = [
  ...DEFAULT_PRODUCER_TABS,
  ...DEFAULT_INDUSTRY_BUYER_TABS,
];

const normalizeRoleKey = (role: User['role'] | ClaimsRole | null | undefined): string =>
  String(role ?? '')
    .trim()
    .replace(/\s+/g, '_')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

const isProducerRole = (role: User['role'] | ClaimsRole | null | undefined): boolean =>
  ['PRODUTOR', 'PRODUCER'].includes(normalizeRoleKey(role));

const isSupplierRole = (role: User['role'] | ClaimsRole | null | undefined): boolean =>
  ['FORNECEDOR', 'SUPPLIER'].includes(normalizeRoleKey(role));

const isIndustryBuyerRole = (role: User['role'] | ClaimsRole | null | undefined): boolean =>
  ['INTEGRADORA', 'INTEGRATOR', 'WHOLESALER_BUYER', 'INDUSTRY_BUYER'].includes(normalizeRoleKey(role));

export const getMarketplaceVisibleCategories = (
  params: MarketplaceVisibleCategoriesParams
): ListingCategory[] => {
  const roleRef = params.claimsRole ?? params.role ?? null;

  if (params.tenantType === 'SUPPLIER_TENANT' || isSupplierRole(roleRef)) {
    return [INPUTS_CATEGORY];
  }

  if (params.tenantType === 'BUYER_TENANT' || isIndustryBuyerRole(roleRef)) {
    return [OUTPUTS_CATEGORY];
  }

  if (params.tenantType === 'PRODUCER_TENANT' || isProducerRole(roleRef)) {
    if (params.activeTab === 'AUCTION') {
      return [AUCTION_CATEGORY];
    }
    if (params.activeTab === 'OUTPUTS') {
      return [OUTPUTS_CATEGORY];
    }
    return [INPUTS_CATEGORY];
  }

  if (params.activeTab === 'AUCTION') {
    return [AUCTION_CATEGORY];
  }
  if (params.activeTab === 'OUTPUTS') {
    return [OUTPUTS_CATEGORY];
  }
  return [INPUTS_CATEGORY];
};

export const getMarketplaceTabsForPersona = (
  role?: User['role'] | null,
  claimsRole?: ClaimsRole | null,
  tenantType?: MarketplaceTenantType | null
): MarketplaceTabDefinition[] => {
  const roleRef = claimsRole ?? role ?? null;

  if (tenantType === 'SUPPLIER_TENANT' || isSupplierRole(roleRef)) {
    return DEFAULT_SUPPLIER_TABS;
  }

  if (tenantType === 'BUYER_TENANT' || isIndustryBuyerRole(roleRef)) {
    return DEFAULT_INDUSTRY_BUYER_TABS;
  }

  if (tenantType === 'PRODUCER_TENANT' || isProducerRole(roleRef)) {
    return DEFAULT_PRODUCER_TABS;
  }

  return DEFAULT_GENERIC_TABS;
};

export const getDefaultMarketplaceTab = (
  role?: User['role'] | null,
  claimsRole?: ClaimsRole | null,
  tenantType?: MarketplaceTenantType | null
): MarketplaceActiveTab => getMarketplaceTabsForPersona(role, claimsRole, tenantType)[0]?.id ?? 'INPUTS';
