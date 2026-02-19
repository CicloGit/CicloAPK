import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, runTransaction, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { OperatorRequest, OperatorTask } from '../types';

const requestsCollection = collection(db, 'operatorRequests');
const tasksCollection = collection(db, 'operatorTasks');
const toOperatorRequest = (id: string, raw: Record<string, unknown>): OperatorRequest => ({
  id,
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
  title: String(raw.title ?? ''),
  executor: String(raw.executor ?? ''),
  timestamp: String(raw.timestamp ?? ''),
  status: (raw.status as OperatorTask['status']) ?? 'PENDING_REVIEW',
  proofType: (raw.proofType as OperatorTask['proofType']) ?? 'PHOTO',
  details: String(raw.details ?? ''),
  geolocation: String(raw.geolocation ?? ''),
});
export const operatorService = {
  async listTasks(): Promise<OperatorTask[]> {
    const snapshot = await getDocs(tasksCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toOperatorTask(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async listRequests(): Promise<OperatorRequest[]> {
    const snapshot = await getDocs(requestsCollection);
    return snapshot.docs
      .map((docSnapshot: any) => toOperatorRequest(docSnapshot.id, docSnapshot.data() as Record<string, unknown>));
  },

  async createRequest(data: Pick<OperatorRequest, 'type' | 'item' | 'quantity' | 'priority' | 'requester'>): Promise<OperatorRequest> {
    const newRequest: OperatorRequest = {
      id: `REQ-${Date.now()}`,
      type: data.type,
      item: data.item,
      quantity: data.quantity,
      priority: data.priority,
      requester: data.requester,
      date: 'Agora',
      status: 'PENDING',
    };

    await setDoc(doc(db, 'operatorRequests', newRequest.id), {
      ...newRequest,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return newRequest;
  },

  async updateTaskStatus(taskId: string, status: OperatorTask['status']): Promise<void> {
    await updateDoc(doc(db, 'operatorTasks', taskId), {
      status,
      updatedAt: serverTimestamp(),
    });
  },

  async updateRequestStatus(requestId: string, status: OperatorRequest['status']): Promise<void> {
    await updateDoc(doc(db, 'operatorRequests', requestId), {
      status,
      updatedAt: serverTimestamp(),
    });
  },
};

