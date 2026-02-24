import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { PositionEntity } from '../../database/entities/position.entity'
import { PositionService } from './position.service'
import { PositionController } from './position.controller'
import { MarketModule } from '../market/market.module'
import { TradeEngineModule } from '../trade-engine/trade-engine.module'
import { EventsModule } from '../events/events.module'

@Module({
  imports: [TypeOrmModule.forFeature([PositionEntity]), MarketModule, TradeEngineModule, EventsModule],
  providers: [PositionService],
  controllers: [PositionController],
  exports: [PositionService],
})
export class PositionModule {}

