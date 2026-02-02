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
exports.RequestsService = void 0;
const common_1 = require("@nestjs/common");
const firestore_service_1 = require("../firebase/firestore.service");
const statuses_1 = require("../common/constants/statuses");
const stock_balance_service_1 = require("../stock-balance/stock-balance.service");
let RequestsService = class RequestsService {
    firestore;
    stockBalances;
    constructor(firestore, stockBalances) {
        this.firestore = firestore;
        this.stockBalances = stockBalances;
    }
    async list(tenantId) {
        const snap = await this.firestore.withTenant('requests', tenantId).get();
        return snap.docs.map((d) => this.decorateLegacy(d));
    }
    async listMine(user) {
        const snap = await this.firestore
            .withTenant('requests', user.tenantId)
            .where('requesterUid', '==', user.uid)
            .get();
        return snap.docs.map((d) => this.decorateLegacy(d));
    }
    decorateLegacy(doc) {
        const data = doc.data() || {};
        const lines = data.lines || [];
        const isLegacy = lines.some((l) => !l.supplierId || !l.supplierItemId);
        return { id: doc.id, legacy: isLegacy, ...data };
    }
    async create(user, dto) {
        const status = dto.status ?? 'PENDING';
        const preparedLines = await this.prepareLines(user, dto.lines);
        const doc = {
            lines: preparedLines,
            notes: dto.notes ?? null,
            scheduleAt: dto.scheduleAt ?? null,
            status,
            statusHistory: [{ status, at: new Date().toISOString(), byUid: user.uid }],
            tenantId: user.tenantId,
            requesterUid: user.uid,
            createdAt: new Date().toISOString(),
        };
        const ref = await this.firestore.collection('requests').add(doc);
        return { id: ref.id, ...doc };
    }
    async prepareLines(user, lines) {
        const result = [];
        for (const line of lines) {
            if (line.catalogItemId && !line.supplierId) {
                const catalogDoc = await this.firestore.doc('tenant_catalog_items', line.catalogItemId).get();
                if (!catalogDoc.exists || catalogDoc.data()?.tenantId !== user.tenantId) {
                    throw new common_1.NotFoundException('Catalog item not found');
                }
                const catalog = catalogDoc.data();
                if (user.role === 'client_user' && catalog.published !== true) {
                    throw new common_1.ForbiddenException('Catalog item not published');
                }
                const supplierItemSnap = await this.firestore.doc('supplier_items', catalog.supplierItemId).get();
                if (!supplierItemSnap.exists)
                    throw new common_1.NotFoundException('Supplier item not found');
                const sItem = supplierItemSnap.data();
                result.push({
                    supplierId: catalog.supplierId,
                    supplierItemId: catalog.supplierItemId,
                    catalogItemId: catalog.catalogItemId || catalogDoc.id,
                    nameSnapshot: catalog.displayName || sItem.name,
                    unitSnapshot: sItem.unit,
                    sellPriceSnapshot: catalog.sellPrice,
                    qty: line.qty,
                });
            }
            else {
                result.push(line);
            }
        }
        return result;
    }
    async updateStatus(user, requestId, dto) {
        if (!statuses_1.REQUEST_STATUSES.includes(dto.status)) {
            throw new common_1.ForbiddenException('Invalid status');
        }
        const ref = this.firestore.collection('requests').doc(requestId);
        const snap = await ref.get();
        if (!snap.exists || snap.data()?.tenantId !== user.tenantId) {
            throw new common_1.NotFoundException('Request not found');
        }
        const data = snap.data();
        const prevStatus = data.status;
        const lines = data.lines || [];
        if (dto.status === 'APPROVED' && !['APPROVED', 'IN_PROGRESS', 'DELIVERED'].includes(prevStatus)) {
            for (const line of lines) {
                await this.stockBalances.movement(user, {
                    supplierId: line.supplierId,
                    supplierItemId: line.supplierItemId,
                    qty: line.qty,
                    type: 'RESERVE',
                    requestId,
                });
            }
        }
        if (dto.status === 'DELIVERED' && prevStatus !== 'DELIVERED') {
            for (const line of lines) {
                await this.stockBalances.movement(user, {
                    supplierId: line.supplierId,
                    supplierItemId: line.supplierItemId,
                    qty: line.qty,
                    type: 'OUT',
                    requestId,
                });
            }
        }
        if (dto.status === 'CANCELED' && prevStatus !== 'CANCELED') {
            for (const line of lines) {
                await this.stockBalances.movement(user, {
                    supplierId: line.supplierId,
                    supplierItemId: line.supplierItemId,
                    qty: line.qty,
                    type: 'RELEASE',
                    requestId,
                });
            }
        }
        await ref.update({
            status: dto.status,
            statusHistory: [
                ...(data.statusHistory || []),
                { status: dto.status, at: new Date().toISOString(), byUid: user.uid },
            ],
            updatedAt: new Date().toISOString(),
            updatedBy: user.uid,
        });
        const updated = await ref.get();
        return { id: updated.id, ...updated.data() };
    }
};
exports.RequestsService = RequestsService;
exports.RequestsService = RequestsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firestore_service_1.FirestoreService,
        stock_balance_service_1.StockBalanceService])
], RequestsService);
//# sourceMappingURL=requests.service.js.map