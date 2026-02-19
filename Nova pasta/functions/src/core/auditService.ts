import { createHash } from 'node:crypto';
import { FieldValue, Firestore } from 'firebase-admin/firestore';
import { canonicalJson } from './canonicalJson.js';

export interface AuditActor {
  uid: string;
  role: string;
  tenantId: string;
}

export interface AuditAppendInput {
  eventType: string;
  operationType?: string;
  status: 'SUCCESS' | 'REJECTED';
  stream?: string;
  payload: Record<string, unknown>;
}

export interface VerifyRange {
  startSequence?: number;
  endSequence?: number;
  limit?: number;
}

export class AuditService {
  constructor(private readonly db: Firestore) {}

  private tenantAuditCollection(tenantId: string) {
    return this.db.collection('tenants').doc(tenantId).collection('auditLogs');
  }

  private computeHash(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }

  async append(actor: AuditActor, input: AuditAppendInput): Promise<{ auditId: string; hash: string; sequence: number }> {
    const collectionRef = this.tenantAuditCollection(actor.tenantId);
    const latestSnapshot = await collectionRef.orderBy('sequence', 'desc').limit(1).get();

    const lastDoc = latestSnapshot.empty ? null : latestSnapshot.docs[0];
    const previousHash = lastDoc ? String(lastDoc.get('hash') ?? '0'.repeat(64)) : '0'.repeat(64);
    const sequence = lastDoc ? Number(lastDoc.get('sequence') ?? 0) + 1 : 1;
    const payloadCanonical = canonicalJson(input.payload);
    const hashInput = `${previousHash}|${payloadCanonical}|${input.eventType}|${sequence}`;
    const hash = this.computeHash(hashInput);

    const auditRef = collectionRef.doc();
    await auditRef.set({
      id: auditRef.id,
      tenantId: actor.tenantId,
      stream: input.stream ?? 'default',
      sequence,
      eventType: input.eventType,
      operationType: input.operationType ?? input.eventType,
      status: input.status,
      actorUid: actor.uid,
      actorRole: actor.role,
      prevHash: previousHash,
      hash,
      payload: JSON.parse(payloadCanonical),
      createdAt: FieldValue.serverTimestamp(),
      createdAtIso: new Date().toISOString(),
    });

    return { auditId: auditRef.id, hash, sequence };
  }

  async verifyChain(tenantId: string, range?: VerifyRange): Promise<{
    valid: boolean;
    checked: number;
    firstBrokenSequence: number | null;
    expectedHash?: string;
    actualHash?: string;
  }> {
    const collectionRef = this.tenantAuditCollection(tenantId);
    const limit = Math.max(1, Math.min(range?.limit ?? 1000, 5000));
    const snapshot = await collectionRef.orderBy('sequence', 'asc').limit(limit).get();
    let docs = snapshot.docs;

    if (typeof range?.startSequence === 'number') {
      docs = docs.filter((docSnapshot) => Number(docSnapshot.get('sequence') ?? 0) >= range.startSequence!);
    }
    if (typeof range?.endSequence === 'number') {
      docs = docs.filter((docSnapshot) => Number(docSnapshot.get('sequence') ?? 0) <= range.endSequence!);
    }

    let previousHash = '0'.repeat(64);
    for (const docSnapshot of docs) {
      const sequence = Number(docSnapshot.get('sequence') ?? 0);
      const eventType = String(docSnapshot.get('eventType') ?? '');
      const payload = docSnapshot.get('payload') as Record<string, unknown>;
      const expectedHash = this.computeHash(
        `${previousHash}|${canonicalJson(payload)}|${eventType}|${sequence}`
      );
      const actualHash = String(docSnapshot.get('hash') ?? '');

      if (expectedHash !== actualHash) {
        return {
          valid: false,
          checked: sequence,
          firstBrokenSequence: sequence,
          expectedHash,
          actualHash,
        };
      }

      previousHash = actualHash;
    }

    return {
      valid: true,
      checked: docs.length,
      firstBrokenSequence: null,
    };
  }
}
