"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RELEASE_EVENTS = exports.CONTRACT_EVENTS = exports.DELIVERY_EVENTS = exports.DISPATCH_EVENTS = exports.SETTLEMENT_TEMPLATES = exports.OPERATION_CATALOG = exports.normalizeCoreRole = void 0;
const ROLE_ALIASES = {
    PRODUTOR: 'PRODUCER',
    PRODUCER: 'PRODUCER',
    FORNECEDOR: 'SUPPLIER',
    SUPPLIER: 'SUPPLIER',
    INTEGRADORA: 'INTEGRATOR',
    INTEGRATOR: 'INTEGRATOR',
    TECNICO: 'TECHNICIAN',
    TECHNICIAN: 'TECHNICIAN',
    INVESTIDOR: 'INVESTOR',
    INVESTOR: 'INVESTOR',
    GESTOR: 'MANAGER',
    MANAGER: 'MANAGER',
    GESTOR_DE_TRAFEGO: 'TRAFFIC_MANAGER',
    TRAFFIC_MANAGER: 'TRAFFIC_MANAGER',
    ADMINISTRADOR: 'ADMIN',
    ADMIN: 'ADMIN',
};
const normalizeCoreRole = (role) => {
    const normalized = String(role ?? '')
        .trim()
        .replace(/\s+/g, '_')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toUpperCase();
    return ROLE_ALIASES[normalized] ?? null;
};
exports.normalizeCoreRole = normalizeCoreRole;
exports.OPERATION_CATALOG = {
    MARKET_LISTING_CREATE: {
        operationType: 'MARKET_LISTING_CREATE',
        critical: false,
        allowedRoles: ['PRODUCER', 'SUPPLIER', 'MANAGER', 'ADMIN'],
        evidencePolicy: 'NONE',
        stateMachine: 'Listing',
    },
    MARKET_LISTING_PUBLISH: {
        operationType: 'MARKET_LISTING_PUBLISH',
        critical: true,
        allowedRoles: ['PRODUCER', 'SUPPLIER', 'MANAGER', 'ADMIN'],
        evidencePolicy: 'SETTLEMENT_AUDIT_GATE',
        stateMachine: 'Listing',
    },
    MARKET_ORDER_PLACE: {
        operationType: 'MARKET_ORDER_PLACE',
        critical: true,
        allowedRoles: ['PRODUCER', 'INTEGRATOR', 'MANAGER', 'ADMIN'],
        evidencePolicy: 'NONE',
        stateMachine: 'Order',
    },
    MARKET_ORDER_RESERVE_STOCK: {
        operationType: 'MARKET_ORDER_RESERVE_STOCK',
        critical: true,
        allowedRoles: ['SUPPLIER', 'MANAGER', 'ADMIN'],
        evidencePolicy: 'NONE',
        stateMachine: 'Order',
    },
    MARKET_CONTRACT_SIGN: {
        operationType: 'MARKET_CONTRACT_SIGN',
        critical: true,
        allowedRoles: ['PRODUCER', 'SUPPLIER', 'MANAGER', 'ADMIN'],
        evidencePolicy: 'CONTRACT_B_REQUIRED',
        stateMachine: 'Contract',
    },
    MARKET_ESCROW_CREATE: {
        operationType: 'MARKET_ESCROW_CREATE',
        critical: true,
        allowedRoles: ['MANAGER', 'ADMIN'],
        evidencePolicy: 'SETTLEMENT_AUDIT_GATE',
        stateMachine: 'Settlement',
    },
    MARKET_DISPATCH_CONFIRM: {
        operationType: 'MARKET_DISPATCH_CONFIRM',
        critical: true,
        allowedRoles: ['SUPPLIER', 'MANAGER', 'ADMIN'],
        evidencePolicy: 'DISPATCH_A_OR_TELEMETRY',
        stateMachine: 'Order',
    },
    MARKET_DELIVERY_CONFIRM: {
        operationType: 'MARKET_DELIVERY_CONFIRM',
        critical: true,
        allowedRoles: ['PRODUCER', 'SUPPLIER', 'MANAGER', 'ADMIN'],
        evidencePolicy: 'DELIVERY_A_AND_OPTIONAL_B',
        stateMachine: 'Order',
    },
    MARKET_SPLIT_RELEASE: {
        operationType: 'MARKET_SPLIT_RELEASE',
        critical: true,
        allowedRoles: ['MANAGER', 'ADMIN'],
        evidencePolicy: 'SETTLEMENT_AUDIT_GATE',
        stateMachine: 'Settlement',
    },
    MARKET_DISPUTE_OPEN: {
        operationType: 'MARKET_DISPUTE_OPEN',
        critical: true,
        allowedRoles: ['PRODUCER', 'SUPPLIER', 'MANAGER', 'TRAFFIC_MANAGER', 'ADMIN'],
        evidencePolicy: 'NONE',
        stateMachine: 'Dispute',
    },
    MARKET_DISPUTE_RESOLVE: {
        operationType: 'MARKET_DISPUTE_RESOLVE',
        critical: true,
        allowedRoles: ['MANAGER', 'TRAFFIC_MANAGER', 'ADMIN'],
        evidencePolicy: 'SETTLEMENT_AUDIT_GATE',
        stateMachine: 'Dispute',
    },
    CONSUMER_MARKET_ORDER_CREATE: {
        operationType: 'CONSUMER_MARKET_ORDER_CREATE',
        critical: true,
        allowedRoles: ['PRODUCER', 'INTEGRATOR', 'MANAGER', 'ADMIN'],
        evidencePolicy: 'NONE',
        stateMachine: 'Order',
    },
    CONSUMER_MARKET_CONTRACT_SIGN: {
        operationType: 'CONSUMER_MARKET_CONTRACT_SIGN',
        critical: true,
        allowedRoles: ['PRODUCER', 'MANAGER', 'ADMIN'],
        evidencePolicy: 'CONTRACT_B_REQUIRED',
        stateMachine: 'Contract',
    },
    CONSUMER_MARKET_DISPATCH_CONFIRM: {
        operationType: 'CONSUMER_MARKET_DISPATCH_CONFIRM',
        critical: true,
        allowedRoles: ['SUPPLIER', 'MANAGER', 'ADMIN'],
        evidencePolicy: 'DISPATCH_A_OR_TELEMETRY',
        stateMachine: 'Order',
    },
    CONSUMER_MARKET_DELIVERY_CONFIRM: {
        operationType: 'CONSUMER_MARKET_DELIVERY_CONFIRM',
        critical: true,
        allowedRoles: ['PRODUCER', 'MANAGER', 'ADMIN'],
        evidencePolicy: 'DELIVERY_A_AND_OPTIONAL_B',
        stateMachine: 'Order',
    },
    CONSUMER_MARKET_SETTLEMENT_RELEASE: {
        operationType: 'CONSUMER_MARKET_SETTLEMENT_RELEASE',
        critical: true,
        allowedRoles: ['MANAGER', 'ADMIN'],
        evidencePolicy: 'SETTLEMENT_AUDIT_GATE',
        stateMachine: 'Settlement',
    },
};
exports.SETTLEMENT_TEMPLATES = {
    MARKETPLACE: {
        code: 'MARKETPLACE_STANDARD',
        split: [
            { party: 'PRODUCER', share: 0.87 },
            { party: 'PLATFORM', share: 0.08 },
            { party: 'LOGISTICS', share: 0.05 },
        ],
    },
    CONSUMER_MARKET: {
        code: 'CONSUMER_MARKET_STANDARD',
        split: [
            { party: 'PRODUCER', share: 0.86 },
            { party: 'PLATFORM', share: 0.09 },
            { party: 'LOGISTICS', share: 0.05 },
        ],
    },
};
exports.DISPATCH_EVENTS = new Set([
    'MARKET_DISPATCH_CONFIRM',
    'CONSUMER_MARKET_DISPATCH_CONFIRM',
]);
exports.DELIVERY_EVENTS = new Set([
    'MARKET_DELIVERY_CONFIRM',
    'CONSUMER_MARKET_DELIVERY_CONFIRM',
]);
exports.CONTRACT_EVENTS = new Set([
    'MARKET_CONTRACT_SIGN',
    'CONSUMER_MARKET_CONTRACT_SIGN',
]);
exports.RELEASE_EVENTS = new Set([
    'MARKET_SPLIT_RELEASE',
    'CONSUMER_MARKET_SETTLEMENT_RELEASE',
]);
