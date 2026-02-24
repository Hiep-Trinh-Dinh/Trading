import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthenticatedUser } from '../auth/auth.types'
import { SecurityConfirmationService } from './security-confirmation.service'
import { SubmitSecurityConfirmationDto } from './dto/security-confirmation.dto'

@Controller('security-confirmation')
@UseGuards(JwtAuthGuard)
export class SecurityConfirmationController {
  constructor(private readonly service: SecurityConfirmationService) {}

  @Get('status')
  async getStatus(@CurrentUser() user: AuthenticatedUser) {
    return this.service.getStatus(user.userId)
  }

  @Post('submit')
  async submit(@CurrentUser() user: AuthenticatedUser, @Body() body: SubmitSecurityConfirmationDto) {
    return this.service.submit(user.userId, body)
  }
}
