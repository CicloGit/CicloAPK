import { EvidenceType } from "./enums.js";

export interface Evidence {
  type: EvidenceType;
  timestamp: string; // ISO
  payload: Record<string, unknown>;
}

export interface EvidenceResult {
  score: number;
  hasRFID: boolean;
  types: EvidenceType[];
  classification: "TIPO_A" | "TIPO_B" | "INSUFICIENTE";
}

/**
 * Pontuação objetiva:
 * RFID = 50
 * GPS = 20
 * BALANCA = 20
 * CAMERA = 10
 * DOCUMENTO = 10 (ex.: ocorrência, atestado)
 */
export function calcEvidenceScore(evidences: Evidence[]): EvidenceResult {
  const weights: Record<EvidenceType, number> = {
    RFID: 50,
    GPS: 20,
    BALANCA: 20,
    CAMERA: 10,
    DOCUMENTO: 10
  };

  const seen = new Set<EvidenceType>();
  for (const ev of evidences) seen.add(ev.type);

  let score = 0;
  for (const t of seen) score += weights[t];

  const hasRFID = seen.has("RFID");
  const hasComboAlt = seen.has("BALANCA") && seen.has("GPS") && seen.has("CAMERA");

  let classification: EvidenceResult["classification"] = "INSUFICIENTE";
  if (score >= 70 && (hasRFID || hasComboAlt)) classification = "TIPO_A";
  else if (score >= 30) classification = "TIPO_B";

  return { score, hasRFID, types: Array.from(seen), classification };
}
