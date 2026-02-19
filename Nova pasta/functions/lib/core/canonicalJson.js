"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalJson = void 0;
const normalizeDate = (value) => {
    const parsed = Date.parse(value);
    if (Number.isNaN(parsed)) {
        return value;
    }
    return new Date(parsed).toISOString();
};
const normalizeValue = (value) => {
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
        const entries = Object.entries(value)
            .filter(([, entryValue]) => entryValue !== undefined)
            .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
            .map(([key, entryValue]) => [key, normalizeValue(entryValue)]);
        return Object.fromEntries(entries);
    }
    return value;
};
const canonicalJson = (value) => JSON.stringify(normalizeValue(value));
exports.canonicalJson = canonicalJson;
