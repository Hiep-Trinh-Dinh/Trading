import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { DataSource, In, Repository } from 'typeorm'
import { OrderEntity } from '../../database/entities/order.entity'
import { PositionEntity } from '../../database/entities/position.entity'
import { TradeHistoryEntity } from '../../database/entities/trade-history.entity'
import { WalletEntity } from '../../database/entities/wallet.entity'
import { WalletService, WALLET_SYMBOL, type WalletAccountType } from '../wallet/wallet.service'
import { EventsService } from '../../common/events.service'

function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${Math.random().toString(16).slice(2)}`
}

/** Margin required = 1 USD fixed (single source of truth on server). */
function marginRequired(_symbol: string, _lots: number, _entryPrice: number): number {
  return 1
}

@Injectable()
export class OrderService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(OrderEntity) private readonly orders: Repository<OrderEntity>,
    @InjectRepository(PositionEntity) private readonly positions: Repository<PositionEntity>,
    @InjectRepository(TradeHistoryEntity) private readonly tradeHistoryRepo: Repository<TradeHistoryEntity>,
    private readonly wallet: WalletService,
    private readonly events: EventsService,
  ) {}

  async placeMarketOrder(
    userId: string,
    body: {
    symbol: string
    side: 'buy' | 'sell'
    lots: number
    entryPrice: number
    stopLoss?: number | null
    takeProfit?: number | null
    accountType?: WalletAccountType
    },
  ) {
    const symbol = (body.symbol || '').toUpperCase()
    if (!symbol) throw new BadRequestException('symbol_required')
    if (body.side !== 'buy' && body.side !== 'sell') throw new BadRequestException('side_invalid')
    if (typeof body.lots !== 'number' || !Number.isFinite(body.lots) || body.lots <= 0) throw new BadRequestException('lots_invalid')
    if (typeof body.entryPrice !== 'number' || !Number.isFinite(body.entryPrice) || body.entryPrice <= 0) {
      throw new BadRequestException('entryPrice_invalid')
    }
    if (typeof body.stopLoss !== 'number' || !Number.isFinite(body.stopLoss)) {
      throw new BadRequestException('stopLoss_required')
    }
    if (typeof body.takeProfit !== 'number' || !Number.isFinite(body.takeProfit)) {
      throw new BadRequestException('takeProfit_required')
    }
    const accountType: WalletAccountType = body.accountType === 'real' ? 'real' : 'demo'

    const marginReserved = marginRequired(symbol, body.lots, body.entryPrice)
    const balance = await this.wallet.getUsdBalance(userId, accountType)
    if (balance < marginReserved) {
      throw new BadRequestException(
        `insufficient_balance: required ${marginReserved.toFixed(2)} USD, available ${balance.toFixed(2)} USD`,
      )
    }

    const orderId = uid('ord')
    const positionId = uid('pos')
    const walletSymbol = accountType === 'real' ? WALLET_SYMBOL.REAL : WALLET_SYMBOL.DEMO

    await this.dataSource.transaction(async (manager) => {
      const walletRepo = manager.getRepository(WalletEntity)
      let wallet = await walletRepo.findOne({ where: { userId, symbol: walletSymbol } })
      if (!wallet && accountType === 'real') {
        const legacy = await walletRepo.findOne({ where: { userId, symbol: 'USD' } })
        if (legacy) {
          legacy.symbol = WALLET_SYMBOL.REAL
          await walletRepo.save(legacy)
          wallet = legacy
        }
      }
      if (!wallet) throw new BadRequestException('insufficient_balance')
      const current = wallet.amount ?? 0
      if (current < marginReserved) throw new BadRequestException('insufficient_balance')
      wallet.amount = current - marginReserved
      await walletRepo.save(wallet)

      const order = this.orders.create({
        id: orderId,
        userId,
        symbol,
        side: body.side,
        type: 'market',
        lots: body.lots,
        entryPrice: body.entryPrice,
        stopLoss: body.stopLoss ?? null,
        takeProfit: body.takeProfit ?? null,
        status: 'filled',
      })
      await manager.getRepository(OrderEntity).save(order)

      const position = this.positions.create({
        id: positionId,
        orderId: order.id,
        userId,
        symbol,
        side: order.side,
        lots: order.lots,
        entryPrice: order.entryPrice,
        stopLoss: order.stopLoss,
        takeProfit: order.takeProfit,
        status: 'open',
        closePrice: null,
        closeReason: null,
        closedAt: null,
        marginReserved,
        accountType,
      })
      await manager.getRepository(PositionEntity).save(position)
    })

    const order = await this.orders.findOneOrFail({ where: { id: orderId } })
    const position = await this.positions.findOneOrFail({ where: { id: positionId } })
    const newBalance = await this.wallet.getUsdBalance(userId, accountType)
    this.events.emit({ type: 'wallet_updated', data: { userId, symbol: walletSymbol, amount: newBalance } })
    this.events.emit({ type: 'order_created', data: order })
    this.events.emit({ type: 'position_created', data: position })
    return { order, position }
  }

  async history(userId: string): Promise<Array<OrderEntity & { realizedPnl: number | null }>> {
    const orders = await this.orders.find({ where: { userId }, order: { createdAt: 'DESC' } })
    const orderIds = orders.map((o) => o.id)
    const trades = orderIds.length
      ? await this.tradeHistoryRepo.find({ where: { orderId: In(orderIds) } })
      : []
    const pnlByOrderId = new Map<string, number>()
    for (const t of trades) {
      pnlByOrderId.set(t.orderId, t.pnl)
    }
    return orders.map((o) => ({
      ...o,
      realizedPnl: pnlByOrderId.get(o.id) ?? null,
    }))
  }
}

