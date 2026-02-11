import { AnimalStage, LoteStatus, CycleStatus, ConferenceStatus, Operation } from "./enums.js";

export interface Mother {
  orgId: string;
  motherId: string;
  motherCode: string;
  seq: number;
  childSeqCounter: number;
  status: "ATIVA" | "BAIXADA";
}

export interface Animal {
  orgId: string;
  animalId: string;
  animalCode: string;
  type: "MAE" | "BEZERRO";
  motherId?: string;
  motherCode?: string;
  childSeq?: number;
  stage: AnimalStage;
  status: "ATIVO" | "EM_TRANSITO" | "DESCONHECIDO" | "BAIXADO";
  loteId?: string;
  pastoId?: string;
  rfidTag?: string;
}

export interface Lote {
  orgId: string;
  loteId: string;
  status: LoteStatus;
  expectedCount: number;
  currentCount: number;
  missingHeads: number;
  pastoId?: string;
}

export interface Cycle {
  orgId: string;
  cycleId: string;
  status: CycleStatus;
  periodStart: string;
  periodEnd: string;
  inventory: { completed: boolean };
  conference: { conferenceId?: string; status: ConferenceStatus; result?: "OK" | "INCONSISTENT" | "MISSING_DATA" };
  launches: { feedCount: number; medCount: number; weightCount: number };
}

export interface Insumo {
  orgId: string;
  skuId: string;
  nome: string;
  categoria: "ALIMENTACAO" | "MEDICAMENTO" | "OUTROS";
  unidade: "KG" | "L" | "DOSE" | "UN";
  controlePorLoteFornecedor: boolean;
  exigirNotaFiscalParaConsumo: boolean;
  ativo: boolean;
}

export interface Warehouse {
  orgId: string;
  warehouseId: string;
  nome: string;
  ativo: boolean;
  localizacao?: { lat: number; lng: number };
}

export interface StockBalance {
  orgId: string;
  warehouseId: string;
  skuId: string;
  qtyOnHand: number;
}

export interface StockMove {
  orgId: string;
  stockMoveId: string;
  type: "NF_ENTRADA_PRODUTOS" | "CONSUMO_ALIMENTACAO" | "CONSUMO_MEDICAMENTO" | "AJUSTE_ESTOQUE" | "TRANSFERENCIA_INTERNA";
  warehouseId: string;
  skuId: string;
  quantidade: number;
  unidade: "KG" | "L" | "DOSE" | "UN";
  refType: "NF_ENTRADA" | "LANCAMENTO" | "AJUSTE";
  refId: string;
  timestamp: string;
  actorUserId: string;
}

export interface NfEntradaProdutos {
  orgId: string;
  nfEntradaId: string;
  chaveAcesso: string;
  fornecedor: { cnpj: string; nome: string };
  dataEmissao: string;
  status: "EM_LANCAMENTO" | "CONFERIDA" | "FECHADA" | "REJEITADA";
  itens: Array<{ skuId: string; descricao?: string; quantidade: number; unidade: "KG" | "L" | "DOSE" | "UN"; warehouseId: string; loteFornecedor?: string }>;
  evidencias: any[];
}

export interface NfEntradaAnimais {
  orgId: string;
  nfEntradaId: string;
  chaveAcesso: string;
  fornecedor: { cnpj: string; nome: string };
  dataEmissao: string;
  status: "EM_LANCAMENTO" | "CONFERIDA" | "FECHADA" | "REJEITADA";
  destinoLoteId: string;
  destinoPastoId: string;
  quantidadeAnimaisNota: number;
  quantidadeAnimaisConferida: number;
  evidencias: any[];
  animais: Array<{ animalId?: string; rfidTag?: string; pesoKg?: number }>;
}

export interface Lock {
  orgId: string;
  resource: Operation;
  targetType: "LOTE" | "ANIMAL" | "ORG";
  targetId: string;
  locked: boolean;
  reason: string;
  message?: string;
}

export const db = {
  mothers: new Map<string, Mother>(),
  animals: new Map<string, Animal>(),
  lotes: new Map<string, Lote>(),
  cycles: new Map<string, Cycle>(),
  locks: new Map<string, Lock>(),
  insumos: new Map<string, Insumo>(),
  warehouses: new Map<string, Warehouse>(),
  stockBalances: new Map<string, StockBalance>(),
  stockMoves: new Map<string, StockMove>(),
  nfEntradaProdutos: new Map<string, NfEntradaProdutos>(),
  nfEntradaAnimais: new Map<string, NfEntradaAnimais>()
};

export function lockKey(orgId: string, resource: Operation, targetType: Lock["targetType"], targetId: string): string {
  return `${orgId}::${resource}::${targetType}::${targetId}`;
}
