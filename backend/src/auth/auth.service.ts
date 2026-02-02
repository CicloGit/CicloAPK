import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../common/interfaces/auth-user.interface';

@Injectable()
export class AuthService {
  me(user: AuthenticatedUser) {
    return {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName,
      role: user.role,
      tenantId: user.tenantId,
      permissions: user.permissions ?? [],
      metadata: user.metadata ?? {},
    };
  }
}
