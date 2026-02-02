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
exports.TenantsService = void 0;
const common_1 = require("@nestjs/common");
const firestore_service_1 = require("../firebase/firestore.service");
const firebase_admin_service_1 = require("../firebase/firebase-admin.service");
const crypto_1 = require("crypto");
let TenantsService = class TenantsService {
    firestore;
    firebaseAdmin;
    constructor(firestore, firebaseAdmin) {
        this.firestore = firestore;
        this.firebaseAdmin = firebaseAdmin;
    }
    async getTenantSummary(user) {
        return {
            tenantId: user.tenantId,
            accessibleModules: this.getModulesByRole(user.role),
            user: {
                uid: user.uid,
                role: user.role,
                email: user.email,
            },
        };
    }
    async listTenantUsers(tenantId) {
        const snapshot = await this.firestore.withTenant('users', tenantId).get();
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }
    async createTenantUser(requestor, payload) {
        const password = payload.password || `Tmp#${(0, crypto_1.randomBytes)(4).toString('hex')}`;
        const userRecord = await this.firebaseAdmin['app']
            .auth()
            .createUser({
            email: payload.email,
            displayName: payload.displayName,
            password,
        });
        await this.firebaseAdmin['app']
            .auth()
            .setCustomUserClaims(userRecord.uid, {
            role: payload.role,
            tenantId: requestor.tenantId,
        });
        const userDoc = {
            uid: userRecord.uid,
            email: payload.email,
            displayName: payload.displayName,
            role: payload.role,
            phone: payload.phone || null,
            tenantId: requestor.tenantId,
            createdBy: requestor.uid,
            createdAt: new Date().toISOString(),
            active: true,
            inviteStatus: 'pending',
        };
        await this.firestore.collection('users').doc(userRecord.uid).set(userDoc);
        return {
            ...userDoc,
            tempPassword: password,
        };
    }
    getModulesByRole(role) {
        switch (role) {
            case 'owner':
                return ['users', 'suppliers', 'inventory', 'finance', 'reports'];
            case 'admin':
                return ['inventory', 'finance', 'distribution', 'reports'];
            case 'technician':
                return ['opportunities', 'visits', 'reports'];
            case 'client_user':
                return ['requests', 'finance'];
            case 'supplier':
                return ['restock', 'notifications'];
            default:
                return [];
        }
    }
};
exports.TenantsService = TenantsService;
exports.TenantsService = TenantsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firestore_service_1.FirestoreService,
        firebase_admin_service_1.FirebaseAdminService])
], TenantsService);
//# sourceMappingURL=tenants.service.js.map