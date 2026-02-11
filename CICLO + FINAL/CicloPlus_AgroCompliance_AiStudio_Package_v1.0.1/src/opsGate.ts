import { db } from "./store.js";
import { isLocked } from "./locksService.js";
import { Operation } from "./enums.js";

export function gateOperationOnLote(orgId: string, loteId: string, op: Operation): { allowed: boolean; reason?: string } {
  const lote = db.lotes.get(`${orgId}::${loteId}`);
  if (!lote) return { allowed: false, reason: "Lote não encontrado." };

  // Divergência trava operações críticas
  if (lote.missingHeads > 0 || lote.status === "DIVERGENTE" || lote.status === "BLOQUEADO") {
    if (["ALIMENTACAO","MEDICAMENTO","TRANSFERENCIA","NF_VENDA"].includes(op)) {
      return { allowed: false, reason: "DIVERGENCIA_LOTE" };
    }
  }

  const lock = isLocked(orgId, op, "LOTE", loteId);
  if (lock) return { allowed: false, reason: lock.reason };

  return { allowed: true };
}
