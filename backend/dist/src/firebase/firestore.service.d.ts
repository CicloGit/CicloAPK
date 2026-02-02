import { ConfigService } from '@nestjs/config';
import { FirebaseAdminService } from './firebase-admin.service';
export declare class FirestoreService {
    private readonly config;
    private readonly db;
    constructor(firebaseAdmin: FirebaseAdminService, config: ConfigService);
    collection(name: string): any;
    withTenant(collection: string, tenantId: string): any;
    runTransaction<T>(fn: Parameters<typeof this.db.runTransaction>[0]): Promise<any>;
    doc(collection: string, id: string): any;
}
