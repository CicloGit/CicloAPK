import { db, Warehouse } from "./store.js";

export function upsertWarehouse(w: Warehouse): Warehouse {
  db.warehouses.set(`${w.orgId}::${w.warehouseId}`, w);
  return w;
}
