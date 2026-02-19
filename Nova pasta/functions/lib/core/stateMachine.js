"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertDisputeTransition = exports.assertSettlementTransition = exports.assertContractTransition = exports.assertOrderTransition = exports.assertListingTransition = void 0;
const https_1 = require("firebase-functions/v2/https");
const listingTransitions = {
    DRAFT: ['PUBLISHED'],
    PUBLISHED: ['PAUSED', 'CLOSED'],
    PAUSED: ['PUBLISHED', 'CLOSED'],
    CLOSED: [],
};
const orderTransitions = {
    CREATED: ['RESERVED'],
    RESERVED: ['CONTRACT_PENDING'],
    CONTRACT_PENDING: ['ESCROW_CREATED'],
    ESCROW_CREATED: ['DISPATCHED'],
    DISPATCHED: ['DELIVERED'],
    DELIVERED: ['SETTLED'],
    SETTLED: ['CLOSED'],
    CLOSED: [],
};
const contractTransitions = {
    DRAFT: ['SIGNED'],
    SIGNED: ['ACTIVE', 'TERMINATED'],
    ACTIVE: ['COMPLETED', 'TERMINATED'],
    COMPLETED: [],
    TERMINATED: [],
};
const settlementTransitions = {
    CREATED: ['ESCROWED', 'FAILED'],
    ESCROWED: ['PARTIAL_RELEASED', 'RELEASED', 'FAILED'],
    PARTIAL_RELEASED: ['RELEASED', 'FAILED'],
    RELEASED: [],
    FAILED: [],
};
const disputeTransitions = {
    OPEN: ['IN_REVIEW', 'REJECTED'],
    IN_REVIEW: ['RESOLVED', 'REJECTED'],
    RESOLVED: [],
    REJECTED: [],
};
const throwInvalidTransition = (entity, from, to) => {
    throw new https_1.HttpsError('failed-precondition', `Transicao invalida (${entity}): ${from} -> ${to}.`);
};
const assertListingTransition = (from, to) => {
    const state = from;
    if (!listingTransitions[state]?.includes(to)) {
        throwInvalidTransition('Listing', from, to);
    }
};
exports.assertListingTransition = assertListingTransition;
const assertOrderTransition = (from, to) => {
    const state = from;
    if (!orderTransitions[state]?.includes(to)) {
        throwInvalidTransition('Order', from, to);
    }
};
exports.assertOrderTransition = assertOrderTransition;
const assertContractTransition = (from, to) => {
    const state = from;
    if (!contractTransitions[state]?.includes(to)) {
        throwInvalidTransition('Contract', from, to);
    }
};
exports.assertContractTransition = assertContractTransition;
const assertSettlementTransition = (from, to) => {
    const state = from;
    if (!settlementTransitions[state]?.includes(to)) {
        throwInvalidTransition('Settlement', from, to);
    }
};
exports.assertSettlementTransition = assertSettlementTransition;
const assertDisputeTransition = (from, to) => {
    const state = from;
    if (!disputeTransitions[state]?.includes(to)) {
        throwInvalidTransition('Dispute', from, to);
    }
};
exports.assertDisputeTransition = assertDisputeTransition;
