import { getIdTokenResult } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { ClaimsRole, ProducerScopes, User } from '../types';

type FirebaseUser = { uid: string };

export interface ResolveClaimsOptions {
  forceRefresh?: boolean;
  allowProfileFallback?: boolean;
}

export interface ResolvedAuthClaims {
  role: ClaimsRole | null;
  tenantId: string | null;
  producerScopes: ProducerScopes;
  source: 'claims' | 'profile' | 'mixed' | 'none';
}

const ROLE_ALIASES: Record<string, ClaimsRole> = {
  PRODUCER: 'PRODUCER',
  PRODUTOR: 'PRODUCER',
  SUPPLIER: 'SUPPLIER',
  FORNECEDOR: 'SUPPLIER',
  INTEGRATOR: 'INTEGRATOR',
  INTEGRADORA: 'INTEGRATOR',
  TECHNICIAN: 'TECHNICIAN',
  TECNICO: 'TECHNICIAN',
  INVESTOR: 'INVESTOR',
  INVESTIDOR: 'INVESTOR',
  MANAGER: 'MANAGER',
  GESTOR: 'MANAGER',
  TRAFFIC_MANAGER: 'TRAFFIC_MANAGER',
  GESTOR_DE_TRAFEGO: 'TRAFFIC_MANAGER',
  OPERATOR: 'OPERATOR',
  OPERADOR: 'OPERATOR',
  ADMIN: 'ADMIN',
  ADMINISTRADOR: 'ADMIN',
};

const toNormalizedKey = (value: unknown): string =>
  String(value ?? '')
    .replace(/TÃƒÂ©cnico/gi, 'Tecnico')
    .replace(/TÃ©cnico/gi, 'Tecnico')
    .trim()
    .replace(/\s+/g, '_')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();

const normalizeClaimsRole = (value: unknown): ClaimsRole | null => {
  const normalized = toNormalizedKey(value);
  return ROLE_ALIASES[normalized] ?? null;
};

const normalizeProducerScopes = (value: unknown): ProducerScopes => {
  if (!value || typeof value !== 'object') {
    return {};
  }

  const raw = value as Record<string, unknown>;
  return {
    seedProducer: raw.seedProducer === true,
  };
};

const mergeProducerScopes = (primary: ProducerScopes, fallback: ProducerScopes): ProducerScopes => ({
  seedProducer: primary.seedProducer === true || fallback.seedProducer === true,
});

const profileRoleToClaimsRole = (role: unknown): ClaimsRole | null => normalizeClaimsRole(role);

export const claimsRoleToUserRole = (role: ClaimsRole | null | undefined): User['role'] | null => {
  switch (role) {
    case 'PRODUCER':
      return 'Produtor';
    case 'SUPPLIER':
      return 'Fornecedor';
    case 'INTEGRATOR':
      return 'Integradora';
    case 'TECHNICIAN':
      return 'Técnico';
    case 'INVESTOR':
      return 'Investidor';
    case 'MANAGER':
      return 'Gestor';
    case 'TRAFFIC_MANAGER':
      return 'Gestor de Trafego';
    case 'ADMIN':
      return 'Administrador';
    case 'OPERATOR':
      return 'Operador';
    default:
      return null;
  }
};

export const authClaimsService = {
  async resolveClaims(user: FirebaseUser, options?: ResolveClaimsOptions): Promise<ResolvedAuthClaims> {
    const forceRefresh = options?.forceRefresh !== false;
    const allowProfileFallback = options?.allowProfileFallback !== false;

    let claimRole: ClaimsRole | null = null;
    let claimTenantId: string | null = null;
    let claimScopes: ProducerScopes = {};
    let hasClaimPayload = false;

    try {
      const tokenResult = await getIdTokenResult(user, forceRefresh);
      claimRole = normalizeClaimsRole(tokenResult.claims?.role);
      claimTenantId = typeof tokenResult.claims?.tenantId === 'string' ? tokenResult.claims.tenantId : null;
      claimScopes = normalizeProducerScopes(tokenResult.claims?.producerScopes);
      hasClaimPayload = Boolean(claimRole || claimTenantId || claimScopes.seedProducer);
    } catch {
      claimRole = null;
      claimTenantId = null;
      claimScopes = {};
      hasClaimPayload = false;
    }

    if (!allowProfileFallback) {
      return {
        role: claimRole,
        tenantId: claimTenantId,
        producerScopes: claimScopes,
        source: hasClaimPayload ? 'claims' : 'none',
      };
    }

    let profileRole: ClaimsRole | null = null;
    let profileTenantId: string | null = null;
    let profileScopes: ProducerScopes = {};
    let hasProfilePayload = false;

    try {
      const profileSnapshot = await getDoc(doc(db, 'users', user.uid));
      if (profileSnapshot.exists()) {
        const profile = profileSnapshot.data() as Record<string, unknown>;
        profileRole = profileRoleToClaimsRole(profile.role);
        profileTenantId = typeof profile.tenantId === 'string' ? profile.tenantId : null;
        profileScopes = mergeProducerScopes(normalizeProducerScopes(profile.producerScopes), {
          // Transitional fallback for one release:
          // legacy role "Produtor de Sementes" becomes PRODUCER + producerScopes.seedProducer=true.
          seedProducer: String(profile.role ?? '') === 'Produtor de Sementes',
        });
        hasProfilePayload = Boolean(profileRole || profileTenantId || profileScopes.seedProducer);
      }
    } catch {
      profileRole = null;
      profileTenantId = null;
      profileScopes = {};
      hasProfilePayload = false;
    }

    const role = claimRole ?? profileRole;
    const tenantId = claimTenantId ?? profileTenantId;
    const producerScopes = mergeProducerScopes(claimScopes, profileScopes);

    let source: ResolvedAuthClaims['source'] = 'none';
    if (hasClaimPayload && hasProfilePayload) {
      source = 'mixed';
    } else if (hasClaimPayload) {
      source = 'claims';
    } else if (hasProfilePayload) {
      source = 'profile';
    }

    return {
      role,
      tenantId,
      producerScopes,
      source,
    };
  },
};
