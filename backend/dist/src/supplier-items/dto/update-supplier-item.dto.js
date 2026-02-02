"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateSupplierItemDto = void 0;
const mapped_types_1 = require("@nestjs/mapped-types");
const create_supplier_item_dto_1 = require("./create-supplier-item.dto");
class UpdateSupplierItemDto extends (0, mapped_types_1.PartialType)(create_supplier_item_dto_1.CreateSupplierItemDto) {
}
exports.UpdateSupplierItemDto = UpdateSupplierItemDto;
//# sourceMappingURL=update-supplier-item.dto.js.map