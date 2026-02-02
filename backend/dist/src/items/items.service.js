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
exports.ItemsService = void 0;
const common_1 = require("@nestjs/common");
const firestore_service_1 = require("../firebase/firestore.service");
let ItemsService = class ItemsService {
    firestore;
    constructor(firestore) {
        this.firestore = firestore;
    }
    async list(tenantId) {
        const snap = await this.firestore.withTenant('items', tenantId).get();
        return snap.docs.map((d) => {
            const data = d.data();
            const available = (data.onHand ?? 0) - (data.reserved ?? 0);
            return {
                id: d.id,
                ...data,
                available,
                lowStock: data.minStock ? available <= data.minStock : false,
            };
        });
    }
    async create(user, dto) {
        const doc = {
            name: dto.name,
            category: dto.category,
            unit: dto.unit,
            price: dto.price ?? null,
            photoUrl: dto.photoUrl ?? null,
            minStock: dto.minStock ?? null,
            active: dto.active ?? true,
            tenantId: user.tenantId,
            createdAt: new Date().toISOString(),
            createdBy: user.uid,
            onHand: 0,
            reserved: 0,
            available: 0,
        };
        const ref = await this.firestore.collection('items').add(doc);
        return { id: ref.id, ...doc };
    }
    async update(user, id, dto) {
        const ref = this.firestore.collection('items').doc(id);
        const snap = await ref.get();
        if (!snap.exists || snap.data()?.tenantId !== user.tenantId) {
            throw new common_1.NotFoundException('Item not found');
        }
        await ref.update({
            ...dto,
            updatedAt: new Date().toISOString(),
            updatedBy: user.uid,
        });
        const updated = await ref.get();
        return { id: updated.id, ...updated.data() };
    }
    async remove(user, id) {
        const ref = this.firestore.collection('items').doc(id);
        const snap = await ref.get();
        if (!snap.exists || snap.data()?.tenantId !== user.tenantId) {
            throw new common_1.NotFoundException('Item not found');
        }
        await ref.update({ active: false, updatedAt: new Date().toISOString(), updatedBy: user.uid });
        return { id, deleted: true };
    }
};
exports.ItemsService = ItemsService;
exports.ItemsService = ItemsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firestore_service_1.FirestoreService])
], ItemsService);
//# sourceMappingURL=items.service.js.map