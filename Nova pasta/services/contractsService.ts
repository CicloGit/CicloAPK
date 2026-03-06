import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { parseDateToTimestamp } from './dateUtils';
import { Contract } from '../types';
import { hasTenantAccess, resolveTenantContext, withTenantFields } from './tenantContext';

const contractsCollection = collection(db, 'contracts');

const toContract = (id: string, raw: Record<string, unknown>): Contract => ({
  id,
  description: String(raw.description ?? ''),
  value: Number(raw.value ?? 0),
  deadline: String(raw.deadline ?? ''),
  status: (raw.status as Contract['status']) ?? 'VIGENTE',
  counterparty: raw.counterparty ? String(raw.counterparty) : undefined,
  signedAt: raw.signedAt ? String(raw.signedAt) : undefined,
  originalFileUrl: raw.originalFileUrl ? String(raw.originalFileUrl) : undefined,
  originalFileName: raw.originalFileName ? String(raw.originalFileName) : undefined,
  originalFileHash: raw.originalFileHash ? String(raw.originalFileHash) : undefined,
  notes: raw.notes ? String(raw.notes) : undefined,
  deliveryHistory: Array.isArray(raw.deliveryHistory)
    ? (raw.deliveryHistory as Array<Record<string, unknown>>).map((item) => ({
        date: String(item.date ?? ''),
        quantity: String(item.quantity ?? ''),
      }))
    : [],
});

export const contractsService = {
  async listContracts(): Promise<Contract[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(contractsCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs
      .map((docSnapshot: any) => toContract(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
      .sort((a: Contract, b: Contract) => parseDateToTimestamp(a.deadline) - parseDateToTimestamp(b.deadline));
  },

  async attachOriginalFile(
    contractId: string,
    payload: { originalFileUrl: string; originalFileName: string; originalFileHash?: string }
  ): Promise<void> {
    const context = await resolveTenantContext();
    const contractRef = doc(db, 'contracts', contractId);
    const snapshot = await getDoc(contractRef);
    if (!snapshot.exists()) {
      throw new Error('Contrato nao encontrado.');
    }
    if (!hasTenantAccess(snapshot.data() as Record<string, unknown>, context)) {
      throw new Error('Sem permissao para anexar arquivo neste contrato.');
    }

    await setDoc(
      contractRef,
      withTenantFields(
        {
          originalFileUrl: payload.originalFileUrl,
          originalFileName: payload.originalFileName,
          originalFileHash: payload.originalFileHash ?? null,
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );
  },
};
