import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import { Property, Pasture, ProductionProject, PastureManagementHistoryItem } from '../types';
import { Validators, ValidationResult } from '../lib/validators';
import { db } from '../config/firebase';
import { backendApi } from './backendApi';
import { TenantContext, hasTenantAccess, resolveTenantContext, withTenantFields } from './tenantContext';

const propertyCollection = collection(db, 'properties');
const pastureCollection = collection(db, 'pastures');
const projectCollection = collection(db, 'productionProjects');

const DEFAULT_PROPERTY_ID = 'property-default';
const DEFAULT_MANUAL_DELETE_PASSWORD = 'CICLO123';
const MANUAL_DELETE_PASSWORD = String(import.meta.env.VITE_MANUAL_DELETE_PASSWORD ?? DEFAULT_MANUAL_DELETE_PASSWORD).trim();
const TENANT_DOC_QUERY_LIMIT = 300;

const EMPTY_PROPERTY_TEMPLATE: Property = {
  id: DEFAULT_PROPERTY_ID,
  name: '',
  carNumber: '',
  totalArea: 0,
  currentStockingCapacity: 0,
  animalCount: 0,
  pastureManagementHistory: [],
  pastureInvestmentPerHa: 0,
  cattleInvestmentPerHa: 0,
  infrastructure: [],
  machinery: [],
  perimeter: [],
  satelliteImageUrl: '',
};
const buildEmptyProperty = (id: string = DEFAULT_PROPERTY_ID): Property => ({
  ...EMPTY_PROPERTY_TEMPLATE,
  id,
});

const toProperty = (id: string, raw: Record<string, unknown>): Property => ({
  ...buildEmptyProperty(id),
  ...raw,
  id,
  pastureManagementHistory: Array.isArray(raw.pastureManagementHistory)
    ? (raw.pastureManagementHistory as PastureManagementHistoryItem[])
    : [],
  perimeter: Array.isArray(raw.perimeter) ? (raw.perimeter as { x: number; y: number }[]) : [],
  infrastructure: Array.isArray(raw.infrastructure) ? (raw.infrastructure as Property['infrastructure']) : [],
  machinery: Array.isArray(raw.machinery) ? (raw.machinery as Property['machinery']) : [],
});

const toPasture = (id: string, raw: Record<string, unknown>): Pasture => ({
  id,
  name: String(raw.name ?? ''),
  area: Number(raw.area ?? 0),
  grassHeight: Number(raw.grassHeight ?? 0),
  cultivar: String(raw.cultivar ?? ''),
  estimatedForageProduction: Number(raw.estimatedForageProduction ?? 0),
  grazingPeriod: {
    start: String((raw.grazingPeriod as { start?: string })?.start ?? ''),
    end: String((raw.grazingPeriod as { end?: string })?.end ?? ''),
  },
  entryDate: String(raw.entryDate ?? ''),
  exitDate: String(raw.exitDate ?? ''),
  stockingRate: String(raw.stockingRate ?? ''),
  managementRecommendations: (raw.managementRecommendations as string[]) ?? [],
  managementHistory: (raw.managementHistory as string[]) ?? [],
  animals: (raw.animals as Pasture['animals']) ?? [],
  polygon: (raw.polygon as { x: number; y: number }[]) ?? [],
  center: (raw.center as { x: number; y: number } | undefined) ?? undefined,
  geoPolygon: Array.isArray(raw.geoPolygon)
    ? (raw.geoPolygon as Array<{ lat: unknown; lon: unknown }>).map((point) => ({
        lat: Number(point.lat ?? 0),
        lon: Number(point.lon ?? 0),
      }))
    : undefined,
  geoCenter:
    raw.geoCenter && typeof raw.geoCenter === 'object'
      ? {
          lat: Number((raw.geoCenter as { lat?: unknown }).lat ?? 0),
          lon: Number((raw.geoCenter as { lon?: unknown }).lon ?? 0),
        }
      : undefined,
});

