import { collection, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { AuditChain } from '../lib/auditChain';
import { AuditEvent } from '../types';
import { resolveTenantContext, withTenantFields } from './tenantContext';

const auditCollection = collection(db, 'auditEvents');

const toAuditEvent = (id: string, raw: Record<string, unknown>): AuditEvent => ({
  id,
  timestamp: String(raw.timestamp ?? new Date().toISOString()),
  actor: String(raw.actor ?? ''),
  action: String(raw.action ?? ''),
  details: String(raw.details ?? ''),
  geolocation: String(raw.geolocation ?? ''),
  hash: String(raw.hash ?? ''),
  verified: Boolean(raw.verified),
  proofUrl: raw.proofUrl ? String(raw.proofUrl) : undefined,
});

const toEventTimestamp = (event: AuditEvent): number => {
  const parsed = new Date(event.timestamp).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const getLatestAuditEvent = async (
  context: Awaited<ReturnType<typeof resolveTenantContext>>
): Promise<AuditEvent | null> => {
  const snapshot = await getDocs(query(auditCollection, where('tenantId', '==', context.tenantId)));
  if (snapshot.empty) {
    return null;
  }

  const events = snapshot.docs
    .map((docSnapshot: any) => toAuditEvent(docSnapshot.id, docSnapshot.data() as Record<string, unknown>))
    .filter((event: AuditEvent, index: number, items: AuditEvent[]) => items.findIndex((item) => item.id === event.id) === index)
    .sort((a: AuditEvent, b: AuditEvent) => toEventTimestamp(b) - toEventTimestamp(a));
  return events[0] ?? null;
};

export const immutableAuditService = {
  async append(params: {
    actor: string;
    action: string;
    details: string;
    proofUrl?: string;
    metadata?: Record<string, unknown>;
  }): Promise<AuditEvent> {
    const context = await resolveTenantContext();
    const latest = await getLatestAuditEvent(context);
    const previousHash = latest ? latest.hash : '0'.repeat(64);
    const newAudit = await AuditChain.createAuditEvent(
      {
        actor: params.actor,
        action: params.action,
        details: params.details,
        geolocation: '-15.123, -47.654',
        verified: true,
        proofUrl: params.proofUrl,
      },
      previousHash
    );

    await setDoc(
      doc(db, 'auditEvents', newAudit.id),
      withTenantFields(
        {
          ...newAudit,
          metadata: params.metadata ?? null,
          immutable: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        context
      ),
      { merge: true }
    );

    return newAudit;
  },
};
