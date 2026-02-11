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
} from 'firebase/firestore';
import {
  mockPropertyData,
  mockProductionProjects,
  mockAnimalDetails,
} from '../constants';
import { Property, Pasture, ProductionProject, PastureManagementHistoryItem } from '../types';
import { Validators, ValidationResult } from '../lib/validators';
import { db } from '../config/firebase';
import { backendApi } from './backendApi';

const propertyCollection = collection(db, 'properties');
const pastureCollection = collection(db, 'pastures');
const projectCollection = collection(db, 'productionProjects');

const DEFAULT_PROPERTY_ID = mockPropertyData.id;
const DEFAULT_MANUAL_DELETE_PASSWORD = 'CICLO123';
const MANUAL_DELETE_PASSWORD = String(import.meta.env.VITE_MANUAL_DELETE_PASSWORD ?? DEFAULT_MANUAL_DELETE_PASSWORD).trim();
let seeded = false;

const toProperty = (id: string, raw: Record<string, unknown>): Property => ({
  ...mockPropertyData,
  ...raw,
  id,
  pastureManagementHistory: (raw.pastureManagementHistory as PastureManagementHistoryItem[]) ?? [],
  perimeter: (raw.perimeter as { x: number; y: number }[]) ?? mockPropertyData.perimeter,
  infrastructure: (raw.infrastructure as Property['infrastructure']) ?? mockPropertyData.infrastructure,
  machinery: (raw.machinery as Property['machinery']) ?? mockPropertyData.machinery,
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

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  const propertySnapshot = await getDoc(doc(db, 'properties', DEFAULT_PROPERTY_ID));
  if (propertySnapshot.exists()) {
    seeded = true;
    return;
  }

  await setDoc(
    doc(db, 'properties', DEFAULT_PROPERTY_ID),
    {
      ...mockPropertyData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  await Promise.all(
    mockProductionProjects.map((project) =>
      setDoc(
        doc(db, 'productionProjects', project.id),
        {
          ...project,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    )
  );

  const seededPastures = Object.values(mockAnimalDetails).flatMap((detail) => detail.pastures);
  await Promise.all(
    seededPastures.map((pasture) =>
      setDoc(
        doc(db, 'pastures', pasture.id),
        {
          ...pasture,
          propertyId: DEFAULT_PROPERTY_ID,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      )
    )
  );

  seeded = true;
}

export const propertyService = {
  async listProductionProjects(): Promise<ProductionProject[]> {
    await ensureSeedData();
    const snapshot = await getDocs(projectCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toProject(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: ProductionProject, b: ProductionProject) => a.name.localeCompare(b.name));
  },

  async loadWorkspace(
    propertyId: string = DEFAULT_PROPERTY_ID
  ): Promise<{ property: Property; activities: ProductionProject[]; pastures: Pasture[] }> {
    await ensureSeedData();

    const [propertySnapshot, activitySnapshot, pastureSnapshot] = await Promise.all([
      getDoc(doc(db, 'properties', propertyId)),
      getDocs(projectCollection),
      getDocs(query(pastureCollection, limit(300))),
    ]);

    const property = propertySnapshot.exists()
      ? toProperty(propertySnapshot.id, propertySnapshot.data() as Record<string, unknown>)
      : mockPropertyData;

    const activities = activitySnapshot.docs
      .filter((docSnapshot: any) => !isProjectDeleted(docSnapshot.data() as Record<string, unknown>))
      .map((docSnapshot: any) => toProject(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: ProductionProject, b: ProductionProject) => a.name.localeCompare(b.name));

    const pastures = pastureSnapshot.docs
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

  async listProductionProjects(): Promise<ProductionProject[]> {
    const { activities } = await this.loadWorkspace();
    return activities;
  },

  async saveDivision(divisionData: {
    name: string;
    points: { lat: string; long: string }[];
  }): Promise<{ success: boolean; newPasture?: Pasture; message?: string }> {
    const validation = Validators.division(divisionData);
    if (!validation.success) {
      return { success: false, message: validation.error };
    }

    await ensureSeedData();

    const { name, points } = divisionData;
    const polygonPoints = normalizePointToCanvas(points);
    const estimatedArea = estimateAreaFromPoints(points);

    const newPasture: Pasture = {
      id: `PAST-${Date.now()}`,
      name,
      area: estimatedArea,
      grassHeight: 0,
      cultivar: 'N/A',
      estimatedForageProduction: 0,
      grazingPeriod: { start: '', end: '' },
      entryDate: '',
      exitDate: '',
      stockingRate: '0 UA/ha',
      managementRecommendations: [],
      managementHistory: [],
      animals: [],
      polygon: polygonPoints,
      center: polygonPoints[0],
    };

    await setDoc(
      doc(db, 'pastures', newPasture.id),
      {
        ...newPasture,
        propertyId: DEFAULT_PROPERTY_ID,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
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
    const validation = Validators.activity(activityData);
    if (!validation.success) {
      return { success: false, message: validation.error };
    }

    await ensureSeedData();

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
      {
        ...newProject,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return { success: true, newProject };
  },

  async updateProperty(propertyData: Property): Promise<ValidationResult> {
    const validation = Validators.property(propertyData);
    if (!validation.success) {
      return validation;
    }

    await ensureSeedData();
    await setDoc(
      doc(db, 'properties', propertyData.id || DEFAULT_PROPERTY_ID),
      {
        ...propertyData,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return validation;
  },

  async deleteActivity(activityId: string, authorizationPassword: string): Promise<{ success: boolean; message?: string }> {
    const informedPassword = authorizationPassword.trim();
    if (!informedPassword) {
      return { success: false, message: 'Informe a senha de autorizacao para excluir.' };
    }
    if (informedPassword !== MANUAL_DELETE_PASSWORD) {
      return { success: false, message: 'Senha de autorizacao invalida.' };
    }

    try {
      await ensureSeedData();
      await deleteDoc(doc(db, 'productionProjects', activityId));
      return { success: true };
    } catch {
      try {
        await setDoc(
          doc(db, 'productionProjects', activityId),
          {
            isDeleted: true,
            deletedAt: serverTimestamp(),
            status: 'ENCERRADO',
            updatedAt: serverTimestamp(),
          },
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
