import { Module } from '@nestjs/common'
import { MarketService } from './market.service'
import { MarketController } from './market.controller'
import { EventsModule } from '../events/events.module'
import { TradeEngineModule } from '../trade-engine/trade-engine.module'

@Module({
  imports: [EventsModule, TradeEngineModule],
  controllers: [MarketController],
  providers: [MarketService],
  exports: [MarketService],
})
export class MarketModule {}

