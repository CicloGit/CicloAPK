import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { SupplierScopeGuard } from '../common/guards/supplier-scope.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { StockMovementsService } from './stock-movements.service';

@Controller('stock-movements')
@UseGuards(FirebaseAuthGuard, RolesGuard, TenantGuard, SupplierScopeGuard)
export class StockMovementsController {
  constructor(private readonly movements: StockMovementsService) {}

  @Get()
  @Roles('owner', 'admin', 'technician', 'supplier')
  list(
    @CurrentUser() user: AuthenticatedUser,
    @Query('supplierItemId') supplierItemId?: string,
    @Query('supplierId') supplierId?: string,
  ) {
    const sup = user.role === 'supplier' ? user.uid : supplierId;
    return this.movements.list(user, supplierItemId, sup);
  }
}
