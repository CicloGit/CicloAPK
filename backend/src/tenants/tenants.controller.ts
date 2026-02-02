import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import type { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { CreateTenantUserDto } from './dto/create-tenant-user.dto';
import { TenantsService } from './tenants.service';

@Controller('tenants')
@UseGuards(FirebaseAuthGuard, RolesGuard, TenantGuard)
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('current')
  @Roles('owner', 'admin', 'technician', 'client_user', 'supplier')
  currentTenant(@CurrentUser() user: AuthenticatedUser) {
    return this.tenantsService.getTenantSummary(user);
  }

  @Get('users')
  @Roles('owner')
  listUsers(@CurrentUser() user: AuthenticatedUser) {
    return this.tenantsService.listTenantUsers(user.tenantId);
  }

  @Post('users')
  @Roles('owner')
  createTenantUser(@Body() dto: CreateTenantUserDto, @CurrentUser() user: AuthenticatedUser) {
    return this.tenantsService.createTenantUser(user, dto);
  }
}
