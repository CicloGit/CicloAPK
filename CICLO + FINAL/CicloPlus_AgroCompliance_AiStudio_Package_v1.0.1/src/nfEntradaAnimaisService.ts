import { db } from "./store.js";

export function createNfEntradaAnimais(nf: any): any {
  nf.status = nf.status ?? "EM_LANCAMENTO";
  nf.evidencias = nf.evidencias ?? [];
  nf.animais = nf.animais ?? [];
  nf.quantidadeAnimaisConferida = nf.quantidadeAnimaisConferida ?? 0;
  db.nfEntradaAnimais.set(`${nf.orgId}::${nf.nfEntradaId}`, nf);
  return nf;
}

export function conferirNfEntradaAnimais(orgId: string, nfEntradaId: string, quantidadeConferida: number, animais: any[], evidencias: any[]): any {
  const k = `${orgId}::${nfEntradaId}`;
  const nf = db.nfEntradaAnimais.get(k);
  if (!nf) throw new Error("Nota Fiscal de entrada de animais não encontrada.");
  if (nf.status !== "EM_LANCAMENTO") throw new Error("Nota Fiscal não está em lançamento.");
  nf.quantidadeAnimaisConferida = quantidadeConferida;
  nf.animais = animais ?? [];
  nf.evidencias = [...(nf.evidencias ?? []), ...(evidencias ?? [])];
  nf.status = "CONFERIDA";
  db.nfEntradaAnimais.set(k, nf);
  return nf;
}

export function fecharNfEntradaAnimais(params: { orgId: string; nfEntradaId: string; override: boolean; approvalsCount: number }): any {
  const k = `${params.orgId}::${params.nfEntradaId}`;
  const nf = db.nfEntradaAnimais.get(k);
  if (!nf) throw new Error("Nota Fiscal de entrada de animais não encontrada.");
  if (nf.status !== "CONFERIDA") throw new Error("Nota Fiscal precisa estar conferida para fechar.");

  const igual = nf.quantidadeAnimaisConferida === nf.quantidadeAnimaisNota;
  if (!igual && !(params.override && params.approvalsCount >= 2)) {
    throw new Error("Fechamento bloqueado: quantidade conferida difere da Nota Fiscal e não há exceção quatro-olhos.");
  }

  const lote = db.lotes.get(`${params.orgId}::${nf.destinoLoteId}`);
  if (!lote) throw new Error("Lote de destino não encontrado.");
  lote.expectedCount = (lote.expectedCount ?? 0) + (nf.quantidadeAnimaisConferida ?? 0);
  db.lotes.set(`${params.orgId}::${nf.destinoLoteId}`, lote);

  nf.status = "FECHADA";
  db.nfEntradaAnimais.set(k, nf);
  return { nf, deltaExpectedCount: nf.quantidadeAnimaisConferida };
}
