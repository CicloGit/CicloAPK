import { db, NfEntradaProdutos } from "./store.js";
import { applyStockMove } from "./stockService.js";

export function createNfEntradaProdutos(nf: NfEntradaProdutos): NfEntradaProdutos {
  nf.status = nf.status ?? "EM_LANCAMENTO";
  nf.evidencias = nf.evidencias ?? [];
  db.nfEntradaProdutos.set(`${nf.orgId}::${nf.nfEntradaId}`, nf);
  return nf;
}

export function conferirNfEntradaProdutos(orgId: string, nfEntradaId: string, evidencias: any[]): NfEntradaProdutos {
  const k = `${orgId}::${nfEntradaId}`;
  const nf = db.nfEntradaProdutos.get(k);
  if (!nf) throw new Error("Nota Fiscal de entrada de produtos não encontrada.");
  if (nf.status !== "EM_LANCAMENTO") throw new Error("Nota Fiscal não está em lançamento.");
  nf.status = "CONFERIDA";
  nf.evidencias = [...(nf.evidencias ?? []), ...(evidencias ?? [])];
  db.nfEntradaProdutos.set(k, nf);
  return nf;
}

export function fecharNfEntradaProdutos(orgId: string, nfEntradaId: string, actorUserId: string): NfEntradaProdutos {
  const k = `${orgId}::${nfEntradaId}`;
  const nf = db.nfEntradaProdutos.get(k);
  if (!nf) throw new Error("Nota Fiscal de entrada de produtos não encontrada.");
  if (nf.status !== "CONFERIDA") throw new Error("Nota Fiscal precisa estar conferida para fechar.");

  for (const item of nf.itens) {
    applyStockMove({
      orgId,
      type: "NF_ENTRADA_PRODUTOS",
      warehouseId: item.warehouseId,
      skuId: item.skuId,
      quantidade: item.quantidade,
      unidade: item.unidade,
      refType: "NF_ENTRADA",
      refId: nfEntradaId,
      actorUserId
    });
  }

  nf.status = "FECHADA";
  db.nfEntradaProdutos.set(k, nf);
  return nf;
}
