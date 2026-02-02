import { Module } from '@nestjs/common';
import { StockBalanceService } from './stock-balance.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { StockBalanceController } from './stock-balance.controller';

@Module({
  imports: [FirebaseModule],
  providers: [StockBalanceService],
  controllers: [StockBalanceController],
  exports: [StockBalanceService],
})
export class StockBalanceModule {}
