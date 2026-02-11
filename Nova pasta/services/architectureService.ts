import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { architectureNodes } from '../constants';
import { db } from '../config/firebase';
import { ArchitectureNode } from '../types';

const architectureCollection = collection(db, 'architectureNodes');

const seedNodes: ArchitectureNode[] = [
  architectureNodes.CH,
  architectureNodes.CORE,
  architectureNodes.MOD,
];

let seeded = false;

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  const snapshot = await getDocs(query(architectureCollection, limit(1)));
  if (!snapshot.empty) {
    seeded = true;
    return;
  }

  await Promise.all(
    seedNodes.map((node) =>
      setDoc(doc(db, 'architectureNodes', node.id), {
        ...node,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  seeded = true;
}

const toArchitectureNode = (id: string, raw: Record<string, unknown>): ArchitectureNode => ({
  id,
  label: String(raw.label ?? ''),
  description: String(raw.description ?? ''),
  children: Array.isArray(raw.children)
    ? raw.children.map((child) => ({
        id: String((child as any).id ?? ''),
        label: String((child as any).label ?? ''),
        description: String((child as any).description ?? ''),
        children: Array.isArray((child as any).children) ? (child as any).children : [],
      }))
    : [],
});

export const architectureService = {
  async listNodes(): Promise<ArchitectureNode[]> {
    await ensureSeedData();
    const snapshot = await getDocs(architectureCollection);
    return snapshot.docs.map((docSnapshot) =>
      toArchitectureNode(docSnapshot.id, docSnapshot.data() as Record<string, unknown>)
    );
  },
};
