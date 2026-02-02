import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../common/guards/firebase-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { TenantGuard } from '../common/guards/tenant.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/interfaces/auth-user.interface';
import { RequestsService } from './requests.service';
import { CreateRequestDto } from './dto/create-request.dto';
import { UpdateRequestStatusDto } from './dto/update-request-status.dto';

@Controller('requests')
@UseGuards(FirebaseAuthGuard, RolesGuard, TenantGuard)
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Get()
  @Roles('owner', 'admin', 'technician', 'client_user')
  list(@CurrentUser() user: AuthenticatedUser, @Query('scope') scope?: string) {
    if (user.role === 'client_user' || scope === 'mine') {
      return this.requestsService.listMine(user);
    }
    return this.requestsService.list(user.tenantId);
  }

  @Post()
  @Roles('owner', 'admin', 'technician', 'client_user')
  create(@Body() dto: CreateRequestDto, @CurrentUser() user: AuthenticatedUser) {
    if (user.role === 'client_user' || user.role === 'technician') {
      dto.status = 'PENDING';
    }
    return this.requestsService.create(user, dto);
  }

  @Patch(':id/status')
  @Roles('owner', 'admin')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRequestStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.requestsService.updateStatus(user, id, dto);
  }
}
