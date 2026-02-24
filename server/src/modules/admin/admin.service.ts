import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import * as bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import { Repository } from 'typeorm'
import { UserEntity } from '../../database/entities/user.entity'
import { TradeHistoryEntity } from '../../database/entities/trade-history.entity'
import { ChatMessageEntity } from '../../database/entities/chat-message.entity'
import { WalletEntity } from '../../database/entities/wallet.entity'
import { WALLET_SYMBOL } from '../wallet/wallet.service'

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(TradeHistoryEntity) private readonly history: Repository<TradeHistoryEntity>,
    @InjectRepository(ChatMessageEntity) private readonly chat: Repository<ChatMessageEntity>,
    @InjectRepository(WalletEntity) private readonly wallets: Repository<WalletEntity>,
  ) {}

  /** Danh sách user (admin không xóa được chính mình) */
  async listUsers() {
    const list = await this.users.find({
      order: { createdAt: 'DESC' },
      select: ['id', 'email', 'name', 'accountType', 'role', 'isLocked', 'createdAt', 'updatedAt'],
    })
    return list.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      accountType: u.accountType,
      role: u.role ?? 'user',
      isLocked: !!u.isLocked,
      createdAt: u.createdAt.toISOString(),
      updatedAt: u.updatedAt.toISOString(),
    }))
  }

  /** Thêm user mới */
  async createUser(body: { email: string; name: string; password: string; role?: 'admin' | 'user' }) {
    const email = (body.email || '').trim().toLowerCase()
    const name = (body.name || '').trim()
    if (!email) throw new BadRequestException('email_required')
    if (!name) throw new BadRequestException('name_required')
    if (typeof body.password !== 'string' || body.password.length < 6) {
      throw new BadRequestException('password_min_6')
    }
    const existing = await this.users.findOne({ where: { email } })
    if (existing) throw new ConflictException('email_already_exists')

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10)
    const passwordHash = await bcrypt.hash(body.password, saltRounds)
    const role = body.role === 'admin' ? 'admin' : 'user'

    const user = await this.users.save(
      this.users.create({
        id: randomUUID(),
        email,
        name,
        passwordHash,
        accountType: 'Live',
        role,
        isLocked: false,
      }),
    )

    await this.wallets.save([
      this.wallets.create({ userId: user.id, symbol: WALLET_SYMBOL.DEMO, amount: 0, lastPrice: 1 }),
      this.wallets.create({ userId: user.id, symbol: WALLET_SYMBOL.REAL, amount: 0, lastPrice: 1 }),
    ])

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      accountType: user.accountType,
      role: user.role ?? 'user',
      isLocked: !!user.isLocked,
      createdAt: user.createdAt.toISOString(),
    }
  }

  /** Cập nhật user */
  async updateUser(
    userId: string,
    body: { name?: string; email?: string; password?: string; role?: 'admin' | 'user' },
  ) {
    const u = await this.users.findOne({ where: { id: userId } })
    if (!u) throw new NotFoundException('user_not_found')

    if (body.name !== undefined) {
      const name = String(body.name || '').trim()
      if (!name) throw new BadRequestException('name_required')
      u.name = name
    }
    if (body.email !== undefined) {
      const email = String(body.email || '').trim().toLowerCase()
      if (!email) throw new BadRequestException('email_required')
      if (email !== u.email) {
        const existing = await this.users.findOne({ where: { email } })
        if (existing) throw new ConflictException('email_already_exists')
        u.email = email
      }
    }
    if (body.password !== undefined && body.password.length > 0) {
      if (body.password.length < 6) throw new BadRequestException('password_min_6')
      const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10)
      u.passwordHash = await bcrypt.hash(body.password, saltRounds)
    }
    if (body.role !== undefined) {
      u.role = body.role === 'admin' ? 'admin' : 'user'
    }

    await this.users.save(u)
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      accountType: u.accountType,
      role: u.role ?? 'user',
      isLocked: !!u.isLocked,
    }
  }

  /** Khóa user */
  async lockUser(userId: string) {
    const u = await this.users.findOne({ where: { id: userId } })
    if (!u) throw new NotFoundException('user_not_found')
    u.isLocked = true
    await this.users.save(u)
    return { ok: true, isLocked: true }
  }

  /** Mở khóa user */
  async unlockUser(userId: string) {
    const u = await this.users.findOne({ where: { id: userId } })
    if (!u) throw new NotFoundException('user_not_found')
    u.isLocked = false
    await this.users.save(u)
    return { ok: true, isLocked: false }
  }

  /** Lịch sử giao dịch theo user (hoặc tất cả) */
  async listTradeHistory(userId?: string, limit = 500) {
    const qb = this.history
      .createQueryBuilder('t')
      .orderBy('t.createdAt', 'DESC')
      .take(Math.min(limit, 2000))
    if (userId) qb.andWhere('t.userId = :userId', { userId })
    const list = await qb.getMany()
    return list.map((t) => ({
      id: t.id,
      userId: t.userId,
      orderId: t.orderId,
      positionId: t.positionId,
      symbol: t.symbol,
      side: t.side,
      lots: t.lots,
      entryPrice: t.entryPrice,
      exitPrice: t.exitPrice,
      pnl: t.pnl,
      createdAt: t.createdAt.toISOString(),
    }))
  }

  /** Xuất CSV lịch sử giao dịch */
  async exportTradeHistoryCsv(userId?: string): Promise<string> {
    const rows = await this.listTradeHistory(userId, 10000)
    const header = 'id,userId,orderId,positionId,symbol,side,lots,entryPrice,exitPrice,pnl,createdAt'
    const lines = rows.map(
      (r) =>
        `${r.id},"${r.userId}","${r.orderId}","${r.positionId}",${r.symbol},${r.side},${r.lots},${r.entryPrice},${r.exitPrice},${r.pnl},"${r.createdAt}"`,
    )
    return [header, ...lines].join('\n')
  }

  /** Danh sách tin nhắn chat */
  async listChatMessages(room?: 'general' | 'support', limit = 200) {
    const qb = this.chat
      .createQueryBuilder('c')
      .orderBy('c.createdAt', 'DESC')
      .take(Math.min(limit, 500))
    if (room) qb.andWhere('c.room = :room', { room })
    const list = await qb.getMany()
    return list
      .reverse()
      .map((m) => ({
        id: m.id,
        room: m.room,
        userId: m.userId,
        userName: m.userName,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      }))
  }

  /** Xóa tin nhắn chat */
  async deleteChatMessage(id: number) {
    const msg = await this.chat.findOne({ where: { id } })
    if (!msg) throw new NotFoundException('message_not_found')
    await this.chat.remove(msg)
    return { ok: true }
  }
}
