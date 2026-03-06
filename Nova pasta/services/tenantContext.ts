import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { authClaimsService } from './authClaimsService';

export interface TenantContext {
  tenantId: string;
  userId: string;
}

const normalizeString = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const resolveTenantFromUserProfile = async (userId: string): Promise<string> => {
  const snapshot = await getDoc(doc(db, 'users', userId));
  if (!snapshot.exists()) {
    return '';
  }

  const raw = snapshot.data() as Record<string, unknown>;
  return normalizeString(raw.tenantId) || userId;
};

export const resolveTenantContext = async (): Promise<TenantContext> => {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    throw new Error('Usuario nao autenticado.');
  }

  const claims = await authClaimsService.resolveClaims(firebaseUser, {
    forceRefresh: false,
    allowProfileFallback: true,
  });

  const tenantIdFromClaims = normalizeString(claims.tenantId);
  if (tenantIdFromClaims) {
    return {
      tenantId: tenantIdFromClaims,
      userId: firebaseUser.uid,
    };
  }

  const tenantIdFromProfile = await resolveTenantFromUserProfile(firebaseUser.uid);
  if (!tenantIdFromProfile) {
    // Defensive fallback: keeps module loading and preserves isolation per user when tenant metadata is missing.
    return {
      tenantId: firebaseUser.uid,
      userId: firebaseUser.uid,
    };
  }

  return {
    tenantId: tenantIdFromProfile,
    userId: firebaseUser.uid,
  };
};

export const hasTenantAccess = (
  raw: Record<string, unknown>,
  context: TenantContext
): boolean => {
  const tenantId = normalizeString(raw.tenantId);
  if (tenantId) {
    return tenantId === context.tenantId;
  }

  const createdByUserId = normalizeString(raw.createdByUserId ?? raw.userId ?? raw.requestorUserId);
  if (createdByUserId) {
    return createdByUserId === context.userId;
  }

  return false;
};

export const withTenantFields = <T extends object>(
  payload: T,
  context: TenantContext
): T & { tenantId: string; createdByUserId: string } => ({
  ...payload,
  tenantId: context.tenantId,
  createdByUserId: context.userId,
});
