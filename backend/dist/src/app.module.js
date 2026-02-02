"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const auth_module_1 = require("./auth/auth.module");
const tenants_module_1 = require("./tenants/tenants.module");
const suppliers_module_1 = require("./suppliers/suppliers.module");
const items_module_1 = require("./items/items.module");
const requests_module_1 = require("./requests/requests.module");
const stock_movements_module_1 = require("./stock-movements/stock-movements.module");
const stock_balance_module_1 = require("./stock-balance/stock-balance.module");
const supplier_items_module_1 = require("./supplier-items/supplier-items.module");
const catalog_module_1 = require("./catalog/catalog.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            auth_module_1.AuthModule,
            tenants_module_1.TenantsModule,
            suppliers_module_1.SuppliersModule,
            items_module_1.ItemsModule,
            requests_module_1.RequestsModule,
            stock_movements_module_1.StockMovementsModule,
            stock_balance_module_1.StockBalanceModule,
            supplier_items_module_1.SupplierItemsModule,
            catalog_module_1.CatalogModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map