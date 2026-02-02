import { Controller, Get, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import type { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { AuthService } from './auth.service';

@Controller('auth')
@UseGuards(FirebaseAuthGuard, RolesGuard, TenantGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @Roles('owner', 'admin', 'technician', 'client_user', 'supplier')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.me(user);
  }
}
