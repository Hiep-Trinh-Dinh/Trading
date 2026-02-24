import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthenticatedUser } from '../auth/auth.types'
import { OrderService } from './order.service'

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrderController {
  constructor(private readonly orders: OrderService) {}

  @Get('history')
  history(@CurrentUser() user: AuthenticatedUser) {
    return this.orders.history(user.userId)
  }

  @Post('market')
  market(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { symbol: string; side: 'buy' | 'sell'; lots: number; entryPrice: number; stopLoss?: number | null; takeProfit?: number | null; accountType?: 'demo' | 'real' },
  ) {
    return this.orders.placeMarketOrder(user.userId, body)
  }
}

