import { Module } from '@nestjs/common';
import { StockMovementsService } from './stock-movements.service';
import { FirebaseModule } from '../firebase/firebase.module';
import { StockMovementsController } from './stock-movements.controller';

@Module({
  imports: [FirebaseModule],
  providers: [StockMovementsService],
  controllers: [StockMovementsController],
  exports: [StockMovementsService],
})
export class StockMovementsModule {}
