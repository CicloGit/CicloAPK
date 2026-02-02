import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';
export declare class FirebaseAdminService {
    private readonly configService;
    private readonly app;
    constructor(configService: ConfigService);
    private initialize;
    verifyIdToken(token: string): Promise<admin.auth.DecodedIdToken>;
}
