import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { OperatorRequest, OperatorTask } from '../types';
import { hasTenantAccess, resolveTenantContext, withTenantFields } from './tenantContext';

const requestsCollection = collection(db, 'operatorRequests');
const tasksCollection = collection(db, 'operatorTasks');

interface OperatorScope {
  userId: string;
  role: string;
  tenantId: string;
  linkedPropertyId?: string;
  linkedPropertyName?: string;
  linkedProducerId?: string;
  linkedProducerName?: string;
}

const normalizeText = (value: unknown): string => (typeof value === 'string' ? value.trim() : '');

const toOperatorRequest = (id: string, raw: Record<string, unknown>): OperatorRequest => ({
  id,
  tenantId: raw.tenantId ? String(raw.tenantId) : undefined,
  propertyId: raw.propertyId ? String(raw.propertyId) : undefined,
  propertyName: raw.propertyName ? String(raw.propertyName) : undefined,
  producerId: raw.producerId ? String(raw.producerId) : undefined,
  producerName: raw.producerName ? String(raw.producerName) : undefined,
  requesterUserId: raw.requesterUserId ? String(raw.requesterUserId) : undefined,
  type: (raw.type as OperatorRequest['type']) ?? 'PURCHASE',
  item: String(raw.item ?? ''),
  quantity: raw.quantity ? String(raw.quantity) : undefined,
  priority: (raw.priority as OperatorRequest['priority']) ?? 'MEDIUM',
  requester: String(raw.requester ?? ''),
  date: String(raw.date ?? ''),
  status: (raw.status as OperatorRequest['status']) ?? 'PENDING',
});

const toOperatorTask = (id: string, raw: Record<string, unknown>): OperatorTask => ({
  id,
  tenantId: raw.tenantId ? String(raw.tenantId) : undefined,
  propertyId: raw.propertyId ? String(raw.propertyId) : undefined,
  propertyName: raw.propertyName ? String(raw.propertyName) : undefined,
  producerId: raw.producerId ? String(raw.producerId) : undefined,
  producerName: raw.producerName ? String(raw.producerName) : undefined,
  assignedOperatorUserId: raw.assignedOperatorUserId ? String(raw.assignedOperatorUserId) : undefined,
  title: String(raw.title ?? ''),
  executor: String(raw.executor ?? ''),
  timestamp: String(raw.timestamp ?? ''),
  status: (raw.status as OperatorTask['status']) ?? 'PENDING_REVIEW',
  proofType: (raw.proofType as OperatorTask['proofType']) ?? 'PHOTO',
  details: String(raw.details ?? ''),
  geolocation: String(raw.geolocation ?? ''),
  proofUrl: raw.proofUrl ? String(raw.proofUrl) : undefined,
  proofMimeType: raw.proofMimeType ? String(raw.proofMimeType) : undefined,
});

const resolveOperatorScope = async (): Promise<OperatorScope> => {
  const context = await resolveTenantContext();
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) {
    throw new Error('Usuario nao autenticado.');
  }

  const userSnapshot = await getDoc(doc(db, 'users', firebaseUser.uid));
  const raw = userSnapshot.exists() ? (userSnapshot.data() as Record<string, unknown>) : {};

  return {
    userId: context.userId,
    role: normalizeText(raw.role) || 'Operador',
    tenantId: context.tenantId,
    linkedPropertyId: normalizeText(raw.linkedPropertyId) || undefined,
    linkedPropertyName: normalizeText(raw.linkedPropertyName) || undefined,
    linkedProducerId: normalizeText(raw.linkedProducerId) || undefined,
    linkedProducerName: normalizeText(raw.linkedProducerName) || undefined,
  };
};

const isOperatorRole = (role: string): boolean => role === 'Operador';

