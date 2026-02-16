import { FieldValue } from 'firebase-admin/firestore';
import { firestoreDatabase } from './firebaseAdmin';
import { SystemRole } from './auth/types';

export type EventType =
  | 'ANIMAL_NASCIDO'
  | 'ANIMAL_COMPRADO'
  | 'TRANSFERENCIA_LOCAL'
  | 'PESAGEM_REGISTRADA'
  | 'ALIMENTACAO_LANCADA'
  | 'MEDICACAO_LANCADA'
  | 'CONFERENCIA_ABERTA'
  | 'CONFERENCIA_APROVADA'
  | 'TRAVA_APLICADA'
  | 'TRAVA_REMOVIDA'
  | 'VENDA_REALIZADA';

interface EmitEventPayload {
  farmId: string;
  eventType: EventType;
  actorId: string;
  actorRole: SystemRole;
  data: Record<string, unknown>;
}

export async function emitEvent(payload: EmitEventPayload): Promise<void> {
  const eventReference = firestoreDatabase.collection(`farms/${payload.farmId}/events`).doc();
  await eventReference.set({
    id: eventReference.id,
    eventType: payload.eventType,
    actorId: payload.actorId,
    actorRole: payload.actorRole,
    data: payload.data,
    createdAt: FieldValue.serverTimestamp(),
  });
}
