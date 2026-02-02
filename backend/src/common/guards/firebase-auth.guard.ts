import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { FirebaseAdminService } from '../../firebase/firebase-admin.service';
import { Role } from '../constants/roles';
import { AuthenticatedUser } from '../interfaces/auth-user.interface';

@Injectable()
export class FirebaseAuthGuard implements CanActivate {
  constructor(
    private readonly firebaseAdmin: FirebaseAdminService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractBearerToken(request);

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    try {
      const decoded = await this.firebaseAdmin.verifyIdToken(token);
      const role = (decoded.role as Role) ?? 'client_user';
      const tenantId =
        (decoded.tenantId as string) ??
        this.configService.get<string>('DEFAULT_TENANT_ID');

      if (!tenantId) {
        throw new UnauthorizedException('Tenant not resolved for user');
      }

      const user: AuthenticatedUser = {
        uid: decoded.uid,
        email: decoded.email,
        displayName: decoded.name,
        role,
        tenantId,
        permissions: (decoded.permissions as string[]) || [],
        metadata: {
          signInProvider: decoded.firebase?.sign_in_provider,
        },
      };

      (request as any).user = user;
      return true;
    } catch (error) {
      throw new UnauthorizedException(error?.message ?? 'Invalid token');
    }
  }

  private extractBearerToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header) return null;
    const [type, token] = header.split(' ');
    return type?.toLowerCase() === 'bearer' ? token : null;
  }
}
