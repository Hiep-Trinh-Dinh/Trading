import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthenticatedUser } from '../auth/auth.types'
import { UserService } from './user.service'

@Controller('user')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(private readonly users: UserService) {}

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser) {
    const u = await this.users.getById(user.userId)
    return {
      id: u.id,
      email: u.email,
      name: u.name,
      accountType: u.accountType,
      role: (u as any).role ?? 'user',
    }
  }

  @Patch('me')
  async updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: { name?: string; email?: string },
  ) {
    return this.users.updateProfile(user.userId, body)
  }
}

