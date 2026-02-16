import {
  collection,
  doc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import {
  eventTypesConfig,
  stateMachinesConfig,
  permissionsConfig,
  firestoreRulesConfig,
  openapiConfig,
  enumsConfig,
} from '../constants';
import { db } from '../config/firebase';

export type SystemConfigKey = 'events' | 'stateMachines' | 'permissions' | 'firestore' | 'openapi' | 'enums';

export interface SystemConfigEntry {
  id: SystemConfigKey;
  content: object | string;
}

const configCollection = collection(db, 'systemConfigs');

const seedConfigs: SystemConfigEntry[] = [
  { id: 'events', content: eventTypesConfig },
  { id: 'stateMachines', content: stateMachinesConfig },
  { id: 'permissions', content: permissionsConfig },
  { id: 'firestore', content: firestoreRulesConfig },
  { id: 'openapi', content: openapiConfig },
  { id: 'enums', content: enumsConfig },
];

let seeded = false;


export const systemConfigService = {
  async listConfigs(): Promise<SystemConfigEntry[]> {
    const snapshot = await getDocs(configCollection);
    return snapshot.docs.map((docSnapshot: any) => ({
      id: docSnapshot.id as SystemConfigKey,
      content: (docSnapshot.data() as Record<string, unknown>).content ?? {},
    }));
  },
};
