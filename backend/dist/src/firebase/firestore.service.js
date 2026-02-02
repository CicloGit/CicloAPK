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
exports.FirestoreService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const firebase_admin_service_1 = require("./firebase-admin.service");
let FirestoreService = class FirestoreService {
    config;
    db;
    constructor(firebaseAdmin, config) {
        this.config = config;
        this.db = firebaseAdmin['app'].firestore();
        const emulator = process.env.FIRESTORE_EMULATOR_HOST;
        if (emulator) {
            common_1.Logger.warn(`Using Firestore emulator at ${emulator}`);
        }
    }
    collection(name) {
        return this.db.collection(name);
    }
    withTenant(collection, tenantId) {
        return this.collection(collection).where('tenantId', '==', tenantId);
    }
    async runTransaction(fn) {
        return this.db.runTransaction(fn);
    }
    doc(collection, id) {
        return this.collection(collection).doc(id);
    }
};
exports.FirestoreService = FirestoreService;
exports.FirestoreService = FirestoreService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firebase_admin_service_1.FirebaseAdminService,
        config_1.ConfigService])
], FirestoreService);
//# sourceMappingURL=firestore.service.js.map