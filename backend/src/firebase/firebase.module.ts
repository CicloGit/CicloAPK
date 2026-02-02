import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FirebaseAdminService } from './firebase-admin.service';
import { FirestoreService } from './firestore.service';

@Module({
  imports: [ConfigModule],
  providers: [FirebaseAdminService, FirestoreService],
  exports: [FirebaseAdminService, FirestoreService],
})
export class FirebaseModule {}
