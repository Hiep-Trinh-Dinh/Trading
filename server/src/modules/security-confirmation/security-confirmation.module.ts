import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SecurityConfirmationEntity } from '../../database/entities/security-confirmation.entity'
import { SecurityConfirmationService } from './security-confirmation.service'
import { SecurityConfirmationController } from './security-confirmation.controller'

@Module({
  imports: [TypeOrmModule.forFeature([SecurityConfirmationEntity])],
  controllers: [SecurityConfirmationController],
  providers: [SecurityConfirmationService],
  exports: [SecurityConfirmationService],
})
export class SecurityConfirmationModule {}
