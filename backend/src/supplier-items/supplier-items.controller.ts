import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { SupplierItemsService } from './supplier-items.service';
import { CreateSupplierItemDto } from './dto/create-supplier-item.dto';
import { UpdateSupplierItemDto } from './dto/update-supplier-item.dto';
import { SupplierScopeGuard } from '../common/guards/supplier-scope.guard';

@Controller('supplier-items')
@UseGuards(FirebaseAuthGuard, RolesGuard, TenantGuard, SupplierScopeGuard)
export class SupplierItemsController {
  constructor(private readonly service: SupplierItemsService) {}

  @Get()
  @Roles('owner', 'admin', 'supplier')
  list(@CurrentUser() user: AuthenticatedUser, @Query('supplierId') supplierId?: string) {
    const sup = user.role === 'supplier' ? user.uid : supplierId;
    return this.service.list(user.tenantId, sup);
  }

  @Post()
  @Roles('owner', 'admin', 'supplier')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSupplierItemDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  @Roles('owner', 'admin', 'supplier')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateSupplierItemDto) {
    return this.service.update(user, id, dto);
  }
}
