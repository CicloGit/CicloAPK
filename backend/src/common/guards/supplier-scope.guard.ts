import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class SupplierScopeGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();
    const user = req.user;
    if (!user) return false;
    if (user.role !== 'supplier') return true;

    const supplierId =
      req.params?.supplierId ||
      req.body?.supplierId ||
      req.query?.supplierId ||
      req.body?.lines?.[0]?.supplierId;

    if (supplierId && supplierId !== user.uid && supplierId !== user.tenantId) {
      throw new ForbiddenException('Supplier scope violation');
    }
    return true;
  }
}
