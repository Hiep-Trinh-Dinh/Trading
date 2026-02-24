import { Body, Controller, Get, Patch, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthenticatedUser } from '../auth/auth.types'
import { WalletService } from './wallet.service'

@Controller('wallet')
@UseGuards(JwtAuthGuard)
export class WalletController {
  constructor(private readonly wallet: WalletService) {}

  @Get()
  async get(@CurrentUser() user: AuthenticatedUser) {
    return this.wallet.listByUserId(user.userId)
  }

  @Post('reset-demo')
  async resetDemo(@CurrentUser() user: AuthenticatedUser) {
    const amount = await this.wallet.resetDemoWallet(user.userId)
    return { amount }
  }

  @Patch('demo-balance')
  async setDemoBalance(@CurrentUser() user: AuthenticatedUser, @Body() body: { amount?: number | string }) {
    const amount = await this.wallet.setDemoUsdBalance(user.userId, Number(body?.amount ?? 0))
    return { amount }
  }
}

