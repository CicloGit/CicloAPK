import {
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { OperationalActionType } from '../types';
import { resolveTenantContext, withTenantFields } from './tenantContext';

export interface OperationalActionPayload {
  projectId: string;
  actionType: OperationalActionType;
  formData: Record<string, string>;
  createdBy?: string;
}

const actionsCollection = collection(db, 'operationalActions');

export const operationalActionService = {
  async createAction(payload: OperationalActionPayload): Promise<void> {
    const context = await resolveTenantContext();
    await addDoc(
      actionsCollection,
      withTenantFields(
        {
          ...payload,
          createdAt: serverTimestamp(),
        },
        context
      )
    );
  },
};
