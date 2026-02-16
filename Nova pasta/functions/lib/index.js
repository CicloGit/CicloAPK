"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.api = void 0;
const app_1 = require("firebase-admin/app");
const auth_1 = require("firebase-admin/auth");
const firestore_1 = require("firebase-admin/firestore");
const https_1 = require("firebase-functions/v2/https");
(0, app_1.initializeApp)();
const db = (0, firestore_1.getFirestore)();
const adminAuth = (0, auth_1.getAuth)();
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, content-type',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
};
const send = (res, status, body) => {
    Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));
    res.status(status).json(body);
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
exports.api = (0, https_1.onRequest)({ region: 'us-central1' }, async (req, res) => {
    if (req.method === 'OPTIONS') {
        Object.entries(corsHeaders).forEach(([key, value]) => res.setHeader(key, value));
        res.status(204).send('');
        return;
    }
    try {
        if (req.method === 'GET' && req.path === '/health') {
            send(res, 200, { status: 'ok' });
            return;
        }
        if (req.method === 'POST' && req.path === '/v1/car/lookup') {
            await handleCarLookup(req, res);
            return;
        }
        if (req.method === 'POST' && req.path === '/v1/ai/analyze') {
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
});
