import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthenticatedUser } from '../interfaces/auth-user.interface';

@Injectable()
export class TenantGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;
    const headerTenant =
      (request.headers['x-tenant-id'] as string) ||
      (request.headers['tenant-id'] as string) ||
      undefined;

    if (!user?.tenantId) {
      throw new UnauthorizedException('Tenant not resolved');
    }

    const matches = !headerTenant || headerTenant === user.tenantId;

    if (!matches) {
      throw new ForbiddenException('Tenant mismatch');
    }

    return true;
  }
}
