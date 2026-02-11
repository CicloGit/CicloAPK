export function getByPath(obj: any, path: string): any {
  // path example: $.lote.missingHeads
  const p = path.replace(/^\$\./, "");
  if (!p) return obj;
  const parts = p.split(".");
  let cur = obj;
  for (const part of parts) {
    if (cur == null) return undefined;
    cur = cur[part];
  }
  return cur;
}
