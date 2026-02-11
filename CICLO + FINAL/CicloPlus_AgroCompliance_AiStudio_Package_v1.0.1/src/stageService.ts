import { db } from "./store.js";
import { calcEvidenceScore, Evidence } from "./evidence.js";
import { evaluateRules } from "./ruleEngine.js";
import { Rule, AnimalStage } from "./enums.js";
import { isLocked } from "./locksService.js";

export interface StageChangeRequest {
  orgId: string;
  cycleId: string;
  animalId: string;
  fromStage: AnimalStage;
  toStage: AnimalStage;
  evidences: Evidence[];
  override?: boolean;
  approvals?: { userId: string; role: string }[];
}

export function changeStage(rules: Rule[], req: StageChangeRequest): { ok: boolean; message: string; evidenceScore: number } {
  const animal = db.animals.get(`${req.orgId}::${req.animalId}`);
  if (!animal) throw new Error("Animal não encontrado.");

  const cycle = db.cycles.get(`${req.orgId}::${req.cycleId}`);
  if (!cycle) throw new Error("Ciclo não encontrado.");

  const lote = animal.loteId ? db.lotes.get(`${req.orgId}::${animal.loteId}`) : null;

  const ev = calcEvidenceScore(req.evidences);

  // Se existir lock explícito para STAGE_CHANGE no animal, bloquear.
  const lock = isLocked(req.orgId, "STAGE_CHANGE", "ANIMAL", req.animalId);
  if (lock) return { ok: false, message: lock.message ?? lock.reason, evidenceScore: ev.score };

  // Contexto para motor de regras
  const ctx = {
    op: "STAGE_CHANGE" as const,
    animal,
    lote: lote ?? { status: "CONFORME", missingHeads: 0 },
    cycle,
    conference: cycle.conference,
    request: { fromStage: req.fromStage, toStage: req.toStage, override: !!req.override, approvals: req.approvals ?? [], approvalsCount: (req.approvals ?? []).length, approvalsRoles: (req.approvals ?? []).map(a => a.role) },
    evidenceScore: ev.score,
    evidence: { types: ev.types }
  };

  const outcome = evaluateRules(rules, ctx);

  if (!outcome.allowed) {
    const block = outcome.actions.find(a => a.action === "block");
    return { ok: false, message: (block as any)?.message ?? "Mudança de estágio bloqueada.", evidenceScore: ev.score };
  }

  // Aplicar mudança
  if (animal.stage !== req.fromStage) {
    return { ok: false, message: "Estágio atual do animal não corresponde ao estágio informado.", evidenceScore: ev.score };
  }

  animal.stage = req.toStage;
  db.animals.set(`${req.orgId}::${req.animalId}`, animal);

  return { ok: true, message: "Mudança de estágio realizada.", evidenceScore: ev.score };
}
