import { BadRequestException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { UserEntity } from '../../database/entities/user.entity'
import { WalletEntity } from '../../database/entities/wallet.entity'
import { DEMO_USER, DEMO_WALLET } from './demo-user.constants'

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(WalletEntity) private readonly wallets: Repository<WalletEntity>,
  ) {}

  async ensureDemoUser() {
    // Đảm bảo user/ ví demo tồn tại, đồng thời tránh lỗi duplicate key
    // bằng cách catch ER_DUP_ENTRY (TypeORM + MySQL).
    const existing = await this.users.findOne({ where: { id: DEMO_USER.id } })
    if (!existing) {
      try {
        await this.users.save(this.users.create(DEMO_USER))
      } catch (e: any) {
        if (!(e && typeof e === 'object' && 'code' in e && (e as any).code === 'ER_DUP_ENTRY')) {
          throw e
        }
        // ignore duplicate insert from race
      }
    }

    for (const a of DEMO_WALLET) {
      const w = await this.wallets.findOne({ where: { userId: DEMO_USER.id, symbol: a.symbol } })
      if (!w) {
        try {
          await this.wallets.save(
            this.wallets.create({
              userId: DEMO_USER.id,
              symbol: a.symbol,
              amount: a.amount,
              lastPrice: a.lastPrice,
            }),
          )
        } catch (e: any) {
          if (!(e && typeof e === 'object' && 'code' in e && (e as any).code === 'ER_DUP_ENTRY')) {
            throw e
          }
          // ignore duplicate insert from race
        }
      }
    }

    return DEMO_USER
  }

  async getDemoUser() {
    await this.ensureDemoUser()
    return this.users.findOneOrFail({ where: { id: DEMO_USER.id } })
  }

  async getById(id: string) {
    return this.users.findOneOrFail({ where: { id } })
  }

  /** Update profile (name, email). Email must be unique. */
  async updateProfile(
    userId: string,
    data: { name?: string; email?: string },
  ): Promise<{ id: string; email: string; name: string; accountType: string }> {
    const user = await this.users.findOneOrFail({ where: { id: userId } })
    if (data.name !== undefined) {
      const name = typeof data.name === 'string' ? data.name.trim() : ''
      if (name.length === 0) throw new BadRequestException('name_required')
      if (name.length > 255) throw new BadRequestException('name_too_long')
      user.name = name
    }
    if (data.email !== undefined) {
      const email = typeof data.email === 'string' ? data.email.trim().toLowerCase() : ''
      if (email.length === 0) throw new BadRequestException('email_required')
      if (email.length > 255) throw new BadRequestException('email_too_long')
      if (email !== user.email) {
        const existing = await this.users.findOne({ where: { email } })
        if (existing) throw new BadRequestException('email_already_used')
        user.email = email
      }
    }
    await this.users.save(user)
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      accountType: user.accountType,
    }
  }
}

