"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SupplierItemsModule = void 0;
const common_1 = require("@nestjs/common");
const supplier_items_controller_1 = require("./supplier-items.controller");
const supplier_items_service_1 = require("./supplier-items.service");
const firebase_module_1 = require("../firebase/firebase.module");
let SupplierItemsModule = class SupplierItemsModule {
};
exports.SupplierItemsModule = SupplierItemsModule;
exports.SupplierItemsModule = SupplierItemsModule = __decorate([
    (0, common_1.Module)({
        imports: [firebase_module_1.FirebaseModule],
        controllers: [supplier_items_controller_1.SupplierItemsController],
        providers: [supplier_items_service_1.SupplierItemsService],
        exports: [supplier_items_service_1.SupplierItemsService],
    })
], SupplierItemsModule);
//# sourceMappingURL=supplier-items.module.js.map