import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { JwtService } from '@nestjs/jwt'
import type { JwtSignOptions } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import { Repository } from 'typeorm'
import { UserEntity } from '../../database/entities/user.entity'
import { WalletEntity } from '../../database/entities/wallet.entity'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserEntity) private readonly users: Repository<UserEntity>,
    @InjectRepository(WalletEntity) private readonly wallets: Repository<WalletEntity>,
    private readonly jwt: JwtService,
  ) {}

  private signAccessToken(user: UserEntity) {
    const expiresIn = (process.env.JWT_ACCESS_EXPIRES ?? '1d') as JwtSignOptions['expiresIn']
    return this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role ?? 'user' },
      {
        secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
        expiresIn,
      },
    )
  }

  async register(emailRaw: string, nameRaw: string, password: string) {
    const email = emailRaw.trim().toLowerCase()
    const name = nameRaw.trim()

    const existing = await this.users.findOne({ where: { email } })
    if (existing) throw new ConflictException('Email already exists')

    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10)
    const passwordHash = await bcrypt.hash(password, saltRounds)

    const user = await this.users.save(
      this.users.create({
        id: randomUUID(),
        email,
        name,
        passwordHash,
        accountType: 'Live',
      }),
    )

    // Ví Demo (cập nhật thủ công) và ví Real (nạp VNPay).
    await this.wallets.save([
      this.wallets.create({ userId: user.id, symbol: 'USD_DEMO', amount: 0, lastPrice: 1 }),
      this.wallets.create({ userId: user.id, symbol: 'USD_REAL', amount: 0, lastPrice: 1 }),
    ])

    return {
      user: { id: user.id, email: user.email, name: user.name, accountType: user.accountType },
      accessToken: this.signAccessToken(user),
    }
  }

  async login(emailRaw: string, password: string) {
    const email = emailRaw.trim().toLowerCase()
    const user = await this.users.findOne({ where: { email } })
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials')
    if (user.isLocked) throw new UnauthorizedException('Account is locked')

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) throw new UnauthorizedException('Invalid credentials')

    return {
      user: { id: user.id, email: user.email, name: user.name, accountType: user.accountType },
      accessToken: this.signAccessToken(user),
    }
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.users.findOne({ where: { id: userId } })
    if (!user || !user.passwordHash) throw new UnauthorizedException('Invalid credentials')
    const ok = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!ok) throw new UnauthorizedException('Invalid credentials')
    if (typeof newPassword !== 'string' || newPassword.length < 8) {
      throw new BadRequestException('New password must be at least 8 characters')
    }
    const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS ?? 10)
    user.passwordHash = await bcrypt.hash(newPassword, saltRounds)
    await this.users.save(user)
  }
}