const toProject = (id: string, raw: Record<string, unknown>): ProductionProject => ({
  id,
  name: String(raw.name ?? ''),
  type: (raw.type as ProductionProject['type']) ?? 'Agricultura',
  variety: raw.variety ? String(raw.variety) : undefined,
  status: (raw.status as ProductionProject['status']) ?? 'PLANEJAMENTO',
  volume: String(raw.volume ?? ''),
  prazo: String(raw.prazo ?? ''),
  precoAlvo: String(raw.precoAlvo ?? ''),
  aReceber: Number(raw.aReceber ?? 0),
  aPagar: Number(raw.aPagar ?? 0),
  limiteVigente: Number(raw.limiteVigente ?? 0),
  limiteUtilizado: Number(raw.limiteUtilizado ?? 0),
});

const isProjectDeleted = (raw: Record<string, unknown>): boolean => {
  return Boolean(raw.isDeleted) || Boolean(raw.deletedAt);
};

const normalizePointToCanvas = (
  points: { lat: string; long: string }[]
): { x: number; y: number }[] => {
  const parsed = points.map((point) => ({
    lat: Number(point.lat),
    lon: Number(point.long),
  }));
  const minLat = Math.min(...parsed.map((point) => point.lat));
  const maxLat = Math.max(...parsed.map((point) => point.lat));
  const minLon = Math.min(...parsed.map((point) => point.lon));
  const maxLon = Math.max(...parsed.map((point) => point.lon));

  const latRange = Math.max(maxLat - minLat, 0.00001);
  const lonRange = Math.max(maxLon - minLon, 0.00001);

  return parsed.map((point) => ({
    x: 20 + ((point.lon - minLon) / lonRange) * 60,
    y: 20 + ((point.lat - minLat) / latRange) * 60,
  }));
};

const estimateAreaFromPoints = (points: { lat: string; long: string }[]): number => {
  const cartesian = points.map((point) => ({
    x: Number(point.long),
    y: Number(point.lat),
  }));

  let area = 0;
  for (let i = 0; i < cartesian.length; i += 1) {
    const current = cartesian[i];
    const next = cartesian[(i + 1) % cartesian.length];
    area += current.x * next.y - next.x * current.y;
  }

  const absolute = Math.abs(area / 2);
  const hectareFactor = 110_000;
  const estimatedHectare = absolute * hectareFactor;
  return Number(Math.max(estimatedHectare, 1).toFixed(2));
};

const readTenantScopedDocs = async (
  sourceCollection: any,
  context: TenantContext,
  maxDocs: number = TENANT_DOC_QUERY_LIMIT
): Promise<any[]> => {
  const tenantSnapshot = await getDocs(
    query(sourceCollection, where('tenantId', '==', context.tenantId), limit(maxDocs))
  );
  if (!tenantSnapshot.empty) {
    return tenantSnapshot.docs;
  }

  const legacySnapshot = await getDocs(query(sourceCollection, limit(maxDocs)));
  return legacySnapshot.docs.filter((docSnapshot: any) =>
    hasTenantAccess(docSnapshot.data() as Record<string, unknown>, context)
  );
};

async function resolvePrimaryPropertyId(
  context: TenantContext,
  defaultPropertyId: string = DEFAULT_PROPERTY_ID
): Promise<string> {
  const snapshot = await readTenantScopedDocs(propertyCollection, context, 1);
  if (snapshot.length === 0) {
    return defaultPropertyId;
  }

  return snapshot[0].id;
}

