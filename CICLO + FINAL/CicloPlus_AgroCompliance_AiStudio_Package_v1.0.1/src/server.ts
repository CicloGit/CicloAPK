import express from "express";
import { z } from "zod";
import rulesData from "../rules/agro-rules-full.json" assert { type: "json" };
import { evaluateRules } from "./ruleEngine.js";

import { db } from "./store.js";
import { createMother, registerBirth } from "./birthService.js";
import { openCycle, closeCycle, markInventoryCompleted, reviewConference, approveConference } from "./cycleService.js";
import { gateOperationOnLote } from "./opsGate.js";
import { changeStage } from "./stageService.js";

import { upsertInsumo } from "./insumoService.js";
import { upsertWarehouse } from "./warehouseService.js";
import { getStockBalance } from "./stockService.js";
import { createNfEntradaProdutos, conferirNfEntradaProdutos, fecharNfEntradaProdutos } from "./nfEntradaProdutosService.js";
import { createNfEntradaAnimais, conferirNfEntradaAnimais, fecharNfEntradaAnimais } from "./nfEntradaAnimaisService.js";
import { consumirAlimentacao, consumirMedicamento } from "./consumoService.js";

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ ok: true, module: "agro", version: "1.0.1" }));

// Nascimento / identificação curta
app.post("/mothers", (req, res) => {
  const data = z.object({ orgId: z.string(), seq: z.number().int().min(1) }).parse(req.body);
  res.json(createMother(data.orgId, data.seq));
});

app.post("/births", (req, res) => {
  const data = z.object({ orgId: z.string(), motherId: z.string(), count: z.number().int().min(1) }).parse(req.body);
  res.json(registerBirth(data.orgId, data.motherId, data.count));
});

// Ciclo / inventário / conferência
app.post("/cycles/open", (req, res) => {
  const data = z.object({ orgId: z.string(), loteId: z.string(), cycleId: z.string() }).parse(req.body);
  res.json(openCycle(data.orgId, data.loteId, data.cycleId));
});
app.post("/cycles/close", (req, res) => {
  const data = z.object({ orgId: z.string(), loteId: z.string(), cycleId: z.string() }).parse(req.body);
  res.json(closeCycle(data.orgId, data.loteId, data.cycleId));
});
app.post("/cycles/inventory/completed", (req, res) => {
  const data = z.object({ orgId: z.string(), loteId: z.string(), cycleId: z.string() }).parse(req.body);
  res.json(markInventoryCompleted(data.orgId, data.loteId, data.cycleId));
});
app.post("/cycles/conference/review", (req, res) => {
  const data = z.object({ orgId: z.string(), loteId: z.string(), cycleId: z.string(), reviewerUserId: z.string() }).parse(req.body);
  res.json(reviewConference(data.orgId, data.loteId, data.cycleId, data.reviewerUserId));
});
app.post("/cycles/conference/approve", (req, res) => {
  const data = z.object({ orgId: z.string(), loteId: z.string(), cycleId: z.string(), approverUserId: z.string() }).parse(req.body);
  res.json(approveConference(data.orgId, data.loteId, data.cycleId, data.approverUserId));
});

// Gate por lote (travas)
app.post("/lotes/:loteId/gate", (req, res) => {
  const data = z.object({ orgId: z.string(), operation: z.string() }).parse(req.body);
  const outcome = gateOperationOnLote(data.orgId, req.params.loteId, data.operation as any);
  if (!outcome.allowed) return res.status(423).json(outcome);
  res.json(outcome);
});

// Mudança de estágio
app.post("/animals/:animalId/stage", (req, res) => {
  const data = z.object({
    orgId: z.string(),
    loteId: z.string(),
    cycleId: z.string(),
    fromStage: z.string(),
    toStage: z.string(),
    evidences: z.array(z.any()),
    override: z.boolean().optional(),
    approvals: z.array(z.object({ userId: z.string(), role: z.string() })).optional()
  }).parse(req.body);

  res.json(changeStage({
    orgId: data.orgId,
    animalId: req.params.animalId,
    loteId: data.loteId,
    cycleId: data.cycleId,
    fromStage: data.fromStage as any,
    toStage: data.toStage as any,
    evidences: data.evidences,
    override: data.override,
    approvals: data.approvals
  }));
});

// Insumos / armazém / estoque
app.post("/insumos", (req, res) => res.json(upsertInsumo(req.body)));
app.post("/warehouses", (req, res) => res.json(upsertWarehouse(req.body)));
app.get("/estoque/:warehouseId/:skuId", (req, res) => {
  const data = z.object({ orgId: z.string() }).parse(req.body);
  res.json(getStockBalance(data.orgId, req.params.warehouseId, req.params.skuId));
});

// NF entrada produtos
app.post("/nf-entrada/produtos", (req, res) => res.json(createNfEntradaProdutos(req.body)));
app.post("/nf-entrada/produtos/:nfEntradaId/conferir", (req, res) => {
  const data = z.object({ orgId: z.string(), evidencias: z.array(z.any()) }).parse(req.body);
  res.json(conferirNfEntradaProdutos(data.orgId, req.params.nfEntradaId, data.evidencias));
});
app.post("/nf-entrada/produtos/:nfEntradaId/fechar", (req, res) => {
  const data = z.object({ orgId: z.string(), actorUserId: z.string() }).parse(req.body);
  const nf = db.nfEntradaProdutos.get(`${data.orgId}::${req.params.nfEntradaId}`);
  if (!nf) throw new Error("Nota Fiscal de entrada de produtos não encontrada.");

  const outcome = evaluateRules(rulesData as any, { op: "NF_ENTRADA_PRODUTOS_FECHAR", nf } as any);
  const block = outcome.actions.find(a => (a as any).action === "block");
  if (!outcome.allowed) return res.status(423).json({ ok: false, message: (block as any)?.message ?? "Bloqueado por regra." });

  res.json(fecharNfEntradaProdutos(data.orgId, req.params.nfEntradaId, data.actorUserId));
});

