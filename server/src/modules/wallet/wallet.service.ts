import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { WalletEntity } from '../../database/entities/wallet.entity'
import { UserService } from '../user/user.service'
import { EventsService } from '../../common/events.service'
import { DEMO_WALLET } from '../user/demo-user.constants'

export type WalletAccountType = 'demo' | 'real'

export const WALLET_SYMBOL = { DEMO: 'USD_DEMO', REAL: 'USD_REAL' } as const
const USD_DEMO = WALLET_SYMBOL.DEMO
const USD_REAL = WALLET_SYMBOL.REAL

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(WalletEntity) private readonly wallets: Repository<WalletEntity>,
    private readonly users: UserService,
    private readonly events: EventsService,
  ) {}

  async listByUserId(userId: string) {
    return this.wallets.find({ where: { userId } })
  }

  private symbolFor(accountType: WalletAccountType): string {
    return accountType === 'demo' ? USD_DEMO : USD_REAL
  }

  /** Demo balance only (Cập nhật thủ công trên trang Ví). */
  async getDemoUsdBalance(userId: string): Promise<number> {
    const row = await this.wallets.findOne({ where: { userId, symbol: USD_DEMO } })
    const amount = row?.amount
    return typeof amount === 'number' && Number.isFinite(amount) ? amount : 0
  }

  /** Real balance only (nạp qua VNPay). Backward compat: nếu chưa có USD_REAL thì dùng legacy USD. */
  async getRealUsdBalance(userId: string): Promise<number> {
    const real = await this.wallets.findOne({ where: { userId, symbol: USD_REAL } })
    if (real != null && Number.isFinite(real.amount)) return real.amount
    const legacy = await this.wallets.findOne({ where: { userId, symbol: 'USD' } })
    const amount = legacy?.amount
    return typeof amount === 'number' && Number.isFinite(amount) ? amount : 0
  }

  /** Get USD balance for a given account type (for trading). */
  async getUsdBalance(userId: string, accountType: WalletAccountType): Promise<number> {
    return accountType === 'demo' ? this.getDemoUsdBalance(userId) : this.getRealUsdBalance(userId)
  }

  /** Deduct USD from demo or real wallet (margin on open). */
  async deductUsd(userId: string, amount: number, accountType: WalletAccountType): Promise<boolean> {
    if (amount <= 0 || !Number.isFinite(amount)) return false
    const symbol = this.symbolFor(accountType)
    let row = await this.wallets.findOne({ where: { userId, symbol } })
    if (symbol === USD_REAL && !row) {
      const legacy = await this.wallets.findOne({ where: { userId, symbol: 'USD' } })
      if (legacy) {
        row = legacy
        legacy.symbol = USD_REAL
        await this.wallets.save(legacy)
      }
    }
    if (!row) return false
    const current = row.amount ?? 0
    if (current < amount) return false
    row.amount = current - amount
    await this.wallets.save(row)
    this.events.emit({ type: 'wallet_updated', data: { userId, symbol: row.symbol, amount: row.amount } })
    return true
  }

  /** Credit USD to demo or real wallet (release margin + pnl on close, or VNPay → real). */
  async addUsd(userId: string, amount: number, accountType: WalletAccountType): Promise<void> {
    if (!Number.isFinite(amount) || amount <= 0) return
    const symbol = this.symbolFor(accountType)
    let row = await this.wallets.findOne({ where: { userId, symbol } })
    if (!row) {
      row = this.wallets.create({ userId, symbol, amount: 0, lastPrice: 1 })
    }
    row.amount = (row.amount ?? 0) + amount
    await this.wallets.save(row)
    this.events.emit({ type: 'wallet_updated', data: { userId, symbol: row.symbol, amount: row.amount } })
  }

  /** @deprecated Use addUsd(..., 'real') for PnL. */
  async addUsdPnL(userId: string, pnl: number) {
    await this.addUsd(userId, pnl, 'real')
  }

  /** Reset demo wallet to initial (chỉ ví Demo, không đụng ví Real). */
  async resetDemoWallet(userId: string): Promise<number> {
    const user = await this.users.getById(userId)
    if (user.accountType !== 'Demo') return this.getDemoUsdBalance(userId)

    const initial = DEMO_WALLET.find((a) => a.symbol === 'USD' || a.symbol === 'USD_DEMO')?.amount ?? 25_000
    let row = await this.wallets.findOne({ where: { userId, symbol: USD_DEMO } })
    if (!row) {
      row = this.wallets.create({ userId, symbol: USD_DEMO, amount: initial, lastPrice: 1 })
      await this.wallets.save(row)
    } else {
      row.amount = initial
      await this.wallets.save(row)
    }
    this.events.emit({ type: 'wallet_updated', data: { userId, symbol: USD_DEMO, amount: row.amount } })
    return row.amount
  }

  /** Set demo USD only (nút Cập nhật trên trang Ví). Không ảnh hưởng ví Real. */
  async setDemoUsdBalance(userId: string, amount: number): Promise<number> {
    const value = Number(amount)
    if (!Number.isFinite(value) || value < 0) return this.getDemoUsdBalance(userId)

    let row = await this.wallets.findOne({ where: { userId, symbol: USD_DEMO } })
    if (!row) {
      row = this.wallets.create({ userId, symbol: USD_DEMO, amount: 0, lastPrice: 1 })
    }
    row.amount = value
    await this.wallets.save(row)
    this.events.emit({ type: 'wallet_updated', data: { userId, symbol: USD_DEMO, amount: row.amount } })
    return row.amount
  }
}

