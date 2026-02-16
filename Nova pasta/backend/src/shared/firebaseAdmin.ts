import fs from 'node:fs';
import path from 'node:path';
import { App, cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

function initializeFirebaseApplication(): App {
  if (getApps().length > 0) {
    return getApps()[0]!;
  }

  const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (credentialsPath) {
    const resolvedPath = path.resolve(credentialsPath);
    if (fs.existsSync(resolvedPath)) {
      const credentialsJson = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
      return initializeApp({
        credential: cert(credentialsJson),
        storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
      });
    }
  }

  return initializeApp({
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

export const firebaseApplication = initializeFirebaseApplication();
export const firestoreDatabase = getFirestore(firebaseApplication);
export const firebaseStorage = getStorage(firebaseApplication);
