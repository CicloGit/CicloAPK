export type LocalType = 'LOTE' | 'PASTO';

export type AnimalStage =
  | 'CRIA'
  | 'RECRIA'
  | 'ENGORDA'
  | 'TERMINACAO'
  | 'CONFINAMENTO'
  | 'REPRODUCAO'
  | 'DESCARTE'
  | 'VENDIDO'
  | 'MORTO';

export interface EvidenceReference {
  evidenceId: string;
  evidenceKind: string;
}

export interface Animal {
  id: string;
  tag: string;
  farmId: string;
  motherTag?: string;
  shortIdentification: string;
  stage: AnimalStage;
  status: 'ATIVO' | 'VENDIDO' | 'MORTO';
  currentLocalId: string;
  cycle: string;
  birthDate?: string;
  purchaseDate?: string;
  weightKg?: number;
}
