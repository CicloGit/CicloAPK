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
exports.SuppliersService = void 0;
const common_1 = require("@nestjs/common");
const firestore_service_1 = require("../firebase/firestore.service");
let SuppliersService = class SuppliersService {
    firestore;
    constructor(firestore) {
        this.firestore = firestore;
    }
    async list(tenantId) {
        const snapshot = await this.firestore.withTenant('suppliers', tenantId).get();
        return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    }
    async create(user, payload) {
        const doc = {
            name: payload.name,
            email: payload.email ?? null,
            contact: payload.contact ?? null,
            items: payload.items ?? [],
            tenantId: user.tenantId,
            createdBy: user.uid,
            createdAt: new Date().toISOString(),
            status: 'active',
        };
        const ref = await this.firestore.collection('suppliers').add(doc);
        return { id: ref.id, ...doc };
    }
};
exports.SuppliersService = SuppliersService;
exports.SuppliersService = SuppliersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firestore_service_1.FirestoreService])
], SuppliersService);
//# sourceMappingURL=suppliers.service.js.map