import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { CatalogService } from './catalog.service';
import { CreateCatalogItemDto } from './dto/create-catalog-item.dto';
import { UpdateCatalogItemDto } from './dto/update-catalog-item.dto';

@Controller('catalog')
@UseGuards(FirebaseAuthGuard, RolesGuard, TenantGuard)
export class CatalogController {
  constructor(private readonly service: CatalogService) {}

  @Get()
  @Roles('owner', 'admin', 'client_user', 'technician')
  list(@CurrentUser() user: AuthenticatedUser, @Query('published') published?: string) {
    return this.service.listForTenant(user, published === 'true' || user.role === 'client_user');
  }

  @Post()
  @Roles('owner', 'admin')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCatalogItemDto) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  @Roles('owner', 'admin')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateCatalogItemDto) {
    return this.service.update(user, id, dto);
  }
}
