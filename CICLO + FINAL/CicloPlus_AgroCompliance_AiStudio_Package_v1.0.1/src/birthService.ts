import { makeMotherCode, makeCalfCode, newId } from "./id.js";
import { db, Mother, Animal } from "./store.js";
import { calcEvidenceScore, Evidence } from "./evidence.js";

/**
 * Cria uma matriz (mãe) com identificação curta.
 * O sequencial global por organização deve ser controlado em banco (transação).
 * Aqui usamos um contador simples em memória.
 */
const motherSeqByOrg = new Map<string, number>();

export function createMother(orgId: string, orgCode: string): Mother {
  const current = motherSeqByOrg.get(orgId) ?? 0;
  const next = current + 1;
  motherSeqByOrg.set(orgId, next);

  const motherId = newId();
  const motherCode = makeMotherCode(orgCode, next);

  const mother: Mother = { orgId, motherId, motherCode, seq: next, childSeqCounter: 0, status: "ATIVA" };
  db.mothers.set(`${orgId}::${motherId}`, mother);

  // Também cria registro de animal (tipo MAE) para unificar consulta
  const animal: Animal = {
    orgId,
    animalId: newId(),
    animalCode: motherCode,
    type: "MAE",
    stage: "RECRIA",
    status: "ATIVO"
  };
  db.animals.set(`${orgId}::${animal.animalId}`, animal);

  return mother;
}

export interface RegisterBirthRequest {
  orgId: string;
  motherId: string;
  pastoId: string;
  birthDate: string; // date
  qtdFilhotes: number;
  evidences: Evidence[];
}

export function registerBirth(req: RegisterBirthRequest): { eventStatus: "APROVADO" | "PENDENTE"; calfIds: string[]; calfCodes: string[]; evidenceScore: number } {
  const mother = db.mothers.get(`${req.orgId}::${req.motherId}`);
  if (!mother) throw new Error("Mãe não encontrada.");
  if (mother.status === "BAIXADA") throw new Error("Mãe baixada não pode registrar nascimento.");

  if (req.qtdFilhotes < 1) throw new Error("Quantidade de filhotes deve ser pelo menos 1.");
  if (mother.childSeqCounter + req.qtdFilhotes > 99) throw new Error("Extensão do filho excede o limite de 99.");

  const ev = calcEvidenceScore(req.evidences);
  const eventStatus = ev.classification === "TIPO_A" ? "APROVADO" : "PENDENTE";

  const start = mother.childSeqCounter + 1;
  const end = mother.childSeqCounter + req.qtdFilhotes;

  // Em banco real, isto deve ser transação atômica.
  mother.childSeqCounter = end;
  db.mothers.set(`${req.orgId}::${mother.motherId}`, mother);

  const calfIds: string[] = [];
  const calfCodes: string[] = [];

  for (let seq = start; seq <= end; seq++) {
    const animalId = newId();
    const calfCode = makeCalfCode(mother.motherCode, seq);

    const calf: Animal = {
      orgId: req.orgId,
      animalId,
      animalCode: calfCode,
      type: "BEZERRO",
      motherId: mother.motherId,
      motherCode: mother.motherCode,
      childSeq: seq,
      stage: "NASCIMENTO",
      status: "ATIVO",
      pastoId: req.pastoId
    };

    db.animals.set(`${req.orgId}::${animalId}`, calf);
    calfIds.push(animalId);
    calfCodes.push(calfCode);
  }

  return { eventStatus, calfIds, calfCodes, evidenceScore: ev.score };
}
