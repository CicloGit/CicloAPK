"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierScopeGuard = void 0;
const common_1 = require("@nestjs/common");
let SupplierScopeGuard = class SupplierScopeGuard {
    canActivate(context) {
        const req = context.switchToHttp().getRequest();
        const user = req.user;
        if (!user)
            return false;
        if (user.role !== 'supplier')
            return true;
        const supplierId = req.params?.supplierId ||
            req.body?.supplierId ||
            req.query?.supplierId ||
            req.body?.lines?.[0]?.supplierId;
        if (supplierId && supplierId !== user.uid && supplierId !== user.tenantId) {
            throw new common_1.ForbiddenException('Supplier scope violation');
        }
        return true;
    }
};
exports.SupplierScopeGuard = SupplierScopeGuard;
exports.SupplierScopeGuard = SupplierScopeGuard = __decorate([
    (0, common_1.Injectable)()
], SupplierScopeGuard);
//# sourceMappingURL=supplier-scope.guard.js.map