import { createHash } from 'node:crypto';
import { HttpsError } from 'firebase-functions/v2/https';
import { canonicalJson } from './canonicalJson.js';

export interface GpsPayload {
  lat: number;
  lng: number;
  accuracy?: number;
  timestamp?: string;
}

export interface TelemetryPayload {
  source: string;
  capturedAt: string;
  data?: Record<string, unknown>;
}

export interface DocumentPayload {
  kind: string;
  storagePath?: string;
  hash?: string;
}

export interface EvidencePayload {
  type: 'TYPE_A' | 'TYPE_B';
  storagePath?: string;
  fileHash?: string;
  mimeType?: string;
  gps?: GpsPayload;
  telemetry?: TelemetryPayload;
  documents?: DocumentPayload[];
  metadata?: Record<string, unknown>;
}

export interface EvidenceValidationOptions {
  requireDocumentTypeB?: boolean;
}

const hasTypeAPhotoAndGps = (evidence: EvidencePayload): boolean => {
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

const hasTelemetryEquivalent = (evidence: EvidencePayload): boolean => {
  if (!evidence.telemetry) {
    return false;
  }
  return (
    typeof evidence.telemetry.source === 'string' &&
    evidence.telemetry.source.trim().length > 0 &&
    typeof evidence.telemetry.capturedAt === 'string' &&
    evidence.telemetry.capturedAt.trim().length > 0
  );
};

const hasTypeBDoc = (evidence: EvidencePayload): boolean => {
  if (evidence.type !== 'TYPE_B') {
    return false;
  }
  if (!Array.isArray(evidence.documents) || evidence.documents.length === 0) {
    return false;
  }
  return evidence.documents.some((documentItem) => Boolean(documentItem.storagePath || documentItem.hash));
};

const ensureEvidence = (condition: boolean, message: string): void => {
  if (!condition) {
    throw new HttpsError('failed-precondition', message);
  }
};

export const buildEvidenceHash = (evidence: EvidencePayload): string =>
  createHash('sha256').update(canonicalJson(evidence)).digest('hex');

export const validateEvidencePolicy = (
  policy: 'NONE' | 'DISPATCH_A_OR_TELEMETRY' | 'DELIVERY_A_AND_OPTIONAL_B' | 'CONTRACT_B_REQUIRED' | 'SETTLEMENT_AUDIT_GATE',
  evidences: EvidencePayload[],
  options?: EvidenceValidationOptions
): void => {
  if (policy === 'NONE' || policy === 'SETTLEMENT_AUDIT_GATE') {
    return;
  }

  const list = Array.isArray(evidences) ? evidences : [];

  if (policy === 'DISPATCH_A_OR_TELEMETRY') {
    ensureEvidence(
      list.some((item) => hasTypeAPhotoAndGps(item) || hasTelemetryEquivalent(item)),
      'Dispatch exige evidencia Tipo A (foto+gps) ou telemetria equivalente.'
    );
    return;
  }

  if (policy === 'DELIVERY_A_AND_OPTIONAL_B') {
    ensureEvidence(
      list.some((item) => hasTypeAPhotoAndGps(item)),
      'Delivery exige evidencia Tipo A (foto+gps).'
    );

    if (options?.requireDocumentTypeB) {
      ensureEvidence(
        list.some((item) => hasTypeBDoc(item)),
        'Delivery exige evidencia Tipo B (NF/romaneio/aceite) para este fluxo.'
      );
    }
    return;
  }

  if (policy === 'CONTRACT_B_REQUIRED') {
    ensureEvidence(
      list.some((item) => hasTypeBDoc(item)),
      'Assinatura de contrato exige evidencia Tipo B.'
    );
  }
};
