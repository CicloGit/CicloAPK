import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { mockCarbonCredits, mockCarbonProjects, mockSustainablePractices } from '../constants';
import { db } from '../config/firebase';
import { CarbonCredit, CarbonProject, SustainablePractice } from '../types';

const practicesCollection = collection(db, 'sustainablePractices');
const projectsCollection = collection(db, 'carbonProjects');
const creditsCollection = collection(db, 'carbonCredits');

let seeded = false;

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

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  const snapshot = await getDocs(query(practicesCollection, limit(1)));
  if (!snapshot.empty) {
    seeded = true;
    return;
  }

  await Promise.all(
    mockSustainablePractices.map((practice) =>
      setDoc(doc(db, 'sustainablePractices', practice.id), {
        ...practice,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  await Promise.all(
    mockCarbonProjects.map((project) =>
      setDoc(doc(db, 'carbonProjects', project.id), {
        ...project,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  await Promise.all(
    mockCarbonCredits.map((credit) =>
      setDoc(doc(db, 'carbonCredits', credit.id), {
        ...credit,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  seeded = true;
}

export const carbonService = {
  async listPractices(): Promise<SustainablePractice[]> {
    await ensureSeedData();
    const snapshot = await getDocs(practicesCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toPractice(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: SustainablePractice, b: SustainablePractice) => a.name.localeCompare(b.name));
  },

  async listProjects(): Promise<CarbonProject[]> {
    await ensureSeedData();
    const snapshot = await getDocs(projectsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toProject(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: CarbonProject, b: CarbonProject) => a.name.localeCompare(b.name));
  },

  async listCredits(): Promise<CarbonCredit[]> {
    await ensureSeedData();
    const snapshot = await getDocs(creditsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toCredit(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: CarbonCredit, b: CarbonCredit) => b.vintage - a.vintage);
  },
};
