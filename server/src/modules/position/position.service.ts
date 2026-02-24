import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PositionEntity } from '../../database/entities/position.entity'
import { MarketService } from '../market/market.service'
import { TradeEngineService } from '../trade-engine/trade-engine.service'
import { EventsService } from '../../common/events.service'
import { lotSize } from '../../common/lot-size'

@Injectable()
export class PositionService {
  constructor(
    @InjectRepository(PositionEntity) private readonly positions: Repository<PositionEntity>,
    private readonly market: MarketService,
    private readonly engine: TradeEngineService,
    private readonly events: EventsService,
  ) {}

  async listOpenWithPnl(userId: string) {
    const open = await this.positions.find({ where: { userId, status: 'open' }, order: { openedAt: 'DESC' } })
    return open.map((p) => {
      const last = this.market.getPrice(p.symbol) ?? p.entryPrice
      const qty = p.lots * lotSize(p.symbol)
      const diff = p.side === 'buy' ? last - p.entryPrice : p.entryPrice - last
      const pnl = diff * qty
      const notional = Math.abs(p.entryPrice * qty) || 1
      const pnlPercent = (pnl / notional) * 100
      return { ...p, lastPrice: last, qty, pnl, pnlPercent }
    })
  }

  async updateStops(userId: string, id: string, body: { stopLoss?: number | null; takeProfit?: number | null }) {
    const p = await this.positions.findOne({ where: { id, userId } })
    if (!p || p.status !== 'open') throw new BadRequestException('position_not_open')

    if (body.stopLoss !== undefined) {
      if (body.stopLoss != null && (!Number.isFinite(body.stopLoss) || body.stopLoss <= 0)) {
        throw new BadRequestException('stopLoss_invalid')
      }
      p.stopLoss = body.stopLoss ?? null
    }
    if (body.takeProfit !== undefined) {
      if (body.takeProfit != null && (!Number.isFinite(body.takeProfit) || body.takeProfit <= 0)) {
        throw new BadRequestException('takeProfit_invalid')
      }
      p.takeProfit = body.takeProfit ?? null
    }

    const saved = await this.positions.save(p)
    this.events.emit({ type: 'position_updated', data: saved })
    return saved
  }

  async close(userId: string, id: string) {
    return this.engine.closePosition(id, userId, undefined, 'manual')
  }
}

