import { FieldValue, Firestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

export interface SettlementActor {
  tenantId: string;
  uid: string;
}

export interface EscrowCreatePayload {
  orderId: string;
  amount: number;
  templateCode: string;
}

export interface ReleasePayload {
  amount: number;
  toParty: string;
  reason: string;
}

export interface SplitPayload {
  totalAmount: number;
  rules: Array<{ party: string; share: number }>;
}

export class PaymentProviderAdapter {
  constructor(private readonly db: Firestore) {}

  private settlementRef(tenantId: string, settlementId: string) {
    return this.db.collection('tenants').doc(tenantId).collection('settlements').doc(settlementId);
  }

  async createEscrow(actor: SettlementActor, settlementId: string, payload: EscrowCreatePayload) {
    const ref = this.settlementRef(actor.tenantId, settlementId);
    await ref.set(
      {
        id: settlementId,
        orderId: payload.orderId,
        templateCode: payload.templateCode,
        escrowAmount: payload.amount,
        status: 'ESCROWED',
        provider: {
          mode: 'FIRESTORE_STUB',
          escrowRef: `escrow_${settlementId}`,
        },
        milestones: {
          M1: true,
          M2: true,
          M3: false,
          M4: false,
          M5: false,
        },
        releases: [],
        splitHistory: [],
        createdBy: actor.uid,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return { settlementId, status: 'ESCROWED' as const };
  }

  async release(actor: SettlementActor, settlementId: string, payload: ReleasePayload) {
    const ref = this.settlementRef(actor.tenantId, settlementId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'Settlement nao encontrado.');
    }

    await ref.set(
      {
        releases: FieldValue.arrayUnion({
          amount: payload.amount,
          toParty: payload.toParty,
          reason: payload.reason,
          releasedAt: new Date().toISOString(),
          releasedBy: actor.uid,
        }),
        status: 'PARTIAL_RELEASED',
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return { settlementId, status: 'PARTIAL_RELEASED' as const };
  }

  async split(actor: SettlementActor, settlementId: string, payload: SplitPayload) {
    const ref = this.settlementRef(actor.tenantId, settlementId);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'Settlement nao encontrado.');
    }

    const splitItems = payload.rules.map((rule) => ({
      party: rule.party,
      share: rule.share,
      amount: Number((payload.totalAmount * rule.share).toFixed(2)),
      createdAtIso: new Date().toISOString(),
    }));

    await ref.set(
      {
        splitHistory: FieldValue.arrayUnion({
          totalAmount: payload.totalAmount,
          items: splitItems,
          appliedBy: actor.uid,
          appliedAt: new Date().toISOString(),
        }),
        status: 'RELEASED',
        milestones: {
          M5: true,
        },
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    return { settlementId, status: 'RELEASED' as const, items: splitItems };
  }

  async status(actor: SettlementActor, settlementId: string) {
    const snapshot = await this.settlementRef(actor.tenantId, settlementId).get();
    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'Settlement nao encontrado.');
    }
    return snapshot.data() as Record<string, unknown>;
  }
}
