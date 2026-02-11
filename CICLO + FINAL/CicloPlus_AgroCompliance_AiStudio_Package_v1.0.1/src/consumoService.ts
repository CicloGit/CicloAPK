import { getInsumo } from "./insumoService.js";
import { getStockBalance, applyStockMove } from "./stockService.js";

export function consumirAlimentacao(params: {
  orgId: string;
  loteId: string;
  loteStatus: "CONFORME" | "DIVERGENTE" | "BLOQUEADO";
  missingHeads: number;
  warehouseId: string;
  skuId: string;
  quantidade: number;
  unidade: "KG" | "L" | "DOSE" | "UN";
  actorUserId: string;
  lastroFiscalTemNotaFiscalFechadaSuficiente: boolean;
}): void {
  if (params.loteStatus !== "CONFORME" || params.missingHeads > 0) throw new Error("Consumo bloqueado: lote divergente.");

  const insumo = getInsumo(params.orgId, params.skuId);
  if (insumo.exigirNotaFiscalParaConsumo && !params.lastroFiscalTemNotaFiscalFechadaSuficiente) {
    throw new Error("Consumo bloqueado: sem lastro fiscal por Nota Fiscal de entrada fechada suficiente.");
  }

  const bal = getStockBalance(params.orgId, params.warehouseId, params.skuId);
  if (bal.qtyOnHand < params.quantidade) throw new Error("Consumo bloqueado: estoque insuficiente.");

  applyStockMove({
    orgId: params.orgId,
    type: "CONSUMO_ALIMENTACAO",
    warehouseId: params.warehouseId,
    skuId: params.skuId,
    quantidade: -Math.abs(params.quantidade),
    unidade: params.unidade,
    refType: "LANCAMENTO",
    refId: `LOTE:${params.loteId}`,
    actorUserId: params.actorUserId
  });
}

export function consumirMedicamento(params: {
  orgId: string;
  targetType: "LOTE" | "ANIMAL";
  targetId: string;
  loteStatusParaTargetLote?: "CONFORME" | "DIVERGENTE" | "BLOQUEADO";
  missingHeadsParaTargetLote?: number;
  warehouseId: string;
  skuId: string;
  quantidade: number;
  unidade: "KG" | "L" | "DOSE" | "UN";
  actorUserId: string;
  lastroFiscalTemNotaFiscalFechadaSuficiente: boolean;
}): void {
  if (params.targetType === "LOTE") {
    if (params.loteStatusParaTargetLote !== "CONFORME" || (params.missingHeadsParaTargetLote ?? 0) > 0) {
      throw new Error("Consumo bloqueado: lote divergente.");
    }
  }

  const insumo = getInsumo(params.orgId, params.skuId);
  if (insumo.exigirNotaFiscalParaConsumo && !params.lastroFiscalTemNotaFiscalFechadaSuficiente) {
    throw new Error("Consumo bloqueado: sem lastro fiscal por Nota Fiscal de entrada fechada suficiente.");
  }

  const bal = getStockBalance(params.orgId, params.warehouseId, params.skuId);
  if (bal.qtyOnHand < params.quantidade) throw new Error("Consumo bloqueado: estoque insuficiente.");

  applyStockMove({
    orgId: params.orgId,
    type: "CONSUMO_MEDICAMENTO",
    warehouseId: params.warehouseId,
    skuId: params.skuId,
    quantidade: -Math.abs(params.quantidade),
    unidade: params.unidade,
    refType: "LANCAMENTO",
    refId: `${params.targetType}:${params.targetId}`,
    actorUserId: params.actorUserId
  });
}
