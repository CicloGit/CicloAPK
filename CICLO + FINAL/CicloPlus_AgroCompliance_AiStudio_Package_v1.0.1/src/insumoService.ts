import { db, Insumo } from "./store.js";

export function upsertInsumo(insumo: Insumo): Insumo {
  if (!insumo.orgId) throw new Error("orgId é obrigatório.");
  if (!insumo.skuId) throw new Error("skuId é obrigatório.");
  if (!insumo.nome) throw new Error("nome é obrigatório.");
  db.insumos.set(`${insumo.orgId}::${insumo.skuId}`, insumo);
  return insumo;
}

export function getInsumo(orgId: string, skuId: string): Insumo {
  const v = db.insumos.get(`${orgId}::${skuId}`);
  if (!v) throw new Error("Insumo não encontrado.");
  return v;
}
