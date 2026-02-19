"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensureStockAvailability = exports.ensureString = exports.ensurePositiveAmount = void 0;
const https_1 = require("firebase-functions/v2/https");
const ensurePositiveAmount = (value, fieldName) => {
    if (!Number.isFinite(value) || value <= 0) {
        throw new https_1.HttpsError('invalid-argument', `${fieldName} deve ser maior que zero.`);
    }
};
exports.ensurePositiveAmount = ensurePositiveAmount;
const ensureString = (value, fieldName) => {
    const normalized = String(value ?? '').trim();
    if (!normalized) {
        throw new https_1.HttpsError('invalid-argument', `${fieldName} obrigatorio.`);
    }
    return normalized;
};
exports.ensureString = ensureString;
const ensureStockAvailability = (requestedQuantity, availableQuantity, listingId) => {
    if (requestedQuantity > availableQuantity) {
        throw new https_1.HttpsError('failed-precondition', `Estoque insuficiente para listing ${listingId}. Disponivel=${availableQuantity}, solicitado=${requestedQuantity}.`);
    }
};
exports.ensureStockAvailability = ensureStockAvailability;
