"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantId = void 0;
const common_1 = require("@nestjs/common");
exports.TenantId = (0, common_1.createParamDecorator)((_data, ctx) => {
    const request = ctx.switchToHttp().getRequest();
    return (request.headers['x-tenant-id'] ||
        request.headers['tenant-id'] ||
        request.user?.tenantId ||
        undefined);
});
//# sourceMappingURL=tenant.decorator.js.map