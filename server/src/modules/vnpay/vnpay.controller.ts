import { Controller, Get, Post, Body, Query, Req, Res, UseGuards } from '@nestjs/common'
import * as express from 'express'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthenticatedUser } from '../auth/auth.types'
import { VnpayService } from './vnpay.service'

@Controller('vnpay')
export class VnpayController {
  constructor(private readonly vnpay: VnpayService) {}

  @Post('create-deposit')
  @UseGuards(JwtAuthGuard)
  async createDeposit(@CurrentUser() user: AuthenticatedUser, @Body() body: { amountVnd: number }) {
    const amountVnd = Number(body?.amountVnd)
    const result = await this.vnpay.createPayment(user.userId, amountVnd)
    return result
  }

  /** IPN callback - public, no JWT. VNPay calls this with GET query. Return JSON per VNPay docs. */
  @Get('ipn')
  async ipn(@Req() req: express.Request, @Res() res: express.Response) {
    const query = req.query as Record<string, string>
    try {
      const result = await this.vnpay.handleIpn(query)
      res.status(200).json(result)
    } catch (err) {
      console.error('[VNPay IPN]', err)
      res.status(200).json({ RspCode: '99', Message: 'Unknown error' })
    }
  }

  @Get('deposit-status')
  @UseGuards(JwtAuthGuard)
  async depositStatus(@CurrentUser() user: AuthenticatedUser, @Query('orderId') orderId: string) {
    const result = await this.vnpay.getDepositStatus(orderId, user.userId)
    if (!result) return { status: null }
    return result
  }

  /** Xác nhận thanh toán từ return URL (khi user quay về). Dùng khi IPN chưa/không gọi được. */
  @Post('confirm-return')
  @UseGuards(JwtAuthGuard)
  async confirmReturn(@CurrentUser() user: AuthenticatedUser, @Body() body: Record<string, string>) {
    return this.vnpay.confirmFromReturnUrl(user.userId, body)
  }

  /**
   * Public confirm from return URL (no JWT).
   * Use when user session/token is missing after VNPay redirect.
   * Still verifies VNPay signature and only credits known pending deposits.
   */
  @Post('confirm-return-public')
  async confirmReturnPublic(@Body() body: Record<string, string>) {
    return this.vnpay.confirmFromReturnUrlPublic(body)
  }
}
