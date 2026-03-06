import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';
import { resolveTenantContext } from './tenantContext';

export type SystemConfigKey = 'events' | 'stateMachines' | 'permissions' | 'firestore' | 'openapi' | 'enums';

export interface SystemConfigEntry {
  id: SystemConfigKey;
  content: object | string;
}

const configCollection = collection(db, 'systemConfigs');
export const systemConfigService = {
  async listConfigs(): Promise<SystemConfigEntry[]> {
    const context = await resolveTenantContext();
    const snapshot = await getDocs(query(configCollection, where('tenantId', '==', context.tenantId)));
    return snapshot.docs.map((docSnapshot: any) => {
      const rawContent = (docSnapshot.data() as Record<string, unknown>).content;
      const content: SystemConfigEntry['content'] =
        typeof rawContent === 'string' || (typeof rawContent === 'object' && rawContent !== null)
          ? rawContent
          : {};

      return {
        id: docSnapshot.id as SystemConfigKey,
        content,
      };
    });
  },
};
