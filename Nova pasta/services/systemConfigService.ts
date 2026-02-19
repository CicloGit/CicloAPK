import { collection, getDocs } from 'firebase/firestore';
import { db } from '../config/firebase';

export type SystemConfigKey = 'events' | 'stateMachines' | 'permissions' | 'firestore' | 'openapi' | 'enums';

export interface SystemConfigEntry {
  id: SystemConfigKey;
  content: object | string;
}

const configCollection = collection(db, 'systemConfigs');
export const systemConfigService = {
  async listConfigs(): Promise<SystemConfigEntry[]> {
    const snapshot = await getDocs(configCollection);
    return snapshot.docs.map((docSnapshot: any) => ({
      id: docSnapshot.id as SystemConfigKey,
      content: (docSnapshot.data() as Record<string, unknown>).content ?? {},
    }));
  },
};

