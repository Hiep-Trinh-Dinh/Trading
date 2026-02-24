import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PositionEntity } from '../../database/entities/position.entity'
import { TradeHistoryEntity } from '../../database/entities/trade-history.entity'
import { TradeEngineService } from './trade-engine.service'
import { EventsModule } from '../events/events.module'
import { WalletModule } from '../wallet/wallet.module'

@Module({
  imports: [TypeOrmModule.forFeature([PositionEntity, TradeHistoryEntity]), EventsModule, WalletModule],
  providers: [TradeEngineService],
  exports: [TradeEngineService],
})
export class TradeEngineModule {}

