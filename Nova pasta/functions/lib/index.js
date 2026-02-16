"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.secureRegisterStockLoss = exports.secureConfirmInboundEntry = exports.agroApi = exports.api = void 0;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const node_crypto_1 = require("node:crypto");
const https_1 = require("firebase-functions/v2/https");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const adminAuth = (0, auth_1.getAuth)();
const ENFORCE_APP_CHECK = process.env.FUNCTIONS_ENFORCE_APP_CHECK === 'true';
const STOCK_ALLOWED_ROLES = new Set(['Produtor', 'Gestor', 'Fornecedor', 'Produtor de Sementes']);
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};
const send = (res, status, body) => {
    Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));
    res.status(status).json(body);
};
const todayBR = () => new Date().toLocaleDateString('pt-BR');
const normalizeLegacyPath = (path) => {
    if (path.startsWith('/api/')) {
        return path.slice(4);
    }
    if (path === '/api') {
        return '/';
    }
    return path;
};
const parseAuthToken = (authorization) => {
    if (!authorization) {
        return null;
    }
    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) {
        return null;
    }
    return token;
};
const requireUser = async (req) => {
    const token = parseAuthToken(req.headers.authorization);
    if (!token) {
        throw new Error('UNAUTHORIZED');
    }
    const decoded = await adminAuth.verifyIdToken(token);
    return decoded.uid;
};
const requireUserProfile = async (uid) => {
    const userDoc = await db.collection('users').doc(uid).get();
    if (!userDoc.exists) {
        throw new https_1.HttpsError('failed-precondition', 'Perfil do usuario nao encontrado.');
    }
    const role = String(userDoc.get('role') ?? '');
    const tenantId = String(userDoc.get('tenantId') ?? '');
    if (!role || !tenantId) {
        throw new https_1.HttpsError('failed-precondition', 'Dados de perfil incompletos.');
    }
    return { role, tenantId };
};
const requireRole = async (uid) => {
    const profile = await requireUserProfile(uid);
    if (!STOCK_ALLOWED_ROLES.has(profile.role)) {
        throw new https_1.HttpsError('permission-denied', 'Sem permissao.');
    }
    return profile;
};
const getPreviousAuditHash = async () => {
    const latest = await db.collection('auditEvents').orderBy('createdAt', 'desc').limit(1).get();
    if (latest.empty) {
        return '0'.repeat(64);
    }
    return String(latest.docs[0].get('hash') || '0'.repeat(64));
};
const hashAudit = (payload, previousHash) => {
    return (0, node_crypto_1.createHash)('sha256').update(JSON.stringify(payload) + previousHash).digest('hex');
};
const resolveAIResult = (imageName) => {
    const normalized = imageName.toLowerCase();
    if (normalized.includes('ferrugem') || normalized.includes('rust')) {
        return {
            diagnosis: 'Ferrugem Asiatica (Estagio Inicial)',
            confidence: 94,
            recommendation: 'Aplicacao imediata de fungicida sistemico para controle.',
            action: 'TREAT',
            product: 'Fungicida Triazol + Estrobilurina',
        };
    }
    if (normalized.includes('praga') || normalized.includes('lagarta')) {
        return {
            diagnosis: 'Pressao de praga foliar',
            confidence: 88,
            recommendation: 'Iniciar manejo integrado com monitoramento e controle localizado.',
            action: 'TREAT',
            product: 'Inseticida biologico (Bacillus thuringiensis)',
        };
    }
    return {
        diagnosis: 'Anomalia nutricional (confirmacao recomendada)',
        confidence: 71,
        recommendation: 'Executar analise foliar e validar em campo com tecnico responsavel.',
        action: 'STUDY',
    };
};
async function handleCarLookup(req, res) {
    const uid = await requireUser(req);
    const carCode = String(req.body?.carCode ?? '').trim();
    if (!carCode || carCode.length < 6) {
        send(res, 400, { error: 'CAR invalido.' });
        return;
    }
    const ref = db.collection('carRegistry').doc(carCode);
    const snapshot = await ref.get();
    if (!snapshot.exists) {
        send(res, 404, { error: 'CAR nao encontrado.' });
        return;
    }
    const payload = snapshot.data();
    await db.collection('carQueries').add({
        uid,
        carCode,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
    });
    send(res, 200, { data: payload });
}
async function handleAIAnalyze(req, res) {
    const uid = await requireUser(req);
    const imageName = String(req.body?.imageName ?? 'imagem-sem-nome').trim();
    const result = resolveAIResult(imageName);
    await db.collection('aiAnalyses').add({
        imageName,
        result,
        source: 'functions-v2',
        createdBy: uid,
        createdAt: firestore_1.FieldValue.serverTimestamp(),
        updatedAt: firestore_1.FieldValue.serverTimestamp(),
    });
    send(res, 200, { data: result });
}
async function handleHttpApi(req, res, options) {
    if (req.method === 'OPTIONS') {
        Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));
        res.status(204).send('');
        return;
    }
    const routePath = options?.allowLegacyPrefix ? normalizeLegacyPath(req.path) : req.path;
    try {
        if (req.method === 'GET' && routePath === '/health') {
            send(res, 200, { status: 'ok' });
            return;
        }
        if (req.method === 'POST' && routePath === '/v1/car/lookup') {
            await handleCarLookup(req, res);
            return;
        }
        if (req.method === 'POST' && routePath === '/v1/ai/analyze') {
            await handleAIAnalyze(req, res);
            return;
        }
        send(res, 404, { error: 'Endpoint nao encontrado.' });
    }
    catch (error) {
        if (error instanceof Error && error.message === 'UNAUTHORIZED') {
            send(res, 401, { error: 'Nao autenticado.' });
            return;
        }
        send(res, 500, { error: 'Falha interna no backend.' });
    }
}
exports.api = (0, https_1.onRequest)({ region: 'us-central1' }, async (req, res) => {
    await handleHttpApi(req, res);
});
exports.agroApi = (0, https_1.onRequest)({
    region: 'us-central1',
    timeoutSeconds: 60,
    maxInstances: 20,
    memory: '512MiB',
}, async (req, res) => {
    await handleHttpApi(req, res, { allowLegacyPrefix: true });
});
exports.secureConfirmInboundEntry = (0, https_1.onCall)({
    region: 'southamerica-east1',
    timeoutSeconds: 60,
    maxInstances: 20,
    enforceAppCheck: ENFORCE_APP_CHECK,
}, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario nao autenticado.');
    }
    const profile = await requireRole(uid);
    const movementId = String(request.data?.movementId ?? '');
    const invoiceNumber = String(request.data?.invoiceNumber ?? '').trim();
    if (!movementId || !invoiceNumber) {
        throw new https_1.HttpsError('invalid-argument', 'Dados de entrada incompletos.');
    }
    const previousHash = await getPreviousAuditHash();
    const result = await db.runTransaction(async (tx) => {
        const movementRef = db.collection('stockMovements').doc(movementId);
        const movementDoc = await tx.get(movementRef);
        if (!movementDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Movimento inexistente.');
        }
        const movement = movementDoc.data();
        if (String(movement.tenantId ?? '') !== profile.tenantId) {
            throw new https_1.HttpsError('permission-denied', 'Tenant divergente.');
        }
        if (movement.status === 'COMPLETED') {
            return { alreadyCompleted: true, movementId };
        }
        const itemId = String(movement.itemId ?? '');
        const itemRef = db.collection('inventoryItems').doc(itemId);
        const itemDoc = await tx.get(itemRef);
        const movementQty = Number(movement.quantity ?? 0);
        const currentQty = Number(itemDoc.data()?.quantity ?? 0);
        if (!itemDoc.exists) {
            tx.set(itemRef, {
                id: itemId,
                name: String(movement.itemName ?? 'Item de compra'),
                category: 'Outro',
                quantity: movementQty,
                unit: String(movement.unit ?? 'un'),
                minLevel: 0,
                location: 'Recebimento',
                lastUpdated: todayBR(),
                tenantId: profile.tenantId,
                createdAt: firestore_1.FieldValue.serverTimestamp(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        else {
            tx.update(itemRef, {
                quantity: currentQty + movementQty,
                lastUpdated: todayBR(),
                updatedAt: firestore_1.FieldValue.serverTimestamp(),
            });
        }
        tx.update(movementRef, {
            status: 'COMPLETED',
            invoiceNumber,
            confirmedBy: uid,
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        const auditRef = db.collection('auditEvents').doc();
        const baseAudit = {
            id: auditRef.id,
            timestamp: new Date().toISOString(),
            actor: uid,
            action: 'STOCK_INBOUND_CONFIRMED',
            details: `Entrada: ${String(movement.itemName ?? itemId)} (${movementQty})`,
            geolocation: '-15.123, -47.654',
            verified: true,
            tenantId: profile.tenantId,
        };
        const hash = hashAudit(baseAudit, previousHash);
        tx.set(auditRef, {
            ...baseAudit,
            hash,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return { alreadyCompleted: false, movementId, auditEventId: auditRef.id };
    });
    return {
        success: true,
        movementId: result.movementId,
        alreadyCompleted: Boolean(result.alreadyCompleted),
        auditEventId: result.auditEventId,
    };
});
exports.secureRegisterStockLoss = (0, https_1.onCall)({
    region: 'southamerica-east1',
    timeoutSeconds: 60,
    maxInstances: 20,
    enforceAppCheck: ENFORCE_APP_CHECK,
}, async (request) => {
    const uid = request.auth?.uid;
    if (!uid) {
        throw new https_1.HttpsError('unauthenticated', 'Usuario nao autenticado.');
    }
    const profile = await requireRole(uid);
    const itemId = String(request.data?.itemId ?? '');
    const quantity = Number(request.data?.quantity ?? 0);
    const reason = String(request.data?.reason ?? '').trim();
    const proofUrl = String(request.data?.proofUrl ?? '').trim();
    const requester = String(request.data?.requester ?? '').trim() || uid;
    if (!itemId || quantity <= 0 || !reason) {
        throw new https_1.HttpsError('invalid-argument', 'Dados de perda invalidos.');
    }
    if (!proofUrl) {
        throw new https_1.HttpsError('invalid-argument', 'Comprovante da perda nao informado.');
    }
    const previousHash = await getPreviousAuditHash();
    const txResult = await db.runTransaction(async (tx) => {
        const itemRef = db.collection('inventoryItems').doc(itemId);
        const itemDoc = await tx.get(itemRef);
        if (!itemDoc.exists) {
            throw new https_1.HttpsError('not-found', 'Item nao encontrado.');
        }
        const item = itemDoc.data();
        if (Number(item.quantity ?? 0) < quantity) {
            throw new https_1.HttpsError('failed-precondition', 'Saldo insuficiente para registrar perda.');
        }
        tx.update(itemRef, {
            quantity: Number(item.quantity) - quantity,
            lastUpdated: todayBR(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        const movementRef = db.collection('stockMovements').doc();
        const auditRef = db.collection('auditEvents').doc();
        const unit = String(item.unit ?? 'un');
        const itemName = String(item.name ?? itemId);
        const baseAudit = {
            id: auditRef.id,
            timestamp: new Date().toISOString(),
            actor: uid,
            action: 'STOCK_OUTBOUND_LOSS',
            details: `Baixa de ${quantity} ${unit} de ${itemName}. Motivo: ${reason}`,
            geolocation: '-15.123, -47.654',
            verified: true,
            proofUrl,
            tenantId: profile.tenantId,
        };
        const hash = hashAudit(baseAudit, previousHash);
        tx.set(movementRef, {
            id: movementRef.id,
            itemId,
            itemName,
            type: 'OUTBOUND_LOSS',
            quantity,
            unit,
            date: todayBR(),
            status: 'AUDITED',
            requester,
            reason,
            proofUrl,
            auditHash: hash,
            tenantId: profile.tenantId,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        tx.set(auditRef, {
            ...baseAudit,
            hash,
            createdAt: firestore_1.FieldValue.serverTimestamp(),
            updatedAt: firestore_1.FieldValue.serverTimestamp(),
        });
        return { movementId: movementRef.id, auditEventId: auditRef.id };
    });
    return {
        success: true,
        movementId: txResult.movementId,
        auditEventId: txResult.auditEventId,
    };
});
