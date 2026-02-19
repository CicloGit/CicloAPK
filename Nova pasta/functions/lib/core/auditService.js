"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditService = void 0;
const node_crypto_1 = require("node:crypto");
const firestore_1 = require("firebase-admin/firestore");
const canonicalJson_js_1 = require("./canonicalJson.js");
class AuditService {
    db;
    constructor(db) {
        this.db = db;
    }
    tenantAuditCollection(tenantId) {
        return this.db.collection('tenants').doc(tenantId).collection('auditLogs');
    }
    computeHash(input) {
        return (0, node_crypto_1.createHash)('sha256').update(input).digest('hex');
    }
    async append(actor, input) {
        const collectionRef = this.tenantAuditCollection(actor.tenantId);
        const latestSnapshot = await collectionRef.orderBy('sequence', 'desc').limit(1).get();
        const lastDoc = latestSnapshot.empty ? null : latestSnapshot.docs[0];
        const previousHash = lastDoc ? String(lastDoc.get('hash') ?? '0'.repeat(64)) : '0'.repeat(64);
        const sequence = lastDoc ? Number(lastDoc.get('sequence') ?? 0) + 1 : 1;
        const payloadCanonical = (0, canonicalJson_js_1.canonicalJson)(input.payload);
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
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            createdAtIso: new Date().toISOString(),
        });
        return { auditId: auditRef.id, hash, sequence };
    }
    async verifyChain(tenantId, range) {
        const collectionRef = this.tenantAuditCollection(tenantId);
        const limit = Math.max(1, Math.min(range?.limit ?? 1000, 5000));
        const snapshot = await collectionRef.orderBy('sequence', 'asc').limit(limit).get();
        let docs = snapshot.docs;
        if (typeof range?.startSequence === 'number') {
            docs = docs.filter((docSnapshot) => Number(docSnapshot.get('sequence') ?? 0) >= range.startSequence);
        }
        if (typeof range?.endSequence === 'number') {
            docs = docs.filter((docSnapshot) => Number(docSnapshot.get('sequence') ?? 0) <= range.endSequence);
        }
        let previousHash = '0'.repeat(64);
        for (const docSnapshot of docs) {
            const sequence = Number(docSnapshot.get('sequence') ?? 0);
            const eventType = String(docSnapshot.get('eventType') ?? '');
            const payload = docSnapshot.get('payload');
            const expectedHash = this.computeHash(`${previousHash}|${(0, canonicalJson_js_1.canonicalJson)(payload)}|${eventType}|${sequence}`);
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
exports.AuditService = AuditService;
