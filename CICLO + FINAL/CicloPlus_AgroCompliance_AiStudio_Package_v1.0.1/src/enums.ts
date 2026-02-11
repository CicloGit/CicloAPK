export type AnimalStage =
  | "NASCIMENTO"
  | "BEZERRO"
  | "DESMAMA"
  | "RECRIA"
  | "ENGORDA"
  | "PRONTO_VENDA"
  | "VENDIDO"
  | "BAIXADO";

export type LoteStatus = "CONFORME" | "DIVERGENTE" | "BLOQUEADO";

export type AnimalStatus = "ATIVO" | "EM_TRANSITO" | "DESCONHECIDO" | "BAIXADO";

export type CycleStatus = "OPEN" | "PENDING_CONFERENCE" | "CLOSED";

export type ConferenceStatus = "PENDING" | "APPROVED" | "REJECTED";

export type EvidenceType = "RFID" | "GPS" | "BALANCA" | "CAMERA" | "DOCUMENTO";

export type Operation =
  | "ALIMENTACAO"
  | "MEDICAMENTO"
  | "TRANSFERENCIA"
  | "NF_VENDA"
  | "STAGE_CHANGE"
  | "CYCLE_OPEN"
  | "CYCLE_CLOSE"
  | "CONFERENCE_REVIEW"
  | "CONFERENCE_APPROVE"
  | "NF_ENTRADA_PRODUTOS_CREATE"
  | "NF_ENTRADA_PRODUTOS_CONFERIR"
  | "NF_ENTRADA_PRODUTOS_FECHAR"
  | "NF_ENTRADA_ANIMAIS_CREATE"
  | "NF_ENTRADA_ANIMAIS_CONFERIR"
  | "NF_ENTRADA_ANIMAIS_FECHAR"
  | "CONSUMO_ALIMENTACAO"
  | "CONSUMO_MEDICAMENTO"
  | "AJUSTE_ESTOQUE"
  | "INSUMO_CREATE_OR_UPDATE"
  | "WAREHOUSE_CREATE_OR_UPDATE"
  | "ESTOQUE_GET";

export type RuleAction =
  | { action: "allow"; resource: Operation }
  | { action: "block"; resource: Operation; reason: string; message?: string }
  | { action: "lock"; resource: Operation; reason: string; message?: string }
  | { action: "unlock"; resource: Operation; reason: string; message?: string }
  | { action: "set"; path: string; value: unknown }
  | { action: "audit"; event: string; level: "LOW" | "MEDIUM" | "HIGH" };

export type RuleCondition =
  | { op: "eq"; path: string; value: unknown }
  | { op: "gte"; path: string; value: number }
  | { op: "lte"; path: string; value: number }
  | { op: "contains"; path: string; value: unknown }
  | { op: "all"; conditions: RuleCondition[] }
  | { op: "any"; conditions: RuleCondition[] };

export interface Rule {
  ruleId: string;
  appliesTo?: Operation;
  scope?: { fromStage?: AnimalStage; toStage?: AnimalStage };
  when: RuleCondition;
  then: RuleAction[];
  else?: RuleAction[];
}
