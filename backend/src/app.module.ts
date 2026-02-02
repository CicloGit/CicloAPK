import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { TenantsModule } from './tenants/tenants.module';
import { SuppliersModule } from './suppliers/suppliers.module';
import { ItemsModule } from './items/items.module';
import { RequestsModule } from './requests/requests.module';
import { StockMovementsModule } from './stock-movements/stock-movements.module';
import { StockBalanceModule } from './stock-balance/stock-balance.module';
import { SupplierItemsModule } from './supplier-items/supplier-items.module';
import { CatalogModule } from './catalog/catalog.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    TenantsModule,
    SuppliersModule,
    ItemsModule,
    RequestsModule,
    StockMovementsModule,
    StockBalanceModule,
    SupplierItemsModule,
    CatalogModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
