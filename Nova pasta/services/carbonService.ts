import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { CarbonCredit, CarbonProject, SustainablePractice } from '../types';

const practicesCollection = collection(db, 'sustainablePractices');
const projectsCollection = collection(db, 'carbonProjects');
const creditsCollection = collection(db, 'carbonCredits');
const toPractice = (id: string, raw: Record<string, unknown>): SustainablePractice => ({
  id,
  name: String(raw.name ?? ''),
  description: String(raw.description ?? ''),
  sequestrationFactor: Number(raw.sequestrationFactor ?? 0),
});

const toProject = (id: string, raw: Record<string, unknown>): CarbonProject => ({
  id,
  name: String(raw.name ?? ''),
  practiceId: String(raw.practiceId ?? ''),
  area: Number(raw.area ?? 0),
  startDate: String(raw.startDate ?? ''),
  status: (raw.status as CarbonProject['status']) ?? 'PLANEJAMENTO',
  estimatedSequestration: Number(raw.estimatedSequestration ?? 0),
});

const toCredit = (id: string, raw: Record<string, unknown>): CarbonCredit => ({
  id,
  projectId: String(raw.projectId ?? ''),
  vintage: Number(raw.vintage ?? 0),
  quantity: Number(raw.quantity ?? 0),
  status: (raw.status as CarbonCredit['status']) ?? 'DISPONIVEL',
  certificateHash: String(raw.certificateHash ?? ''),
});
export const carbonService = {
  async listPractices(): Promise<SustainablePractice[]> {
    const snapshot = await getDocs(practicesCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toPractice(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: SustainablePractice, b: SustainablePractice) => a.name.localeCompare(b.name));
  },

  async listProjects(): Promise<CarbonProject[]> {
    const snapshot = await getDocs(projectsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toProject(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: CarbonProject, b: CarbonProject) => a.name.localeCompare(b.name));
  },

  async listCredits(): Promise<CarbonCredit[]> {
    const snapshot = await getDocs(creditsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toCredit(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: CarbonCredit, b: CarbonCredit) => b.vintage - a.vintage);
  },

  async updateProjectStatus(projectId: string, status: CarbonProject['status']): Promise<void> {
    await updateDoc(doc(db, 'carbonProjects', projectId), {
      status,
      updatedAt: serverTimestamp(),
    });
  },
};

