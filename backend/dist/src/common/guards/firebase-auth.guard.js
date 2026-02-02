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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FirebaseAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const firebase_admin_service_1 = require("../../firebase/firebase-admin.service");
let FirebaseAuthGuard = class FirebaseAuthGuard {
    firebaseAdmin;
    configService;
    constructor(firebaseAdmin, configService) {
        this.firebaseAdmin = firebaseAdmin;
        this.configService = configService;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const token = this.extractBearerToken(request);
        if (!token) {
            throw new common_1.UnauthorizedException('Missing bearer token');
        }
        try {
            const decoded = await this.firebaseAdmin.verifyIdToken(token);
            const role = decoded.role ?? 'client_user';
            const tenantId = decoded.tenantId ??
                this.configService.get('DEFAULT_TENANT_ID');
            if (!tenantId) {
                throw new common_1.UnauthorizedException('Tenant not resolved for user');
            }
            const user = {
                uid: decoded.uid,
                email: decoded.email,
                displayName: decoded.name,
                role,
                tenantId,
                permissions: decoded.permissions || [],
                metadata: {
                    signInProvider: decoded.firebase?.sign_in_provider,
                },
            };
            request.user = user;
            return true;
        }
        catch (error) {
            throw new common_1.UnauthorizedException(error?.message ?? 'Invalid token');
        }
    }
    extractBearerToken(request) {
        const header = request.headers.authorization;
        if (!header)
            return null;
        const [type, token] = header.split(' ');
        return type?.toLowerCase() === 'bearer' ? token : null;
    }
};
exports.FirebaseAuthGuard = FirebaseAuthGuard;
exports.FirebaseAuthGuard = FirebaseAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firebase_admin_service_1.FirebaseAdminService,
        config_1.ConfigService])
], FirebaseAuthGuard);
//# sourceMappingURL=firebase-auth.guard.js.map