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
exports.StockBalanceService = void 0;
const common_1 = require("@nestjs/common");
const firestore_service_1 = require("../firebase/firestore.service");
let StockBalanceService = class StockBalanceService {
    firestore;
    constructor(firestore) {
        this.firestore = firestore;
    }
    balanceId(tenantId, supplierId, supplierItemId) {
        return `${tenantId}_${supplierId}_${supplierItemId}`;
    }
    async list(tenantId, supplierId) {
        let q = this.firestore.collection('stock_balances').where('tenantId', '==', tenantId);
        if (supplierId)
            q = q.where('supplierId', '==', supplierId);
        const snap = await q.get();
        return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    }
    async movement(user, input) {
        if (input.qty <= 0)
            throw new common_1.BadRequestException('qty must be positive');
        const balanceId = this.balanceId(user.tenantId, input.supplierId, input.supplierItemId);
        const balanceRef = this.firestore.collection('stock_balances').doc(balanceId);
        const moveRef = this.firestore.collection('stock_movements').doc();
        return this.firestore.runTransaction(async (t) => {
            const balSnap = await t.get(balanceRef);
            const balData = balSnap.exists ? balSnap.data() : null;
            if (!balSnap.exists) {
                t.set(balanceRef, {
                    tenantId: user.tenantId,
                    supplierId: input.supplierId,
                    supplierItemId: input.supplierItemId,
                    onHand: 0,
                    reserved: 0,
                    available: 0,
                    minStock: null,
                    lowStock: false,
                    updatedAt: new Date().toISOString(),
                });
            }
            const current = balData || { onHand: 0, reserved: 0, available: 0, minStock: null };
            let { onHand, reserved } = current;
            switch (input.type) {
                case 'IN':
                    onHand += input.qty;
                    break;
                case 'OUT':
                    onHand = Math.max(onHand - input.qty, 0);
                    reserved = Math.max(reserved - input.qty, 0);
                    break;
                case 'RESERVE':
                    reserved += input.qty;
                    break;
                case 'RELEASE':
                    reserved = Math.max(reserved - input.qty, 0);
                    break;
                case 'ADJUST':
                    onHand += input.qty;
                    break;
                default:
                    throw new common_1.BadRequestException('invalid type');
            }
            const available = onHand - reserved;
            const minStock = current.minStock ?? null;
            const lowStock = minStock !== null ? available <= minStock : false;
            t.set(balanceRef, {
                tenantId: user.tenantId,
                supplierId: input.supplierId,
                supplierItemId: input.supplierItemId,
                onHand,
                reserved,
                available,
                minStock,
                lowStock,
                updatedAt: new Date().toISOString(),
            }, { merge: true });
            t.set(moveRef, {
                tenantId: user.tenantId,
                supplierId: input.supplierId,
                supplierItemId: input.supplierItemId,
                qty: input.qty,
                type: input.type,
                requestId: input.requestId ?? null,
                supplierOrderId: input.supplierOrderId ?? null,
                note: input.note ?? null,
                createdAt: new Date().toISOString(),
                createdBy: user.uid,
            });
            return {
                balance: { id: balanceId, onHand, reserved, available, lowStock },
                movementId: moveRef.id,
            };
        });
    }
    async setMinStock(user, supplierId, supplierItemId, minStock) {
        const balanceId = this.balanceId(user.tenantId, supplierId, supplierItemId);
        const ref = this.firestore.collection('stock_balances').doc(balanceId);
        const snap = await ref.get();
        if (!snap.exists)
            throw new common_1.NotFoundException('balance not found');
        const data = snap.data();
        const available = data.available ?? data.onHand - data.reserved;
        const lowStock = available <= minStock;
        await ref.update({ minStock, lowStock, updatedAt: new Date().toISOString() });
        return { id: balanceId, minStock, lowStock };
    }
};
exports.StockBalanceService = StockBalanceService;
exports.StockBalanceService = StockBalanceService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firestore_service_1.FirestoreService])
], StockBalanceService);
//# sourceMappingURL=stock-balance.service.js.map