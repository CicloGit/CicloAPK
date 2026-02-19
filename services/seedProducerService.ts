import { collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { CertificationStep, SeedField, SeedLot } from '../types';
import { authClaimsService } from './authClaimsService';

type SeedsCollection = 'seedFields' | 'seedLots' | 'seedCertifications';

const tenantSeedsCollection = (tenantId: string, collectionName: SeedsCollection) =>
  collection(db, 'tenants', tenantId, collectionName);

const resolveSeedContext = async (): Promise<{ tenantId: string }> => {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    throw new Error('Usuario nao autenticado.');
  }

  const claims = await authClaimsService.resolveClaims(firebaseUser, {
    forceRefresh: false,
    allowProfileFallback: true,
  });

  if (claims.role !== 'PRODUCER') {
    throw new Error('Acesso negado ao modulo de sementes.');
  }

  if (claims.producerScopes.seedProducer !== true) {
    throw new Error('Scope producerScopes.seedProducer obrigatorio para o modulo de sementes.');
  }

  if (!claims.tenantId) {
    throw new Error('tenantId ausente nas claims/perfil.');
  }

  return {
    tenantId: claims.tenantId,
  };
};

const toSeedField = (id: string, raw: Record<string, unknown>): SeedField => ({
  id,
  name: String(raw.name ?? ''),
  variety: String(raw.variety ?? ''),
  generation: (raw.generation as SeedField['generation']) ?? 'C1',
  area: Number(raw.area ?? 0),
  status: (raw.status as SeedField['status']) ?? 'PREPARO',
  expectedYield: Number(raw.expectedYield ?? 0),
});

const toSeedLot = (id: string, raw: Record<string, unknown>): SeedLot => ({
  id,
  fieldId: String(raw.fieldId ?? ''),
  variety: String(raw.variety ?? ''),
  generation: (raw.generation as SeedLot['generation']) ?? 'C1',
  quantity: Number(raw.quantity ?? 0),
  germinationRate: Number(raw.germinationRate ?? 0),
  purity: Number(raw.purity ?? 0),
  storageLocation: String(raw.storageLocation ?? ''),
});

const toCertificationStep = (id: string, raw: Record<string, unknown>): CertificationStep => ({
  name: String(raw.name ?? id),
  status: (raw.status as CertificationStep['status']) ?? 'PENDENTE',
  date: raw.date ? String(raw.date) : undefined,
});

export const seedProducerService = {
  async listSeedFields(): Promise<SeedField[]> {
    const { tenantId } = await resolveSeedContext();
    const snapshot = await getDocs(tenantSeedsCollection(tenantId, 'seedFields'));
    return snapshot.docs.map((docSnapshot: any) => toSeedField(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listSeedLots(): Promise<SeedLot[]> {
    const { tenantId } = await resolveSeedContext();
    const snapshot = await getDocs(tenantSeedsCollection(tenantId, 'seedLots'));
    return snapshot.docs.map((docSnapshot: any) => toSeedLot(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listCertificationSteps(): Promise<CertificationStep[]> {
    const { tenantId } = await resolveSeedContext();
    const snapshot = await getDocs(tenantSeedsCollection(tenantId, 'seedCertifications'));
    return snapshot.docs.map((docSnapshot: any) =>
      toCertificationStep(docSnapshot.id, docSnapshot.data() as Record<string, unknown>)
    );
  },
};

