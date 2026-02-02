"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const admin = __importStar(require("firebase-admin"));
const dotenv = __importStar(require("dotenv"));
const fs = __importStar(require("fs"));
dotenv.config();
const DEFAULT_SUPPLIER_ID = process.env.DEFAULT_SUPPLIER_ID || 'default-supplier';
const DRY_RUN = process.env.MIGRATE_DRY_RUN === 'true';
const REPORT_PATH = process.env.MIGRATE_REPORT_PATH || 'migration-report.json';
function initAdmin() {
    if (admin.apps.length)
        return admin.app();
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
    const credential = projectId && clientEmail && privateKey
        ? admin.credential.cert({ projectId, clientEmail, privateKey })
        : admin.credential.applicationDefault();
    return admin.initializeApp({ credential, projectId });
}
async function run() {
    const app = initAdmin();
    const db = app.firestore();
    const report = {
        supplierItemsCreated: 0,
        catalogItemsCreated: 0,
        balancesCreated: 0,
        requestsMigrated: 0,
        legacyRequests: 0,
        errors: [],
    };
    const itemsSnap = await db.collection('items').get();
    const legacyMap = {};
    for (const doc of itemsSnap.docs) {
        try {
            const item = doc.data();
            const tenantId = item.tenantId;
            const supplierId = DEFAULT_SUPPLIER_ID;
            const supplierItemId = db.collection('supplier_items').doc().id;
            const catalogItemId = db.collection('tenant_catalog_items').doc().id;
            legacyMap[doc.id] = { supplierItemId, supplierId };
            if (!DRY_RUN) {
                await db.collection('supplier_items').doc(supplierItemId).set({
                    tenantId,
                    supplierId,
                    supplierItemId,
                    name: item.name,
                    unit: item.unit,
                    category: item.category ?? null,
                    photoUrl: item.photoUrl ?? null,
                    costPrice: item.costPrice ?? null,
                    minStock: item.minStock ?? null,
                    active: item.active ?? true,
                    createdAt: item.createdAt ?? new Date().toISOString(),
                });
                await db.collection('tenant_catalog_items').doc(catalogItemId).set({
                    tenantId,
                    supplierId,
                    supplierItemId,
                    catalogItemId,
                    inherit: true,
                    displayName: item.name,
                    sellPrice: item.price ?? 0,
                    published: true,
                    createdAt: new Date().toISOString(),
                });
                const balId = `${tenantId}_${supplierId}_${supplierItemId}`;
                const onHand = item.onHand ?? 0;
                const reserved = item.reserved ?? 0;
                const available = onHand - reserved;
                await db.collection('stock_balances').doc(balId).set({
                    tenantId,
                    supplierId,
                    supplierItemId,
                    onHand,
                    reserved,
                    available,
                    minStock: item.minStock ?? null,
                    lowStock: item.minStock ? available <= item.minStock : false,
                    updatedAt: new Date().toISOString(),
                });
            }
            report.supplierItemsCreated++;
            report.catalogItemsCreated++;
            report.balancesCreated++;
        }
        catch (e) {
            report.errors.push({ itemId: doc.id, message: e.message });
        }
    }
    const requestsSnap = await db.collection('requests').get();
    for (const reqDoc of requestsSnap.docs) {
        const req = reqDoc.data();
        const lines = req.lines || [];
        let changed = false;
        const newLines = lines.map((l) => {
            if (l.supplierId && l.supplierItemId)
                return l;
            changed = true;
            const legacy = legacyMap[l.itemId || l.catalogItemId || ''] || { supplierItemId: 'legacy', supplierId: DEFAULT_SUPPLIER_ID };
            return {
                ...l,
                supplierId: l.supplierId || legacy.supplierId,
                supplierItemId: l.supplierItemId || legacy.supplierItemId,
                catalogItemId: l.catalogItemId || l.itemId || 'legacy',
                nameSnapshot: l.nameSnapshot || l.name || 'Legacy item',
                unitSnapshot: l.unitSnapshot || l.unit || '',
                sellPriceSnapshot: l.sellPriceSnapshot || l.price || 0,
            };
        });
        if (changed) {
            if (!DRY_RUN)
                await reqDoc.ref.update({ lines: newLines, legacyMigrated: true });
            report.requestsMigrated++;
        }
        if (newLines.some((l) => !l.supplierId || !l.supplierItemId))
            report.legacyRequests++;
    }
    fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2));
    console.log('Migration report written to', REPORT_PATH, report);
    process.exit(0);
}
run().catch((err) => {
    console.error('Migration failed', err);
    process.exit(1);
});
//# sourceMappingURL=migrate-stock.js.map