export const operatorService = {
  async listTasks(): Promise<OperatorTask[]> {
    const scope = await resolveOperatorScope();
    const snapshot = await getDocs(query(tasksCollection, where('tenantId', '==', scope.tenantId)));
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, task: toOperatorTask(docSnapshot.id, raw) };
      })
      .filter((entry: { raw: Record<string, unknown> }) => hasTenantAccess(entry.raw, scope))
      .map((entry: { task: OperatorTask }) => entry.task)
      .filter((task: OperatorTask) => {
        if (!isOperatorRole(scope.role)) {
          return true;
        }
        return (
          task.assignedOperatorUserId === scope.userId ||
          (Boolean(scope.linkedPropertyId) && task.propertyId === scope.linkedPropertyId)
        );
      });
  },

  async listRequests(): Promise<OperatorRequest[]> {
    const scope = await resolveOperatorScope();
    const snapshot = await getDocs(query(requestsCollection, where('tenantId', '==', scope.tenantId)));
    return snapshot.docs
      .map((docSnapshot: any) => {
        const raw = docSnapshot.data() as Record<string, unknown>;
        return { raw, request: toOperatorRequest(docSnapshot.id, raw) };
      })
      .filter((entry: { raw: Record<string, unknown> }) => hasTenantAccess(entry.raw, scope))
      .map((entry: { request: OperatorRequest }) => entry.request)
      .filter((request: OperatorRequest) => {
        if (!isOperatorRole(scope.role)) {
          return true;
        }
        return request.requesterUserId === scope.userId;
      });
  },

  async createRequest(
    data: Pick<OperatorRequest, 'type' | 'item' | 'quantity' | 'priority' | 'requester'>
  ): Promise<OperatorRequest> {
    const scope = await resolveOperatorScope();
    if (!data.item.trim()) {
      throw new Error('Informe o item da solicitacao.');
    }
    if (isOperatorRole(scope.role) && (!scope.linkedPropertyId || !scope.linkedProducerId)) {
      throw new Error(
        'Operador sem vinculo de fazenda/produtor. Solicite ao produtor responsavel o cadastro correto do acesso.'
      );
    }

    const newRequest: OperatorRequest = {
      id: `REQ-${Date.now()}`,
      tenantId: scope.tenantId,
      propertyId: scope.linkedPropertyId,
      propertyName: scope.linkedPropertyName,
      producerId: scope.linkedProducerId,
      producerName: scope.linkedProducerName,
      requesterUserId: scope.userId,
      type: data.type,
      item: data.item.trim(),
      quantity: data.quantity?.trim() || undefined,
      priority: data.priority,
      requester: data.requester.trim(),
      date: new Date().toLocaleString('pt-BR'),
      status: 'PENDING',
    };

    await setDoc(
      doc(db, 'operatorRequests', newRequest.id),
      withTenantFields(
        {
          ...newRequest,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        scope
      ),
      { merge: true }
    );

    return newRequest;
  },

  async updateTaskStatus(taskId: string, status: OperatorTask['status']): Promise<void> {
    const scope = await resolveOperatorScope();
    const taskRef = doc(db, 'operatorTasks', taskId);
    const snapshot = await getDoc(taskRef);
    if (!snapshot.exists()) {
      throw new Error('Tarefa nao encontrada.');
    }

    const raw = snapshot.data() as Record<string, unknown>;
    if (!hasTenantAccess(raw, scope)) {
      throw new Error('Sem permissao para alterar tarefa de outro tenant.');
    }
    const assignedOperatorUserId = normalizeText(raw.assignedOperatorUserId);
    const propertyId = normalizeText(raw.propertyId);
    if (
      isOperatorRole(scope.role) &&
      assignedOperatorUserId !== scope.userId &&
      (!scope.linkedPropertyId || propertyId !== scope.linkedPropertyId)
    ) {
      throw new Error('Esta tarefa nao pertence ao operador atual.');
    }

    await updateDoc(taskRef, {
      status,
      updatedByUserId: scope.userId,
      updatedAt: serverTimestamp(),
    });
  },

  async updateRequestStatus(requestId: string, status: OperatorRequest['status']): Promise<void> {
    const scope = await resolveOperatorScope();
    if (isOperatorRole(scope.role)) {
      throw new Error('Operador nao pode aprovar ou rejeitar solicitacoes.');
    }

    const requestRef = doc(db, 'operatorRequests', requestId);
    const snapshot = await getDoc(requestRef);
    if (!snapshot.exists()) {
      throw new Error('Solicitacao nao encontrada.');
    }
    if (!hasTenantAccess(snapshot.data() as Record<string, unknown>, scope)) {
      throw new Error('Sem permissao para alterar solicitacao de outro tenant.');
    }

    await updateDoc(requestRef, {
      status,
      decidedByUserId: scope.userId,
      updatedAt: serverTimestamp(),
    });
  },
};
