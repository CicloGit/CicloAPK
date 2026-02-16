import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { IntegratedProducer, IntegratorMessage, PartnershipOffer } from '../types';

const producersCollection = collection(db, 'integratedProducers');
const offersCollection = collection(db, 'partnershipOffers');
const messagesCollection = collection(db, 'integratorMessages');

let seeded = false;

const toIntegratedProducer = (id: string, raw: Record<string, unknown>): IntegratedProducer => ({
  id,
  maskedName: String(raw.maskedName ?? ''),
  region: String(raw.region ?? ''),
  productionType: (raw.productionType as IntegratedProducer['productionType']) ?? 'Agricultura',
  status: (raw.status as IntegratedProducer['status']) ?? 'Disponível',
  capacity: String(raw.capacity ?? ''),
  auditScore: Number(raw.auditScore ?? 0),
  lastAuditDate: String(raw.lastAuditDate ?? ''),
});

const toPartnershipOffer = (id: string, raw: Record<string, unknown>): PartnershipOffer => ({
  id,
  title: String(raw.title ?? ''),
  description: String(raw.description ?? ''),
  type: (raw.type as PartnershipOffer['type']) ?? 'Compra Garantida',
  status: (raw.status as PartnershipOffer['status']) ?? 'Aberta',
  applicants: Number(raw.applicants ?? 0),
});

const toIntegratorMessage = (id: string, raw: Record<string, unknown>): IntegratorMessage => ({
  id,
  from: String(raw.from ?? ''),
  to: String(raw.to ?? ''),
  content: String(raw.content ?? ''),
  date: String(raw.date ?? ''),
  isUrgent: Boolean(raw.isUrgent),
});

async function ensureSeedData() {
  if (seeded) {
    return;
  }

  seeded = true;
}



export const integratorService = {
  async listProducers(): Promise<IntegratedProducer[]> {
    await ensureSeedData();
    const snapshot = await getDocs(producersCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toIntegratedProducer(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listOffers(): Promise<PartnershipOffer[]> {
    await ensureSeedData();
    const snapshot = await getDocs(offersCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toPartnershipOffer(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listMessages(): Promise<IntegratorMessage[]> {
    await ensureSeedData();
    const snapshot = await getDocs(messagesCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toIntegratorMessage(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async createMessage(content: string): Promise<IntegratorMessage> {
    await ensureSeedData();
    const newMessage: IntegratorMessage = {
      id: `MSG-${Date.now()}`,
      from: 'Integradora',
      to: 'All',
      content,
      date: 'Agora',
      isUrgent: false,
    };

    await setDoc(doc(db, 'integratorMessages', newMessage.id), {
      ...newMessage,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return newMessage;
  },

  async createDemand(data: Pick<PartnershipOffer, 'title' | 'description' | 'type'>): Promise<PartnershipOffer> {
    await ensureSeedData();
    const newDemand: PartnershipOffer = {
      id: `DEM-${Date.now()}`,
      title: data.title,
      description: data.description,
      type: data.type,
      status: 'Aberta',
      applicants: 0,
    };

    await setDoc(doc(db, 'partnershipOffers', newDemand.id), {
      ...newDemand,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return newDemand;
  },
};
