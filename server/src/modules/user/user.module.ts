import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { UserEntity } from '../../database/entities/user.entity'
import { WalletEntity } from '../../database/entities/wallet.entity'
import { UserService } from './user.service'
import { UserController } from './user.controller'

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, WalletEntity])],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}

