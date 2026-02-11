import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { mockIntegratedProducers, mockIntegratorMessages, mockPartnershipOffers } from '../constants';
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
  status: (raw.status as IntegratedProducer['status']) ?? 'Disponivel',
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

  const snapshot = await getDocs(query(producersCollection, limit(1)));
  if (!snapshot.empty) {
    seeded = true;
    return;
  }

  await Promise.all(
    mockIntegratedProducers.map((producer) =>
      setDoc(doc(db, 'integratedProducers', producer.id), {
        ...producer,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  await Promise.all(
    mockPartnershipOffers.map((offer) =>
      setDoc(doc(db, 'partnershipOffers', offer.id), {
        ...offer,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

  await Promise.all(
    mockIntegratorMessages.map((message) =>
      setDoc(doc(db, 'integratorMessages', message.id), {
        ...message,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })
    )
  );

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
};