// NF entrada animais
app.post("/nf-entrada/animais", (req, res) => res.json(createNfEntradaAnimais(req.body)));
app.post("/nf-entrada/animais/:nfEntradaId/conferir", (req, res) => {
  const data = z.object({ orgId: z.string(), quantidadeAnimaisConferida: z.number().int().min(0), animais: z.array(z.any()).optional(), evidencias: z.array(z.any()) }).parse(req.body);
  res.json(conferirNfEntradaAnimais(data.orgId, req.params.nfEntradaId, data.quantidadeAnimaisConferida, data.animais ?? [], data.evidencias));
});
app.post("/nf-entrada/animais/:nfEntradaId/fechar", (req, res) => {
  const data = z.object({ orgId: z.string(), override: z.boolean(), approvalsCount: z.number().int().min(0) }).parse(req.body);
  const nf = db.nfEntradaAnimais.get(`${data.orgId}::${req.params.nfEntradaId}`);
  if (!nf) throw new Error("Nota Fiscal de entrada de animais não encontrada.");

  const quantidadeIgual = nf.quantidadeAnimaisConferida === nf.quantidadeAnimaisNota;
  const ctx = { op: "NF_ENTRADA_ANIMAIS_FECHAR", nf: { ...nf, quantidadeAnimaisConferidaIgualNota: quantidadeIgual }, request: { override: data.override, approvalsCount: data.approvalsCount, approvalsRoles: [] } };
  const outcome = evaluateRules(rulesData as any, ctx as any);
  const block = outcome.actions.find(a => (a as any).action === "block");
  if (!outcome.allowed) return res.status(423).json({ ok: false, message: (block as any)?.message ?? "Bloqueado por regra." });

  res.json(fecharNfEntradaAnimais({ orgId: data.orgId, nfEntradaId: req.params.nfEntradaId, override: data.override, approvalsCount: data.approvalsCount }));
});

// Consumo
app.post("/consumo/alimentacao", (req, res) => {
  const data = z.object({ orgId: z.string(), loteId: z.string(), warehouseId: z.string(), skuId: z.string(), quantidade: z.number().positive(), unidade: z.enum(["KG","L","DOSE","UN"]), actorUserId: z.string(), lastroFiscalTemNotaFiscalFechadaSuficiente: z.boolean() }).parse(req.body);
  const lote = db.lotes.get(`${data.orgId}::${data.loteId}`);
  if (!lote) throw new Error("Lote não encontrado.");

  const gate = gateOperationOnLote(data.orgId, data.loteId, "ALIMENTACAO" as any);
  if (!gate.allowed) return res.status(423).json(gate);

  consumirAlimentacao({ orgId: data.orgId, loteId: data.loteId, loteStatus: lote.status, missingHeads: lote.missingHeads, warehouseId: data.warehouseId, skuId: data.skuId, quantidade: data.quantidade, unidade: data.unidade, actorUserId: data.actorUserId, lastroFiscalTemNotaFiscalFechadaSuficiente: data.lastroFiscalTemNotaFiscalFechadaSuficiente });
  res.json({ ok: true });
});

app.post("/consumo/medicamentos", (req, res) => {
  const data = z.object({ orgId: z.string(), targetType: z.enum(["LOTE","ANIMAL"]), targetId: z.string(), warehouseId: z.string(), skuId: z.string(), quantidade: z.number().positive(), unidade: z.enum(["KG","L","DOSE","UN"]), actorUserId: z.string(), lastroFiscalTemNotaFiscalFechadaSuficiente: z.boolean() }).parse(req.body);

  let loteStatusParaTargetLote: any = undefined;
  let missingHeadsParaTargetLote: any = undefined;

  if (data.targetType === "LOTE") {
    const gate = gateOperationOnLote(data.orgId, data.targetId, "MEDICAMENTO" as any);
    if (!gate.allowed) return res.status(423).json(gate);
    const lote = db.lotes.get(`${data.orgId}::${data.targetId}`);
    if (!lote) throw new Error("Lote não encontrado.");
    loteStatusParaTargetLote = lote.status;
    missingHeadsParaTargetLote = lote.missingHeads;
  }

  consumirMedicamento({ orgId: data.orgId, targetType: data.targetType, targetId: data.targetId, loteStatusParaTargetLote, missingHeadsParaTargetLote, warehouseId: data.warehouseId, skuId: data.skuId, quantidade: data.quantidade, unidade: data.unidade, actorUserId: data.actorUserId, lastroFiscalTemNotaFiscalFechadaSuficiente: data.lastroFiscalTemNotaFiscalFechadaSuficiente });
  res.json({ ok: true });
});

app.use((err: any, _req: any, res: any, _next: any) => res.status(400).json({ ok: false, error: err?.message ?? String(err) }));

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
app.listen(port, () => console.log(`Agro module server listening on :${port}`));
