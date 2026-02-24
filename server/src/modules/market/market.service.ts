import { Injectable } from '@nestjs/common'
import { EventsService } from '../../common/events.service'
import { TradeEngineService } from '../trade-engine/trade-engine.service'

@Injectable()
export class MarketService {
  private readonly prices = new Map<string, number>()

  constructor(
    private readonly events: EventsService,
    private readonly engine: TradeEngineService,
  ) {}

  getPrice(symbol: string) {
    return this.prices.get(symbol.toUpperCase())
  }

  getAllPrices() {
    return Object.fromEntries(this.prices.entries())
  }

  async setPrice(symbol: string, price: number) {
    const sym = (symbol || '').toUpperCase()
    if (!sym) return { ok: false }
    if (typeof price !== 'number' || !Number.isFinite(price) || price <= 0) return { ok: false }
    this.prices.set(sym, price)
    this.events.emit({ type: 'price_updated', data: { symbol: sym, price } })
    await this.engine.checkHitForSymbol(sym, price)
    return { ok: true, symbol: sym, price }
  }
}

