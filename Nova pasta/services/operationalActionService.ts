import {
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { OperationalActionType } from '../types';

export interface OperationalActionPayload {
  projectId: string;
  actionType: OperationalActionType;
  formData: Record<string, string>;
  createdBy?: string;
}

const actionsCollection = collection(db, 'operationalActions');

export const operationalActionService = {
  async createAction(payload: OperationalActionPayload): Promise<void> {
    await addDoc(actionsCollection, {
      ...payload,
      createdAt: serverTimestamp(),
    });
  },
};