export const propertyService = {
  getEmptyProperty(propertyId: string = DEFAULT_PROPERTY_ID): Property {
    return buildEmptyProperty(propertyId);
  },

  async listProductionProjects(): Promise<ProductionProject[]> {
    const context = await resolveTenantContext();
    const docs = await readTenantScopedDocs(projectCollection, context);
    return docs
      .filter((docSnapshot: any) => !isProjectDeleted(docSnapshot.data() as Record<string, unknown>))
      .map((docSnapshot: any) => toProject(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: ProductionProject, b: ProductionProject) => a.name.localeCompare(b.name));
  },

  async loadWorkspace(
    propertyId: string = DEFAULT_PROPERTY_ID
  ): Promise<{ property: Property; activities: ProductionProject[]; pastures: Pasture[] }> {
    const context = await resolveTenantContext();
    const resolvedPropertyId = propertyId || DEFAULT_PROPERTY_ID;

    const [propertySnapshot, scopedPropertyDocs, scopedActivityDocs, scopedPastureDocs] = await Promise.all([
      getDoc(doc(db, 'properties', resolvedPropertyId)),
      readTenantScopedDocs(propertyCollection, context, 1),
      readTenantScopedDocs(projectCollection, context),
      readTenantScopedDocs(pastureCollection, context),
    ]);

    let property: Property;
    if (propertySnapshot.exists() && hasTenantAccess(propertySnapshot.data() as Record<string, unknown>, context)) {
      property = toProperty(propertySnapshot.id, propertySnapshot.data() as Record<string, unknown>);
    } else if (scopedPropertyDocs.length > 0) {
      const fallbackProperty = scopedPropertyDocs[0];
      property = toProperty(fallbackProperty.id, fallbackProperty.data() as Record<string, unknown>);
    } else {
      property = buildEmptyProperty(resolvedPropertyId);
    }

    const activities = scopedActivityDocs
      .filter((docSnapshot: any) => !isProjectDeleted(docSnapshot.data() as Record<string, unknown>))
      .map((docSnapshot: any) => toProject(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: ProductionProject, b: ProductionProject) => a.name.localeCompare(b.name));

    const pastures = scopedPastureDocs
      .map((docSnapshot: any) => toPasture(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: Pasture, b: Pasture) => a.name.localeCompare(b.name));

    return {
      property,
      activities,
      pastures,
    };
  },

  async searchCAR(carInput: string): Promise<{ success: boolean; data?: unknown; message?: string }> {
    try {
      const data = await backendApi.lookupCar(carInput);
      return { success: true, data };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'CAR nao encontrado. Verifique o numero do recibo.';
      return { success: false, message };
    }
  },

  async saveDivision(divisionData: {
    name: string;
    points: { lat: string; long: string }[];
    cultivar?: string;
    stockingRate?: string;
    estimatedForageProduction?: number;
    entryDate?: string;
    exitDate?: string;
  }): Promise<{ success: boolean; newPasture?: Pasture; message?: string }> {
    const context = await resolveTenantContext();
    const validation = Validators.division(divisionData);
    if (!validation.success) {
      return { success: false, message: validation.error };
    }

    const { name, points } = divisionData;
    const polygonPoints = normalizePointToCanvas(points);
    const geoPolygonPoints = points.map((point) => ({
      lat: Number(point.lat),
      lon: Number(point.long),
    }));
    const estimatedArea = estimateAreaFromPoints(points);
    const propertyId = await resolvePrimaryPropertyId(context);
    const normalizedCultivar = String(divisionData.cultivar ?? '').trim();
    const normalizedStockingRate = String(divisionData.stockingRate ?? '').trim();
    const normalizedForageProduction =
      divisionData.estimatedForageProduction !== undefined && divisionData.estimatedForageProduction !== null
        ? Number(divisionData.estimatedForageProduction)
        : 0;
    const normalizedEntryDate = String(divisionData.entryDate ?? '').trim();
    const normalizedExitDate = String(divisionData.exitDate ?? '').trim();

    const newPasture: Pasture = {
      id: `PAST-${Date.now()}`,
      name,
      area: estimatedArea,
      grassHeight: 0,
      cultivar: normalizedCultivar || 'N/A',
      estimatedForageProduction: Number.isFinite(normalizedForageProduction) ? normalizedForageProduction : 0,
      grazingPeriod: { start: '', end: '' },
      entryDate: normalizedEntryDate,
      exitDate: normalizedExitDate,
      stockingRate: normalizedStockingRate || '0 UA/ha',
      managementRecommendations: [],
      managementHistory: [],
      animals: [],
      polygon: polygonPoints,
      center: polygonPoints[0],
      geoPolygon: geoPolygonPoints,
      geoCenter: geoPolygonPoints[0],
    };

    await setDoc(
      doc(db, 'pastures', newPasture.id),
      withTenantFields(
        {
          ...newPasture,
          propertyId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return { success: true, newPasture };
  },

  async saveActivity(activityData: {
    sector: ProductionProject['type'];
    variety: string;
    name: string;
    volume: string;
  }): Promise<{ success: boolean; newProject?: ProductionProject; message?: string }> {
    const context = await resolveTenantContext();
    const validation = Validators.activity(activityData);
    if (!validation.success) {
      return { success: false, message: validation.error };
    }

    const newProject: ProductionProject = {
      id: `PROJ-${Date.now()}`,
      name: activityData.name,
      type: activityData.sector,
      variety: activityData.variety,
      status: 'PLANEJAMENTO',
      volume: activityData.volume,
      prazo: 'A definir',
      precoAlvo: 'A definir',
      aReceber: 0,
      aPagar: 0,
      limiteVigente: 0,
      limiteUtilizado: 0,
    };

    await setDoc(
      doc(db, 'productionProjects', newProject.id),
      withTenantFields(
        {
          ...newProject,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return { success: true, newProject };
  },

  async updateProperty(propertyData: Property): Promise<ValidationResult> {
    const validation = Validators.property(propertyData);
    if (!validation.success) {
      return validation;
    }

    try {
      const context = await resolveTenantContext();
      const targetPropertyId = propertyData.id || (await resolvePrimaryPropertyId(context));
      const propertyRef = doc(db, 'properties', targetPropertyId);
      const snapshot = await getDoc(propertyRef);
      if (snapshot.exists() && !hasTenantAccess(snapshot.data() as Record<string, unknown>, context)) {
        return { success: false, error: 'Sem permissao para atualizar propriedade de outro tenant.' };
      }

      await setDoc(
        propertyRef,
        withTenantFields(
          {
            ...propertyData,
            id: targetPropertyId,
            updatedAt: serverTimestamp(),
          },
          context
        ),
        { merge: true }
      );

      return validation;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Nao foi possivel atualizar a propriedade.';
      return { success: false, error: message };
    }
  },

  async deleteActivity(activityId: string, authorizationPassword: string): Promise<{ success: boolean; message?: string }> {
    const informedPassword = authorizationPassword.trim();
    if (!informedPassword) {
      return { success: false, message: 'Informe a senha de autorizacao para excluir.' };
    }
    if (informedPassword !== MANUAL_DELETE_PASSWORD) {
      return { success: false, message: 'Senha de autorizacao invalida.' };
    }

    const context = await resolveTenantContext();
    const normalizedActivityId = activityId.trim();
    if (!normalizedActivityId) {
      return { success: false, message: 'Atividade invalida.' };
    }

    const activityRef = doc(db, 'productionProjects', normalizedActivityId);
    const snapshot = await getDoc(activityRef);
    if (snapshot.exists() && !hasTenantAccess(snapshot.data() as Record<string, unknown>, context)) {
      return { success: false, message: 'Sem permissao para remover atividade de outro tenant.' };
    }

    try {
      await deleteDoc(activityRef);
      return { success: true };
    } catch {
      try {
        await setDoc(
          activityRef,
          withTenantFields(
            {
              isDeleted: true,
              deletedAt: serverTimestamp(),
              status: 'ENCERRADO',
              updatedAt: serverTimestamp(),
            },
            context
          ),
          { merge: true }
        );
        return { success: true };
      } catch {
        return { success: false, message: 'Nao foi possivel remover a atividade.' };
      }
    }
  },

  addHistoryItem(property: Property, newItem: Omit<PastureManagementHistoryItem, 'date'>): Property {
    const today = new Date().toLocaleDateString('pt-BR');
    const newHistoryEntry: PastureManagementHistoryItem = { ...newItem, date: today };
    const updatedHistory = [newHistoryEntry, ...property.pastureManagementHistory];

    return {
      ...property,
      pastureManagementHistory: updatedHistory,
    };
  },
};
