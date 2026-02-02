import { CanActivate, ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
export declare class FirebaseAuthGuard implements CanActivate {
    private readonly firebaseAdmin;
    private readonly configService;
    constructor(firebaseAdmin: FirebaseAdminService, configService: ConfigService);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private extractBearerToken;
}
