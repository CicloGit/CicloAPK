import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { StockBalanceService, type BalanceInput } from './stock-balance.service';
import { SupplierScopeGuard } from '../common/guards/supplier-scope.guard';

@Controller('stock-balances')
@UseGuards(FirebaseAuthGuard, RolesGuard, TenantGuard, SupplierScopeGuard)
export class StockBalanceController {
  constructor(private readonly service: StockBalanceService) {}

  @Get()
  @Roles('owner', 'admin', 'supplier')
  list(@CurrentUser() user: AuthenticatedUser, @Query('supplierId') supplierId?: string) {
    const sup = user.role === 'supplier' ? user.uid : supplierId;
    return this.service.list(user.tenantId, sup);
  }

  @Post('move')
  @Roles('owner', 'admin', 'supplier')
  move(@CurrentUser() user: AuthenticatedUser, @Body() body: BalanceInput) {
    const sup = user.role === 'supplier' ? user.uid : body.supplierId;
    return this.service.movement(user, { ...body, supplierId: sup });
  }
}
