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
exports.CatalogService = void 0;
const common_1 = require("@nestjs/common");
const firestore_service_1 = require("../firebase/firestore.service");
let CatalogService = class CatalogService {
    firestore;
    constructor(firestore) {
        this.firestore = firestore;
    }
    async listForTenant(user, publishedOnly = false) {
        let q = this.firestore.collection('tenant_catalog_items').where('tenantId', '==', user.tenantId);
        if (publishedOnly)
            q = q.where('published', '==', true);
        const snap = await q.get();
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
    async create(user, dto) {
        if (user.role === 'supplier')
            throw new common_1.ForbiddenException();
        const doc = {
            tenantId: user.tenantId,
            supplierId: dto.supplierId,
            supplierItemId: dto.supplierItemId,
            inherit: dto.inherit ?? true,
            displayName: dto.displayName ?? null,
            displayDesc: dto.displayDesc ?? null,
            displayPhoto: dto.displayPhoto ?? null,
            sellPrice: dto.sellPrice,
            published: dto.published ?? false,
            createdAt: new Date().toISOString(),
            createdBy: user.uid,
        };
        const ref = await this.firestore.collection('tenant_catalog_items').add(doc);
        await ref.update({ catalogItemId: ref.id });
        return { id: ref.id, catalogItemId: ref.id, ...doc };
    }
    async update(user, id, dto) {
        const ref = this.firestore.collection('tenant_catalog_items').doc(id);
        const snap = await ref.get();
        if (!snap.exists)
            throw new common_1.NotFoundException();
        const data = snap.data();
        if (data.tenantId !== user.tenantId)
            throw new common_1.ForbiddenException();
        if (user.role === 'supplier')
            throw new common_1.ForbiddenException();
        await ref.update({ ...dto, updatedAt: new Date().toISOString(), updatedBy: user.uid });
        const updated = await ref.get();
        return { id: updated.id, ...updated.data() };
    }
};
exports.CatalogService = CatalogService;
exports.CatalogService = CatalogService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firestore_service_1.FirestoreService])
], CatalogService);
//# sourceMappingURL=catalog.service.js.map