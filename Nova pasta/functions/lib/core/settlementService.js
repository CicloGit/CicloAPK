"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaymentProviderAdapter = void 0;
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
class PaymentProviderAdapter {
    db;
    constructor(db) {
        this.db = db;
    }
    settlementRef(tenantId, settlementId) {
        return this.db.collection('tenants').doc(tenantId).collection('settlements').doc(settlementId);
    }
    async createEscrow(actor, settlementId, payload) {
        const ref = this.settlementRef(actor.tenantId, settlementId);
        await ref.set({
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
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        return { settlementId, status: 'ESCROWED' };
    }
    async release(actor, settlementId, payload) {
        const ref = this.settlementRef(actor.tenantId, settlementId);
        const snapshot = await ref.get();
        if (!snapshot.exists) {
            throw new https_1.HttpsError('not-found', 'Settlement nao encontrado.');
        }
        await ref.set({
            releases: firestore_1.FieldValue.arrayUnion({
                amount: payload.amount,
                toParty: payload.toParty,
                reason: payload.reason,
                releasedAt: new Date().toISOString(),
                releasedBy: actor.uid,
            }),
            status: 'PARTIAL_RELEASED',
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        return { settlementId, status: 'PARTIAL_RELEASED' };
    }
    async split(actor, settlementId, payload) {
        const ref = this.settlementRef(actor.tenantId, settlementId);
        const snapshot = await ref.get();
        if (!snapshot.exists) {
            throw new https_1.HttpsError('not-found', 'Settlement nao encontrado.');
        }
        const splitItems = payload.rules.map((rule) => ({
            party: rule.party,
            share: rule.share,
            amount: Number((payload.totalAmount * rule.share).toFixed(2)),
            createdAtIso: new Date().toISOString(),
        }));
        await ref.set({
            splitHistory: firestore_1.FieldValue.arrayUnion({
                totalAmount: payload.totalAmount,
                items: splitItems,
                appliedBy: actor.uid,
                appliedAt: new Date().toISOString(),
            }),
            status: 'RELEASED',
            milestones: {
                M5: true,
            },
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        }, { merge: true });
        return { settlementId, status: 'RELEASED', items: splitItems };
    }
    async status(actor, settlementId) {
        const snapshot = await this.settlementRef(actor.tenantId, settlementId).get();
        if (!snapshot.exists) {
            throw new https_1.HttpsError('not-found', 'Settlement nao encontrado.');
        }
        return snapshot.data();
    }
}
exports.PaymentProviderAdapter = PaymentProviderAdapter;
