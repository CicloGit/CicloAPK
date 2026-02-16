import 'dotenv/config';
import cors from 'cors';
import express from 'express';
import { FieldValue } from 'firebase-admin/firestore';
import { cadastrosRoutes } from './modules/cadastros/cadastrosRoutes';
import { locaisRoutes } from './modules/locais/locaisRoutes';
import { rebanhoRoutes } from './modules/rebanho/rebanhoRoutes';
import { conferenciaRoutes } from './modules/conferencias/conferenciaRoutes';
import { estoqueRoutes } from './modules/estoque/estoqueRoutes';
import { alimentacaoRoutes } from './modules/alimentacao/alimentacaoRoutes';
import { sanidadeRoutes } from './modules/sanidade/sanidadeRoutes';
import { pesagemRoutes } from './modules/pesagem_indicadores/pesagemRoutes';
import { vendasRoutes } from './modules/vendas_nf_saida/vendasRoutes';
import { relatoriosRoutes } from './modules/relatorios/relatoriosRoutes';
import { evidenciasRoutes } from './modules/evidencias/evidenciasRoutes';
import { nfEntradaRoutes } from './modules/nf_entrada/nfEntradaRoutes';
import { authenticateRequest } from './shared/auth/authMiddleware';
import { errorMiddleware, notFoundHandler } from './shared/errors/errorMiddleware';
import { firestoreDatabase } from './shared/firebaseAdmin';
import { asyncHandler } from './shared/middleware/asyncHandler';
import { setupSwagger } from './openapi/setupSwagger';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '20mb' }));

setupSwagger(app);

app.get(
  '/api/healthcheck',
  asyncHandler(async (request, response) => {
    const farmId = String(request.query.farmId ?? process.env.DEFAULT_FARM_HEALTHCHECK_ID ?? 'farm-healthcheck');
    const reference = firestoreDatabase.collection(`farms/${farmId}/healthcheck`).doc('probe');
    await reference.set(
      {
        message: 'healthcheck-write',
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );

    const snapshot = await reference.get();
    response.status(200).json({
      ok: true,
      farmId,
      exists: snapshot.exists,
      data: snapshot.data() ?? null,
    });
  }),
);

app.use('/api', authenticateRequest);
app.use('/api', cadastrosRoutes);
app.use('/api', locaisRoutes);
app.use('/api', rebanhoRoutes);
app.use('/api', conferenciaRoutes);
app.use('/api', estoqueRoutes);
app.use('/api', alimentacaoRoutes);
app.use('/api', sanidadeRoutes);
app.use('/api', pesagemRoutes);
app.use('/api', vendasRoutes);
app.use('/api', relatoriosRoutes);
app.use('/api', evidenciasRoutes);
app.use('/api', nfEntradaRoutes);

app.use(notFoundHandler);
app.use(errorMiddleware);
