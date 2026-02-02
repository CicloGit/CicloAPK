import { Module } from '@nestjs/common';
import { SupplierItemsController } from './supplier-items.controller';
import { SupplierItemsService } from './supplier-items.service';
import { FirebaseModule } from '../firebase/firebase.module';

@Module({
  imports: [FirebaseModule],
  controllers: [SupplierItemsController],
  providers: [SupplierItemsService],
  exports: [SupplierItemsService],
})
export class SupplierItemsModule {}
