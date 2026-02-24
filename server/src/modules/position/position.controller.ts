import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthenticatedUser } from '../auth/auth.types'
import { PositionService } from './position.service'

@Controller('positions')
@UseGuards(JwtAuthGuard)
export class PositionController {
  constructor(private readonly positions: PositionService) {}

  @Get('open')
  open(@CurrentUser() user: AuthenticatedUser) {
    return this.positions.listOpenWithPnl(user.userId)
  }

  @Patch(':id/stops')
  updateStops(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() body: { stopLoss?: number | null; takeProfit?: number | null },
  ) {
    return this.positions.updateStops(user.userId, id, body)
  }

  @Post(':id/close')
  close(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.positions.close(user.userId, id)
  }
}

