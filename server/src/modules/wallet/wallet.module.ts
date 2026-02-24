import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { WalletEntity } from '../../database/entities/wallet.entity'
import { WalletService } from './wallet.service'
import { WalletController } from './wallet.controller'
import { UserModule } from '../user/user.module'
import { EventsModule } from '../events/events.module'

@Module({
  imports: [TypeOrmModule.forFeature([WalletEntity]), UserModule, EventsModule],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService],
})
export class WalletModule {}

