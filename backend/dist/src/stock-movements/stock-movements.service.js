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
exports.StockMovementsService = void 0;
const common_1 = require("@nestjs/common");
const firestore_service_1 = require("../firebase/firestore.service");
let StockMovementsService = class StockMovementsService {
    firestore;
    constructor(firestore) {
        this.firestore = firestore;
    }
    async create(user, input) {
        if (input.qty <= 0)
            throw new common_1.BadRequestException('Quantity must be positive');
        return this.firestore.runTransaction(async (t) => {
            const itemRef = this.firestore.doc('items', input.itemId);
            const itemSnap = await t.get(itemRef);
            if (!itemSnap.exists || itemSnap.data()?.tenantId !== user.tenantId) {
                throw new common_1.NotFoundException('Item not found');
            }
            const itemData = itemSnap.data() || {};
            let onHand = itemData.onHand ?? 0;
            let reserved = itemData.reserved ?? 0;
            switch (input.type) {
                case 'IN':
                    onHand += input.qty;
                    break;
                case 'OUT':
                    onHand = Math.max(onHand - input.qty, 0);
                    reserved = Math.max(reserved - input.qty, 0);
                    break;
                case 'ADJUST':
                    onHand += input.qty;
                    break;
                case 'RESERVE':
                    reserved += input.qty;
                    break;
                case 'RELEASE':
                    reserved = Math.max(reserved - input.qty, 0);
                    break;
                default:
                    throw new common_1.BadRequestException('Invalid movement type');
            }
            const available = onHand - reserved;
            const lowStock = itemData.minStock ? available <= itemData.minStock : false;
            t.update(itemRef, {
                onHand,
                reserved,
                available,
                lowStock,
                updatedAt: new Date().toISOString(),
                updatedBy: user.uid,
            });
            const moveRef = this.firestore.collection('stock_movements').doc();
            const movement = {
                ...input,
                tenantId: user.tenantId,
                createdAt: new Date().toISOString(),
                createdBy: user.uid,
                itemNameSnapshot: itemData.name,
                before: {
                    onHand: itemData.onHand ?? 0,
                    reserved: itemData.reserved ?? 0,
                },
                after: { onHand, reserved, available },
            };
            t.set(moveRef, movement);
            return { id: moveRef.id, ...movement };
        });
    }
    async list(user, supplierItemId, supplierId) {
        let query = this.firestore.withTenant('stock_movements', user.tenantId).orderBy('createdAt', 'desc');
        if (supplierItemId)
            query = query.where('supplierItemId', '==', supplierItemId);
        if (supplierId)
            query = query.where('supplierId', '==', supplierId);
        const snap = await query.get();
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
};
exports.StockMovementsService = StockMovementsService;
exports.StockMovementsService = StockMovementsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firestore_service_1.FirestoreService])
], StockMovementsService);
//# sourceMappingURL=stock-movements.service.js.map