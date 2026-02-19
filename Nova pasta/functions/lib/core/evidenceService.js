"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateEvidencePolicy = exports.buildEvidenceHash = void 0;
const node_crypto_1 = require("node:crypto");
const https_1 = require("firebase-functions/v2/https");
const canonicalJson_js_1 = require("./canonicalJson.js");
const hasTypeAPhotoAndGps = (evidence) => {
    if (evidence.type !== 'TYPE_A') {
        return false;
    }
    if (!evidence.storagePath && !evidence.fileHash) {
        return false;
    }
    if (!evidence.gps) {
        return false;
    }
    return typeof evidence.gps.lat === 'number' && typeof evidence.gps.lng === 'number';
};
const hasTelemetryEquivalent = (evidence) => {
    if (!evidence.telemetry) {
        return false;
    }
    return (typeof evidence.telemetry.source === 'string' &&
        evidence.telemetry.source.trim().length > 0 &&
        typeof evidence.telemetry.capturedAt === 'string' &&
        evidence.telemetry.capturedAt.trim().length > 0);
};
const hasTypeBDoc = (evidence) => {
    if (evidence.type !== 'TYPE_B') {
        return false;
    }
    if (!Array.isArray(evidence.documents) || evidence.documents.length === 0) {
        return false;
    }
    return evidence.documents.some((documentItem) => Boolean(documentItem.storagePath || documentItem.hash));
};
const ensureEvidence = (condition, message) => {
    if (!condition) {
        throw new https_1.HttpsError('failed-precondition', message);
    }
};
const buildEvidenceHash = (evidence) => (0, node_crypto_1.createHash)('sha256').update((0, canonicalJson_js_1.canonicalJson)(evidence)).digest('hex');
exports.buildEvidenceHash = buildEvidenceHash;
const validateEvidencePolicy = (policy, evidences, options) => {
    if (policy === 'NONE' || policy === 'SETTLEMENT_AUDIT_GATE') {
        return;
    }
    const list = Array.isArray(evidences) ? evidences : [];
    if (policy === 'DISPATCH_A_OR_TELEMETRY') {
        ensureEvidence(list.some((item) => hasTypeAPhotoAndGps(item) || hasTelemetryEquivalent(item)), 'Dispatch exige evidencia Tipo A (foto+gps) ou telemetria equivalente.');
        return;
    }
    if (policy === 'DELIVERY_A_AND_OPTIONAL_B') {
        ensureEvidence(list.some((item) => hasTypeAPhotoAndGps(item)), 'Delivery exige evidencia Tipo A (foto+gps).');
        if (options?.requireDocumentTypeB) {
            ensureEvidence(list.some((item) => hasTypeBDoc(item)), 'Delivery exige evidencia Tipo B (NF/romaneio/aceite) para este fluxo.');
        }
        return;
    }
    if (policy === 'CONTRACT_B_REQUIRED') {
        ensureEvidence(list.some((item) => hasTypeBDoc(item)), 'Assinatura de contrato exige evidencia Tipo B.');
    }
};
exports.validateEvidencePolicy = validateEvidencePolicy;
