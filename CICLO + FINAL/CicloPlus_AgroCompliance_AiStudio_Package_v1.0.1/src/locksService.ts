import { Operation } from "./enums.js";
import { db, Lock, lockKey } from "./store.js";

export function setLock(params: Omit<Lock, "locked"> & { locked?: boolean }): Lock {
  const locked = params.locked ?? true;
  const k = lockKey(params.orgId, params.resource, params.targetType, params.targetId);
  const lock: Lock = { ...params, locked };
  db.locks.set(k, lock);
  return lock;
}

export function clearLock(orgId: string, resource: Operation, targetType: Lock["targetType"], targetId: string): void {
  const k = lockKey(orgId, resource, targetType, targetId);
  db.locks.delete(k);
}

export function isLocked(orgId: string, resource: Operation, targetType: Lock["targetType"], targetId: string): Lock | null {
  const k = lockKey(orgId, resource, targetType, targetId);
  const v = db.locks.get(k);
  return v?.locked ? v : null;
}
