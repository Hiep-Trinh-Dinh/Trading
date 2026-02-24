import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserEntity } from '../../database/entities/user.entity'
import { TradeHistoryEntity } from '../../database/entities/trade-history.entity'
import { ChatMessageEntity } from '../../database/entities/chat-message.entity'
import { WalletEntity } from '../../database/entities/wallet.entity'
import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, TradeHistoryEntity, ChatMessageEntity, WalletEntity]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
