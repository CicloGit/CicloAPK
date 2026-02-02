import { Module } from '@nestjs/common';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { StockBalanceModule } from '../stock-balance/stock-balance.module';

@Module({
  imports: [FirebaseModule, StockBalanceModule],
  controllers: [RequestsController],
  providers: [RequestsService],
})
export class RequestsModule {}
