import {
  collection,
  doc,
  getDoc,
  getDocs,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { MilkDepositAuthorization, MilkSampleTest, MilkTank, MilkTankEntry } from '../types';
import { hasTenantAccess, resolveTenantContext, withTenantFields } from './tenantContext';
import { immutableAuditService } from './immutableAuditService';

const milkTanksCollection = collection(db, 'milkTanks');
const milkAuthorizationsCollection = collection(db, 'milkDepositAuthorizations');
const milkSampleTestsCollection = collection(db, 'milkSampleTests');
const milkEntriesCollection = collection(db, 'milkTankEntries');

const nowIso = (): string => new Date().toISOString();

const toMilkTank = (id: string, raw: Record<string, unknown>): MilkTank => ({
  id,
  tenantId: raw.tenantId ? String(raw.tenantId) : undefined,
  propertyId: raw.propertyId ? String(raw.propertyId) : undefined,
  name: String(raw.name ?? ''),
  capacityKg: Number(raw.capacityKg ?? 0),
  currentWeightKg: Number(raw.currentWeightKg ?? 0),
  status: String(raw.status ?? 'ATIVO') as MilkTank['status'],
  updatedAt: String(raw.updatedAt ?? nowIso()),
  createdAt: String(raw.createdAt ?? nowIso()),
});

const toAuthorization = (id: string, raw: Record<string, unknown>): MilkDepositAuthorization => ({
  id,
  tenantId: raw.tenantId ? String(raw.tenantId) : undefined,
  propertyId: raw.propertyId ? String(raw.propertyId) : undefined,
  producerId: raw.producerId ? String(raw.producerId) : undefined,
  producerName: String(raw.producerName ?? ''),
  producerCredential: String(raw.producerCredential ?? ''),
  badgeId: String(raw.badgeId ?? ''),
  identityDocument: String(raw.identityDocument ?? ''),
  authorizedByUserId: raw.authorizedByUserId ? String(raw.authorizedByUserId) : undefined,
  authorizedByName: raw.authorizedByName ? String(raw.authorizedByName) : undefined,
  authorizedAt: String(raw.authorizedAt ?? nowIso()),
  validUntil: String(raw.validUntil ?? nowIso()),
  status: String(raw.status ?? 'ATIVA') as MilkDepositAuthorization['status'],
  notes: raw.notes ? String(raw.notes) : undefined,
  createdAt: String(raw.createdAt ?? nowIso()),
  updatedAt: String(raw.updatedAt ?? nowIso()),
});

const toSampleTest = (id: string, raw: Record<string, unknown>): MilkSampleTest => ({
  id,
  tenantId: raw.tenantId ? String(raw.tenantId) : undefined,
  tankId: String(raw.tankId ?? ''),
  producerCredential: String(raw.producerCredential ?? ''),
  batchCode: String(raw.batchCode ?? ''),
  fatPercent: Number(raw.fatPercent ?? 0),
  proteinPercent: Number(raw.proteinPercent ?? 0),
  ccs: Number(raw.ccs ?? 0),
  temperatureC: Number(raw.temperatureC ?? 0),
  result: String(raw.result ?? 'ALERTA') as MilkSampleTest['result'],
  collectedAt: String(raw.collectedAt ?? nowIso()),
  collectedBy: raw.collectedBy ? String(raw.collectedBy) : undefined,
  notes: raw.notes ? String(raw.notes) : undefined,
});

const toTankEntry = (id: string, raw: Record<string, unknown>): MilkTankEntry => ({
  id,
  tenantId: raw.tenantId ? String(raw.tenantId) : undefined,
  tankId: String(raw.tankId ?? ''),
  authorizationId: String(raw.authorizationId ?? ''),
  producerCredential: String(raw.producerCredential ?? ''),
  producerName: String(raw.producerName ?? ''),
  badgeId: String(raw.badgeId ?? ''),
  weightBeforeKg: Number(raw.weightBeforeKg ?? 0),
  weightAddedKg: Number(raw.weightAddedKg ?? 0),
  weightAfterKg: Number(raw.weightAfterKg ?? 0),
  recordedAt: String(raw.recordedAt ?? nowIso()),
  recordedBy: raw.recordedBy ? String(raw.recordedBy) : undefined,
  sampleTestId: raw.sampleTestId ? String(raw.sampleTestId) : undefined,
});

export const milkCollectionService = {
  async listTanks(): Promise<MilkTank[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(milkTanksCollection);
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, tank: toMilkTank(docSnapshot.id, raw) };
      })
      .filter((item: { raw: Record<string, unknown> }) => hasTenantAccess(item.raw, context))
      .map((item: { tank: MilkTank }) => item.tank)
      .sort((a: MilkTank, b: MilkTank) => a.name.localeCompare(b.name));
  },

  async createTank(payload: {
    name: string;
    capacityKg: number;
    propertyId?: string;
    actor: string;
  }): Promise<MilkTank> {
    if (!payload.name.trim()) {
      throw new Error('Informe o nome do tanque.');
    }
    if (!Number.isFinite(payload.capacityKg) || payload.capacityKg <= 0) {
      throw new Error('Capacidade do tanque deve ser maior que zero.');
    }

    const context = await resolveTenantContext();
    const now = nowIso();
    const tank: MilkTank = {
      id: `MTK-${Date.now()}`,
      tenantId: context.tenantId,
      propertyId: payload.propertyId?.trim() || undefined,
      name: payload.name.trim(),
      capacityKg: Number(payload.capacityKg),
      currentWeightKg: 0,
      status: 'ATIVO',
      createdAt: now,
      updatedAt: now,
    };

    const audit = await immutableAuditService.append({
      actor: payload.actor,
      action: 'MILK_TANK_CREATED',
      details: `Tanque ${tank.name} cadastrado com capacidade ${tank.capacityKg.toFixed(2)} kg.`,
      metadata: {
        tankId: tank.id,
        capacityKg: tank.capacityKg,
      },
    });

    await setDoc(
      doc(db, 'milkTanks', tank.id),
      withTenantFields(
        {
          ...tank,
          immutableAuditHash: audit.hash,
          createdAtTs: serverTimestamp(),
          updatedAtTs: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return tank;
  },

  async listAuthorizations(): Promise<MilkDepositAuthorization[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(milkAuthorizationsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, authorization: toAuthorization(docSnapshot.id, raw) };
      })
      .filter((item: { raw: Record<string, unknown> }) => hasTenantAccess(item.raw, context))
      .map((item: { authorization: MilkDepositAuthorization }) => item.authorization)
      .sort((a: MilkDepositAuthorization, b: MilkDepositAuthorization) => b.createdAt.localeCompare(a.createdAt));
  },

  async createAuthorization(payload: {
    producerName: string;
    producerCredential: string;
    badgeId: string;
    identityDocument: string;
    validUntil: string;
    notes?: string;
    propertyId?: string;
    actor: string;
  }): Promise<MilkDepositAuthorization> {
    if (!payload.producerName.trim() || !payload.producerCredential.trim()) {
      throw new Error('Informe produtor e credencial de produtor.');
    }
    if (!payload.badgeId.trim() || !payload.identityDocument.trim()) {
      throw new Error('Informe cracha e identidade para autorizar descarga.');
    }
    const validUntil = new Date(payload.validUntil);
    if (Number.isNaN(validUntil.getTime())) {
      throw new Error('Validade da autorizacao invalida.');
    }
    if (validUntil.getTime() <= Date.now()) {
      throw new Error('A validade da autorizacao deve estar no futuro.');
    }

    const context = await resolveTenantContext();
    const now = nowIso();
    const authorization: MilkDepositAuthorization = {
      id: `MAU-${Date.now()}`,
      tenantId: context.tenantId,
      propertyId: payload.propertyId?.trim() || undefined,
      producerName: payload.producerName.trim(),
      producerCredential: payload.producerCredential.trim().toUpperCase(),
      badgeId: payload.badgeId.trim().toUpperCase(),
      identityDocument: payload.identityDocument.trim().toUpperCase(),
      authorizedByUserId: context.userId,
      authorizedByName: payload.actor,
      authorizedAt: now,
      validUntil: validUntil.toISOString(),
      status: 'ATIVA',
      notes: payload.notes?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };

    const audit = await immutableAuditService.append({
      actor: payload.actor,
      action: 'MILK_DEPOSIT_AUTHORIZATION_CREATED',
      details: `Autorizacao de descarga criada para ${authorization.producerName}.`,
      metadata: {
        authorizationId: authorization.id,
        producerCredential: authorization.producerCredential,
        badgeId: authorization.badgeId,
        validUntil: authorization.validUntil,
      },
    });

    await setDoc(
      doc(db, 'milkDepositAuthorizations', authorization.id),
      withTenantFields(
        {
          ...authorization,
          immutableAuditHash: audit.hash,
          createdAtTs: serverTimestamp(),
          updatedAtTs: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return authorization;
  },

  async listSampleTests(tankId?: string): Promise<MilkSampleTest[]> {
    const context = await resolveTenantContext();
    const normalizedTankId = tankId?.trim();
    const snapshot = await getDocs(milkSampleTestsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, sample: toSampleTest(docSnapshot.id, raw) };
      })
      .filter((item: { raw: Record<string, unknown> }) => hasTenantAccess(item.raw, context))
      .map((item: { sample: MilkSampleTest }) => item.sample)
      .filter((sample: MilkSampleTest) => !normalizedTankId || sample.tankId === normalizedTankId)
      .sort((a: MilkSampleTest, b: MilkSampleTest) => b.collectedAt.localeCompare(a.collectedAt));
  },

  async registerSampleTest(payload: {
    tankId: string;
    producerCredential: string;
    batchCode: string;
    fatPercent: number;
    proteinPercent: number;
    ccs: number;
    temperatureC: number;
    result: MilkSampleTest['result'];
    notes?: string;
    actor: string;
  }): Promise<MilkSampleTest> {
    if (!payload.tankId.trim() || !payload.batchCode.trim() || !payload.producerCredential.trim()) {
      throw new Error('Informe tanque, lote e credencial do produtor para registrar a amostra.');
    }

    const context = await resolveTenantContext();
    const tankRef = doc(db, 'milkTanks', payload.tankId.trim());
    const tankSnapshot = await getDoc(tankRef);
    if (!tankSnapshot.exists()) {
      throw new Error('Tanque de leite nao encontrado.');
    }
    if (!hasTenantAccess(tankSnapshot.data() as Record<string, unknown>, context)) {
      throw new Error('Sem permissao para registrar amostra neste tanque.');
    }

    const sample: MilkSampleTest = {
      id: `MST-${Date.now()}`,
      tenantId: context.tenantId,
      tankId: payload.tankId.trim(),
      producerCredential: payload.producerCredential.trim().toUpperCase(),
      batchCode: payload.batchCode.trim().toUpperCase(),
      fatPercent: Number(payload.fatPercent),
      proteinPercent: Number(payload.proteinPercent),
      ccs: Number(payload.ccs),
      temperatureC: Number(payload.temperatureC),
      result: payload.result,
      collectedAt: nowIso(),
      collectedBy: payload.actor,
      notes: payload.notes?.trim() || undefined,
    };

    const audit = await immutableAuditService.append({
      actor: payload.actor,
      action: 'MILK_SAMPLE_TEST_RECORDED',
      details: `Amostra ${sample.batchCode} registrada no tanque ${sample.tankId} com resultado ${sample.result}.`,
      metadata: {
        sampleId: sample.id,
        tankId: sample.tankId,
        result: sample.result,
      },
    });

    await setDoc(
      doc(db, 'milkSampleTests', sample.id),
      withTenantFields(
        {
          ...sample,
          immutableAuditHash: audit.hash,
          createdAtTs: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return sample;
  },

  async listEntries(tankId?: string): Promise<MilkTankEntry[]> {
    const context = await resolveTenantContext();
    const normalizedTankId = tankId?.trim();
    const snapshot = await getDocs(milkEntriesCollection);
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, entry: toTankEntry(docSnapshot.id, raw) };
      })
      .filter((item: { raw: Record<string, unknown> }) => hasTenantAccess(item.raw, context))
      .map((item: { entry: MilkTankEntry }) => item.entry)
      .filter((entry: MilkTankEntry) => !normalizedTankId || entry.tankId === normalizedTankId)
      .sort((a: MilkTankEntry, b: MilkTankEntry) => b.recordedAt.localeCompare(a.recordedAt));
  },

  async registerTankDeposit(payload: {
    tankId: string;
    authorizationId: string;
    weightAddedKg: number;
    sampleTestId?: string;
    actor: string;
  }): Promise<MilkTankEntry> {
    if (!payload.tankId.trim() || !payload.authorizationId.trim()) {
      throw new Error('Informe tanque e autorizacao para registrar descarga.');
    }
    if (!Number.isFinite(payload.weightAddedKg) || payload.weightAddedKg <= 0) {
      throw new Error('Peso adicionado deve ser maior que zero.');
    }

    const context = await resolveTenantContext();
    const tankRef = doc(db, 'milkTanks', payload.tankId.trim());
    const authorizationRef = doc(db, 'milkDepositAuthorizations', payload.authorizationId.trim());

    const [tankSnapshot, authorizationSnapshot] = await Promise.all([getDoc(tankRef), getDoc(authorizationRef)]);
    if (!tankSnapshot.exists()) {
      throw new Error('Tanque nao encontrado.');
    }
    if (!authorizationSnapshot.exists()) {
      throw new Error('Autorizacao de descarga nao encontrada.');
    }

    const tankRaw = tankSnapshot.data() as Record<string, unknown>;
    const authorizationRaw = authorizationSnapshot.data() as Record<string, unknown>;
    if (!hasTenantAccess(tankRaw, context) || !hasTenantAccess(authorizationRaw, context)) {
      throw new Error('Sem permissao para registrar descarga neste contexto.');
    }

    const tank = toMilkTank(tankSnapshot.id, tankRaw);
    const authorization = toAuthorization(authorizationSnapshot.id, authorizationRaw);
    if (authorization.status !== 'ATIVA') {
      throw new Error('Autorizacao nao esta ativa para uso.');
    }

    const validUntil = new Date(authorization.validUntil);
    if (Number.isNaN(validUntil.getTime()) || validUntil.getTime() < Date.now()) {
      throw new Error('Autorizacao de descarga vencida.');
    }

    const weightBeforeKg = Number(tank.currentWeightKg ?? 0);
    const weightAfterKg = Number((weightBeforeKg + payload.weightAddedKg).toFixed(3));
    if (weightAfterKg > tank.capacityKg) {
      throw new Error(`Tanque excede capacidade (${tank.capacityKg.toFixed(2)} kg).`);
    }

    const now = nowIso();
    const entry: MilkTankEntry = {
      id: `MTE-${Date.now()}`,
      tenantId: context.tenantId,
      tankId: tank.id,
      authorizationId: authorization.id,
      producerCredential: authorization.producerCredential,
      producerName: authorization.producerName,
      badgeId: authorization.badgeId,
      weightBeforeKg,
      weightAddedKg: Number(payload.weightAddedKg),
      weightAfterKg,
      recordedAt: now,
      recordedBy: payload.actor,
      sampleTestId: payload.sampleTestId?.trim() || undefined,
    };

    const audit = await immutableAuditService.append({
      actor: payload.actor,
      action: 'MILK_TANK_DEPOSIT_REGISTERED',
      details: `Descarga registrada no tanque ${tank.name}: +${entry.weightAddedKg.toFixed(2)} kg.`,
      metadata: {
        tankId: tank.id,
        authorizationId: authorization.id,
        weightBeforeKg,
        weightAddedKg: entry.weightAddedKg,
        weightAfterKg,
        producerCredential: entry.producerCredential,
      },
    });

    await Promise.all([
      setDoc(
        doc(db, 'milkTankEntries', entry.id),
        withTenantFields(
          {
            ...entry,
            immutableAuditHash: audit.hash,
            createdAtTs: serverTimestamp(),
          },
          context
        ),
        { merge: true }
      ),
      updateDoc(tankRef, {
        currentWeightKg: weightAfterKg,
        status: 'ATIVO',
        updatedAt: now,
        updatedAtTs: serverTimestamp(),
      }),
      updateDoc(authorizationRef, {
        status: 'USADA',
        updatedAt: now,
        updatedAtTs: serverTimestamp(),
      }),
    ]);

    return entry;
  },
};
