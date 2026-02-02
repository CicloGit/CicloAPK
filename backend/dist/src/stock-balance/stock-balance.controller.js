"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.StockBalanceController = void 0;
const common_1 = require("@nestjs/common");
const firebase_auth_guard_1 = require("../common/guards/firebase-auth.guard");
const roles_guard_1 = require("../common/guards/roles.guard");
const tenant_guard_1 = require("../common/guards/tenant.guard");
const roles_decorator_1 = require("../common/decorators/roles.decorator");
const current_user_decorator_1 = require("../common/decorators/current-user.decorator");
const stock_balance_service_1 = require("./stock-balance.service");
const supplier_scope_guard_1 = require("../common/guards/supplier-scope.guard");
let StockBalanceController = class StockBalanceController {
    service;
    constructor(service) {
        this.service = service;
    }
    list(user, supplierId) {
        const sup = user.role === 'supplier' ? user.uid : supplierId;
        return this.service.list(user.tenantId, sup);
    }
    move(user, body) {
        const sup = user.role === 'supplier' ? user.uid : body.supplierId;
        return this.service.movement(user, { ...body, supplierId: sup });
    }
};
exports.StockBalanceController = StockBalanceController;
__decorate([
    (0, common_1.Get)(),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'supplier'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('supplierId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], StockBalanceController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('move'),
    (0, roles_decorator_1.Roles)('owner', 'admin', 'supplier'),
    __param(0, (0, current_user_decorator_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], StockBalanceController.prototype, "move", null);
exports.StockBalanceController = StockBalanceController = __decorate([
    (0, common_1.Controller)('stock-balances'),
    (0, common_1.UseGuards)(firebase_auth_guard_1.FirebaseAuthGuard, roles_guard_1.RolesGuard, tenant_guard_1.TenantGuard, supplier_scope_guard_1.SupplierScopeGuard),
    __metadata("design:paramtypes", [stock_balance_service_1.StockBalanceService])
], StockBalanceController);
//# sourceMappingURL=stock-balance.controller.js.map