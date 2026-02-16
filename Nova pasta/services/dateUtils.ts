const PT_BR_DATE = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})(?:[ ,T]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?$/;

export const parseDateToTimestamp = (value: string): number => {
  const raw = value.trim();
  if (!raw) {
    return 0;
  }

  const match = raw.match(PT_BR_DATE);
  if (match) {
    const [, d, m, y, hh, mm, ss] = match;
    const year = y.length === 2 ? Number(`20${y}`) : Number(y);
    const date = new Date(
      year,
      Number(m) - 1,
      Number(d),
      Number(hh ?? 0),
      Number(mm ?? 0),
      Number(ss ?? 0)
    );
    return Number.isNaN(date.getTime()) ? 0 : date.getTime();
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? 0 : fallback.getTime();
};
