import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import {
  AnimalProductionDetails,
  AuditEvent,
  FinancialDetails,
  ProjectStage,
  SectorSpecificData,
} from '../types';

const financialDetailsCollection = collection(db, 'financialDetails');
const animalDetailsCollection = collection(db, 'animalDetails');
const sectorDetailsCollection = collection(db, 'sectorDetails');
const stageDetailsCollection = collection(db, 'stageDetails');
const projectStagesCollection = collection(db, 'projectStages');
const auditEventsCollection = collection(db, 'auditEvents');
const toFinancialDetails = (id: string, raw: Record<string, unknown>): FinancialDetails => ({
  projectId: String(raw.projectId ?? id),
  totalCost: Number(raw.totalCost ?? 0),
  realizedRevenue: Number(raw.realizedRevenue ?? 0),
  futureRevenue: Number(raw.futureRevenue ?? 0),
  batches: Array.isArray(raw.batches) ? (raw.batches as FinancialDetails['batches']) : [],
});

const toAnimalDetails = (id: string, raw: Record<string, unknown>): AnimalProductionDetails => ({
  projectId: String(raw.projectId ?? id),
  pastures: Array.isArray(raw.pastures) ? (raw.pastures as AnimalProductionDetails['pastures']) : [],
  contracts: Array.isArray(raw.contracts) ? (raw.contracts as AnimalProductionDetails['contracts']) : [],
});

const toSectorDetails = (id: string, raw: Record<string, unknown>): SectorSpecificData => ({
  kpi1Label: String(raw.kpi1Label ?? ''),
  kpi1Value: String(raw.kpi1Value ?? ''),
  kpi2Label: String(raw.kpi2Label ?? ''),
  kpi2Value: String(raw.kpi2Value ?? ''),
  kpi3Label: String(raw.kpi3Label ?? ''),
  kpi3Value: String(raw.kpi3Value ?? ''),
  alerts: Array.isArray(raw.alerts) ? (raw.alerts as SectorSpecificData['alerts']) : [],
  stockLabel: String(raw.stockLabel ?? ''),
  stockValue: String(raw.stockValue ?? ''),
});

const toProjectStages = (id: string, raw: Record<string, unknown>): ProjectStage[] => {
  const stages = Array.isArray(raw.stages) ? (raw.stages as ProjectStage[]) : [];
  return stages.map((stage) => ({
    id: String(stage.id ?? ''),
    label: String(stage.label ?? ''),
    status: stage.status ?? 'PLANNED',
  }));
};

const toAuditEvent = (id: string, raw: Record<string, unknown>): AuditEvent => ({
  id,
  timestamp: String(raw.timestamp ?? ''),
  actor: String(raw.actor ?? ''),
  action: String(raw.action ?? ''),
  details: String(raw.details ?? ''),
  geolocation: String(raw.geolocation ?? ''),
  hash: String(raw.hash ?? ''),
  verified: Boolean(raw.verified),
  proofUrl: raw.proofUrl ? String(raw.proofUrl) : undefined,
});
export const producerDashboardService = {
  async listFinancialDetails(): Promise<Record<string, FinancialDetails>> {
    const snapshot = await getDocs(financialDetailsCollection);
    const acc: Record<string, FinancialDetails> = {};
    snapshot.docs.forEach((docSnapshot: any) => {
      const details = toFinancialDetails(docSnapshot.id, docSnapshot.data() as Record<string, unknown>);
      acc[details.projectId] = details;
    });
    return acc;
  },

  async listAnimalDetails(): Promise<Record<string, AnimalProductionDetails>> {
    const snapshot = await getDocs(animalDetailsCollection);
    const acc: Record<string, AnimalProductionDetails> = {};
    snapshot.docs.forEach((docSnapshot: any) => {
      const details = toAnimalDetails(docSnapshot.id, docSnapshot.data() as Record<string, unknown>);
      acc[details.projectId] = details;
    });
    return acc;
  },

  async listSectorDetails(): Promise<Record<string, SectorSpecificData>> {
    const snapshot = await getDocs(sectorDetailsCollection);
    const acc: Record<string, SectorSpecificData> = {};
    snapshot.docs.forEach((docSnapshot: any) => {
      const details = toSectorDetails(docSnapshot.id, docSnapshot.data() as Record<string, unknown>);
      acc[docSnapshot.id] = details;
    });
    return acc;
  },

  async listStageDetails(): Promise<Record<string, SectorSpecificData>> {
    const snapshot = await getDocs(stageDetailsCollection);
    const acc: Record<string, SectorSpecificData> = {};
    snapshot.docs.forEach((docSnapshot: any) => {
      const details = toSectorDetails(docSnapshot.id, docSnapshot.data() as Record<string, unknown>);
      acc[docSnapshot.id] = details;
    });
    return acc;
  },

  async listProjectStages(): Promise<Record<string, ProjectStage[]>> {
    const snapshot = await getDocs(projectStagesCollection);
    const acc: Record<string, ProjectStage[]> = {};
    snapshot.docs.forEach((docSnapshot: any) => {
      acc[docSnapshot.id] = toProjectStages(docSnapshot.id, docSnapshot.data() as Record<string, unknown>);
    });
    return acc;
  },

  async listAuditEvents(): Promise<AuditEvent[]> {
    const snapshot = await getDocs(auditEventsCollection);
    return snapshot.docs.map((docSnapshot: any) => toAuditEvent(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async getStageDetails(stageId: string): Promise<SectorSpecificData | null> {
    const snapshot = await getDoc(doc(db, 'stageDetails', stageId));
    if (!snapshot.exists()) {
      return null;
    }
    return toSectorDetails(snapshot.id, snapshot.data() as Record<string, unknown>);
  },
};

