import { db, Cycle } from "./store.js";
import { newId } from "./id.js";

export function openCycle(orgId: string, periodStart: string, periodEnd: string): Cycle {
  const cycleId = newId();
  const cycle: Cycle = {
    orgId,
    cycleId,
    status: "OPEN",
    periodStart,
    periodEnd,
    inventory: { completed: false },
    conference: { status: "PENDING" },
    launches: { feedCount: 0, medCount: 0, weightCount: 0 }
  };
  db.cycles.set(`${orgId}::${cycleId}`, cycle);
  return cycle;
}

export function markInventoryCompleted(orgId: string, cycleId: string): Cycle {
  const cycle = db.cycles.get(`${orgId}::${cycleId}`);
  if (!cycle) throw new Error("Ciclo não encontrado.");
  cycle.inventory.completed = true;
  db.cycles.set(`${orgId}::${cycleId}`, cycle);
  return cycle;
}

export function requestCloseCycle(orgId: string, cycleId: string): { cycle: Cycle; conferenceId: string } {
  const cycle = db.cycles.get(`${orgId}::${cycleId}`);
  if (!cycle) throw new Error("Ciclo não encontrado.");
  if (cycle.status !== "OPEN") throw new Error("Ciclo não está aberto.");

  cycle.status = "PENDING_CONFERENCE";
  const conferenceId = newId();
  cycle.conference.conferenceId = conferenceId;
  cycle.conference.status = "PENDING";
  db.cycles.set(`${orgId}::${cycleId}`, cycle);

  return { cycle, conferenceId };
}

export function reviewConference(orgId: string, cycleId: string): { result: "OK" | "INCONSISTENT" | "MISSING_DATA"; issues: { code: string; message: string; refs: string[] }[] } {
  const cycle = db.cycles.get(`${orgId}::${cycleId}`);
  if (!cycle) throw new Error("Ciclo não encontrado.");
  if (cycle.status !== "PENDING_CONFERENCE") throw new Error("Ciclo não está em conferência pendente.");

  const issues: { code: string; message: string; refs: string[] }[] = [];

  // Regras mínimas de conferência:
  if (!cycle.inventory.completed) {
    issues.push({ code: "INVENTARIO_NAO_CONFIRMADO", message: "Inventário do lote não foi confirmado no ciclo.", refs: ["cycle.inventory.completed"] });
  }

  // Exemplo: exigir pelo menos uma pesagem para transições relevantes (regra parametrizável)
  if (cycle.launches.weightCount === 0) {
    issues.push({ code: "PESAGEM_AUSENTE", message: "Não há pesagens registradas no ciclo.", refs: ["cycle.launches.weightCount"] });
  }

  const result = issues.length === 0 ? "OK" : "INCONSISTENT";
  cycle.conference.result = result;
  db.cycles.set(`${orgId}::${cycleId}`, cycle);

  return { result, issues };
}

export function approveConference(orgId: string, cycleId: string): Cycle {
  const cycle = db.cycles.get(`${orgId}::${cycleId}`);
  if (!cycle) throw new Error("Ciclo não encontrado.");
  if (cycle.status !== "PENDING_CONFERENCE") throw new Error("Ciclo não está em conferência pendente.");
  if (cycle.conference.result !== "OK") throw new Error("Conferência não está OK para aprovação.");

  cycle.conference.status = "APPROVED";
  cycle.status = "CLOSED";
  db.cycles.set(`${orgId}::${cycleId}`, cycle);
  return cycle;
}
