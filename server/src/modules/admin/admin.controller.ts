import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common'
import { JwtAuthGuard } from '../auth/jwt-auth.guard'
import { AdminGuard } from './admin.guard'
import { AdminService } from './admin.service'

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  listUsers() {
    return this.admin.listUsers()
  }

  @Post('users')
  createUser(
    @Body() body: { email: string; name: string; password: string; role?: 'admin' | 'user' },
  ) {
    return this.admin.createUser(body)
  }

  @Patch('users/:id')
  updateUser(
    @Param('id') id: string,
    @Body() body: { name?: string; email?: string; password?: string; role?: 'admin' | 'user' },
  ) {
    return this.admin.updateUser(id, body)
  }

  @Post('users/:id/lock')
  lockUser(@Param('id') id: string) {
    return this.admin.lockUser(id)
  }

  @Post('users/:id/unlock')
  unlockUser(@Param('id') id: string) {
    return this.admin.unlockUser(id)
  }

  @Get('trade-history')
  async listTradeHistory(@Query('userId') userId?: string, @Query('limit') limit?: string) {
    return this.admin.listTradeHistory(userId || undefined, limit ? parseInt(limit, 10) : 500)
  }

  @Get('trade-history/export')
  async exportTradeHistory(
    @Query('userId') userId: string | undefined,
    @Query() _q: Record<string, string>,
  ) {
    const csv = await this.admin.exportTradeHistoryCsv(userId || undefined)
    return { csv }
  }

  @Get('chat-messages')
  listChatMessages(@Query('room') room?: 'general' | 'support', @Query('limit') limit?: string) {
    return this.admin.listChatMessages(room, limit ? parseInt(limit, 10) : 200)
  }

  @Delete('chat-messages/:id')
  deleteChatMessage(@Param('id') id: string) {
    return this.admin.deleteChatMessage(parseInt(id, 10))
  }
}
