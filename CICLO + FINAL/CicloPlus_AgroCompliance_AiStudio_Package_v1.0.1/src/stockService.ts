import { db, StockBalance, StockMove } from "./store.js";
import { newId } from "./id.js";

function balanceKey(orgId: string, warehouseId: string, skuId: string): string {
  return `${orgId}::${warehouseId}::${skuId}`;
}

export function getStockBalance(orgId: string, warehouseId: string, skuId: string): StockBalance {
  const k = balanceKey(orgId, warehouseId, skuId);
  return db.stockBalances.get(k) ?? { orgId, warehouseId, skuId, qtyOnHand: 0 };
}

export function applyStockMove(move: Omit<StockMove, "stockMoveId" | "timestamp"> & { stockMoveId?: string; timestamp?: string }): StockBalance {
  const stockMoveId = move.stockMoveId ?? newId();
  const timestamp = move.timestamp ?? new Date().toISOString();
  const full: StockMove = { ...move, stockMoveId, timestamp };

  db.stockMoves.set(`${full.orgId}::${full.stockMoveId}`, full);

  const current = getStockBalance(full.orgId, full.warehouseId, full.skuId);
  const updated: StockBalance = { ...current, qtyOnHand: current.qtyOnHand + full.quantidade };
  db.stockBalances.set(balanceKey(full.orgId, full.warehouseId, full.skuId), updated);

  return updated;
}
