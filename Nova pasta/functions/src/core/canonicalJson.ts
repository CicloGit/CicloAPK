const normalizeDate = (value: string): string => {
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return value;
  }
  return new Date(parsed).toISOString();
};

const normalizeValue = (value: unknown): unknown => {
  if (value === null || value === undefined) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => normalizeValue(entry));
  }

  if (typeof value === 'string') {
    return normalizeDate(value);
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
      .map(([key, entryValue]) => [key, normalizeValue(entryValue)]);

    return Object.fromEntries(entries);
  }

  return value;
};

export const canonicalJson = (value: unknown): string => JSON.stringify(normalizeValue(value));
