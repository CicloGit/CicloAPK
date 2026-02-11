import { Rule, RuleAction, RuleCondition, Operation } from "./enums.js";
import { getByPath } from "./utils.js";

export interface EvaluationContext {
  op: Operation;
  // Domain objects:
  animal?: any;
  lote?: any;
  cycle?: any;
  conference?: any;
  request?: any;
  evidenceScore?: number;
  evidence?: { types: string[] };
}

export interface EvaluationOutcome {
  allowed: boolean;
  actions: RuleAction[];
  reasons: string[];
}

/**
 * Avaliador determinístico: avalia regras na ordem do arquivo.
 * - Se uma regra aplicar e bloquear, retorna bloqueio.
 * - Se permitir explicitamente, marca como permitido.
 * - Locks são retornados como ações (persistência do lock fica no serviço).
 */
export function evaluateRules(rules: Rule[], ctx: EvaluationContext): EvaluationOutcome {
  const actions: RuleAction[] = [];
  const reasons: string[] = [];
  let allowed = true;

  for (const rule of rules) {
    if (rule.appliesTo && rule.appliesTo !== ctx.op) continue;

    // Escopo de mudança de estágio
    if (ctx.op === "STAGE_CHANGE" && rule.scope) {
      const fromStage = ctx.request?.fromStage;
      const toStage = ctx.request?.toStage;
      if (rule.scope.fromStage && rule.scope.fromStage !== fromStage) continue;
      if (rule.scope.toStage && rule.scope.toStage !== toStage) continue;
    }

    const ok = evalCondition(rule.when, ctx);
    const selected = ok ? rule.then : (rule.else ?? []);
    if (selected.length === 0) continue;

    actions.push(...selected);

    for (const a of selected) {
      if (a.action === "block") {
        allowed = false;
        reasons.push(a.reason);
        return { allowed, actions, reasons };
      }
    }

    // allow explícito não encerra o processamento, mas mantém allowed = true
  }

  return { allowed, actions, reasons };
}

function evalCondition(cond: RuleCondition, ctx: EvaluationContext): boolean {
  switch (cond.op) {
    case "eq": {
      const v = getByPath(ctx, cond.path);
      return v === cond.value;
    }
    case "gte": {
      const v = getByPath(ctx, cond.path);
      return typeof v === "number" && v >= cond.value;
    }
    case "lte": {
      const v = getByPath(ctx, cond.path);
      return typeof v === "number" && v <= cond.value;
    }
    case "contains": {
      const v = getByPath(ctx, cond.path);
      if (Array.isArray(v)) return v.includes(cond.value);
      if (typeof v === "string") return v.includes(String(cond.value));
      return false;
    }
    case "all":
      return cond.conditions.every(c => evalCondition(c, ctx));
    case "any":
      return cond.conditions.some(c => evalCondition(c, ctx));
    default:
      return false;
  }
}
