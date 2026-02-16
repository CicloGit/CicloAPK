export type EvidenceKind = 'RFID' | 'GPS' | 'BALANCA' | 'CAMERA' | 'FOTO';

export interface EventEvidencePolicy {
  eventType: string;
  requiredAnyOf: EvidenceKind[][];
}

export const eventEvidencePolicies: EventEvidencePolicy[] = [
  { eventType: 'TRANSFERENCIA_LOCAL', requiredAnyOf: [['RFID'], ['FOTO', 'GPS']] },
  { eventType: 'ALIMENTACAO_LANCADA', requiredAnyOf: [['FOTO'], ['RFID']] },
  { eventType: 'MEDICACAO_LANCADA', requiredAnyOf: [['RFID'], ['FOTO', 'GPS']] },
  { eventType: 'PESAGEM_REGISTRADA', requiredAnyOf: [['BALANCA']] },
  { eventType: 'CONFERENCIA_ABERTA', requiredAnyOf: [['GPS']] },
  { eventType: 'VENDA_REALIZADA', requiredAnyOf: [['RFID'], ['FOTO', 'GPS']] },
  { eventType: 'ANIMAL_NASCIDO', requiredAnyOf: [['FOTO']] },
  { eventType: 'ANIMAL_COMPRADO', requiredAnyOf: [['FOTO', 'GPS']] },
];
