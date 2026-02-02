import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { ItemsService } from './items.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';

@Controller('items')
@UseGuards(FirebaseAuthGuard, RolesGuard, TenantGuard)
export class ItemsController {
  constructor(private readonly itemsService: ItemsService) {}

  @Get()
  @Roles('owner', 'admin', 'technician', 'client_user')
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.itemsService.list(user.tenantId);
  }

  @Post()
  @Roles('owner', 'admin')
  create(@Body() dto: CreateItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.itemsService.create(user, dto);
  }

  @Patch(':id')
  @Roles('owner', 'admin')
  update(@Param('id') id: string, @Body() dto: UpdateItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.itemsService.update(user, id, dto);
  }

  @Delete(':id')
  @Roles('owner', 'admin')
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.itemsService.remove(user, id);
  }
}
