import { initializeApp } from 'firebase/app';
import { connectAuthEmulator, getAuth } from 'firebase/auth';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectStorageEmulator, getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'local-dev-api-key',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'localhost',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'ciclo-plus-local',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'ciclo-plus-local.appspot.com',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '000000000000',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:000000000000:web:local',
};

const missingKeys = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingKeys.length > 0) {
  // Keep startup non-fatal for local development while signaling configuration issues.
  console.warn(
    `[Firebase] Variaveis ausentes: ${missingKeys.join(', ')}. Configure seu arquivo .env.local com VITE_FIREBASE_*`
  );
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

function connectEmulatorsIfConfigured() {
  const useEmulators = import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true';
  if (!import.meta.env.DEV || !useEmulators) {
    return;
  }

  const globalState = globalThis as typeof globalThis & { __firebaseEmulatorsConnected?: boolean };
  if (globalState.__firebaseEmulatorsConnected) {
    return;
  }

  const authHost = import.meta.env.VITE_AUTH_EMULATOR_HOST ?? '127.0.0.1:9099';
  const firestoreHost = import.meta.env.VITE_FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:8080';
  const storageHost = import.meta.env.VITE_STORAGE_EMULATOR_HOST ?? '127.0.0.1:9199';

  const [firestoreEmulatorHost, firestoreEmulatorPort] = firestoreHost.split(':');
  const [storageEmulatorHost, storageEmulatorPort] = storageHost.split(':');

  connectAuthEmulator(auth, `http://${authHost}`, { disableWarnings: true });
  connectFirestoreEmulator(db, firestoreEmulatorHost, Number(firestoreEmulatorPort));
  connectStorageEmulator(storage, storageEmulatorHost, Number(storageEmulatorPort));

  globalState.__firebaseEmulatorsConnected = true;
}

connectEmulatorsIfConfigured();
