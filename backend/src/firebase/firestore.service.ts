import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FirebaseAdminService } from './firebase-admin.service';

@Injectable()
export class FirestoreService {
  private readonly db;

  constructor(
    firebaseAdmin: FirebaseAdminService,
    private readonly config: ConfigService,
  ) {
    this.db = firebaseAdmin['app'].firestore();
    const emulator = process.env.FIRESTORE_EMULATOR_HOST;
    if (emulator) {
      Logger.warn(`Using Firestore emulator at ${emulator}`);
    }
  }

  collection(name: string) {
    return this.db.collection(name);
  }

  withTenant(collection: string, tenantId: string) {
    return this.collection(collection).where('tenantId', '==', tenantId);
  }

  async runTransaction<T>(fn: Parameters<typeof this.db.runTransaction>[0]) {
    return this.db.runTransaction(fn);
  }

  doc(collection: string, id: string) {
    return this.collection(collection).doc(id);
  }
}
