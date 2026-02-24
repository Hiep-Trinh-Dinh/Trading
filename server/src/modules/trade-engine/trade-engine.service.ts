import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PositionEntity } from '../../database/entities/position.entity'
import { TradeHistoryEntity } from '../../database/entities/trade-history.entity'
import { EventsService } from '../../common/events.service'
import { lotSize } from '../../common/lot-size'
import { WalletService, type WalletAccountType } from '../wallet/wallet.service'

function pnlOf(p: PositionEntity, lastPrice: number) {
  const qty = p.lots * lotSize(p.symbol)
  const diff = p.side === 'buy' ? lastPrice - p.entryPrice : p.entryPrice - lastPrice
  return diff * qty
}

@Injectable()
export class TradeEngineService {
  constructor(
    @InjectRepository(PositionEntity) private readonly positions: Repository<PositionEntity>,
    @InjectRepository(TradeHistoryEntity) private readonly history: Repository<TradeHistoryEntity>,
    private readonly events: EventsService,
    private readonly wallet: WalletService,
  ) {}

  async checkHitForSymbol(symbol: string, price: number) {
    const sym = symbol.toUpperCase()
    const open = await this.positions.find({ where: { symbol: sym, status: 'open' } })
    for (const p of open) {
      const hit = this.checkHit(p, price)
      if (hit) {
        await this.closePosition(p.id, undefined, price, hit)
      }
    }
  }

  private checkHit(p: PositionEntity, price: number): 'tp' | 'sl' | null {
    const sl = p.stopLoss
    const tp = p.takeProfit
    if (p.side === 'buy') {
      if (tp != null && price >= tp) return 'tp'
      if (sl != null && price <= sl) return 'sl'
    } else {
      if (tp != null && price <= tp) return 'tp'
      if (sl != null && price >= sl) return 'sl'
    }
    return null
  }

  async closePosition(
    positionId: string,
    userId?: string,
    closePrice?: number,
    reason: 'manual' | 'tp' | 'sl' = 'manual',
  ) {
    const p = await this.positions.findOne({ where: { id: positionId } })
    if (!p || p.status !== 'open') return null
    if (userId && p.userId !== userId) return null
    const last = closePrice ?? p.entryPrice
    const pnl = pnlOf(p, last)

    p.status = 'closed'
    p.closePrice = last
    p.closeReason = reason
    p.closedAt = new Date()
    await this.positions.save(p)

    await this.history.save(
      this.history.create({
        userId: p.userId,
        orderId: p.orderId,
        positionId: p.id,
        symbol: p.symbol,
        side: p.side,
        lots: p.lots,
        entryPrice: p.entryPrice,
        exitPrice: last,
        pnl,
      }),
    )

    const marginReserved = typeof p.marginReserved === 'number' && Number.isFinite(p.marginReserved) ? p.marginReserved : 0
    const toSettle = marginReserved + pnl
    const accountType: WalletAccountType = p.accountType === 'real' ? 'real' : 'demo'
    if (toSettle > 0) {
      await this.wallet.addUsd(p.userId, toSettle, accountType)
    } else if (toSettle < 0) {
      await this.wallet.deductUsd(p.userId, -toSettle, accountType)
    }
    this.events.emit({ type: 'position_closed', data: { positionId: p.id, reason, closePrice: last, pnl } })
    return { positionId: p.id, pnl, closePrice: last, reason }
  }
}

