import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { OrderEntity } from '../../database/entities/order.entity'
import { PositionEntity } from '../../database/entities/position.entity'
import { TradeHistoryEntity } from '../../database/entities/trade-history.entity'
import { OrderController } from './order.controller'
import { OrderService } from './order.service'
import { WalletModule } from '../wallet/wallet.module'
import { EventsModule } from '../events/events.module'
import { TradeEngineModule } from '../trade-engine/trade-engine.module'

@Module({
  imports: [TypeOrmModule.forFeature([OrderEntity, PositionEntity, TradeHistoryEntity]), WalletModule, EventsModule, TradeEngineModule],
  controllers: [OrderController],
  providers: [OrderService],
  exports: [OrderService],
})
export class OrderModule {}

