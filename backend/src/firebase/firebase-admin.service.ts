import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAdminService {
  private readonly app: admin.app.App;

  constructor(private readonly configService: ConfigService) {
    this.app = this.initialize();
  }

  private initialize(): admin.app.App {
    if (admin.apps.length) {
      return admin.app();
    }

    const projectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
    const clientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');
    const privateKey = this.configService
      .get<string>('FIREBASE_PRIVATE_KEY')
      ?.replace(/\\n/g, '\n');

    const credential =
      projectId && clientEmail && privateKey
        ? admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
          })
        : admin.credential.applicationDefault();

    const app = admin.initializeApp({
      credential,
      projectId: projectId || undefined,
    });

    if (process.env.FIREBASE_AUTH_EMULATOR_HOST) {
      Logger.warn(
        `Using Firebase Auth emulator at ${process.env.FIREBASE_AUTH_EMULATOR_HOST}`,
      );
    }

    return app;
  }

  async verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken> {
    return this.app.auth().verifyIdToken(token, true);
  }
}
