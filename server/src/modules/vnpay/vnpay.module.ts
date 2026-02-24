import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { DepositEntity } from '../../database/entities/deposit.entity'
import { VnpayService } from './vnpay.service'
import { VnpayController } from './vnpay.controller'
import { WalletModule } from '../wallet/wallet.module'
import { SecurityConfirmationModule } from '../security-confirmation/security-confirmation.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([DepositEntity]),
    WalletModule,
    SecurityConfirmationModule,
  ],
  controllers: [VnpayController],
  providers: [VnpayService],
})
export class VnpayModule {}
