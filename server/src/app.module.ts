import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { typeOrmConfig } from './database/typeorm.config'
import { EventsModule } from './modules/events/events.module'
import { UserModule } from './modules/user/user.module'
import { WalletModule } from './modules/wallet/wallet.module'
import { MarketModule } from './modules/market/market.module'
import { TradeEngineModule } from './modules/trade-engine/trade-engine.module'
import { OrderModule } from './modules/order/order.module'
import { PositionModule } from './modules/position/position.module'
import { AuthModule } from './modules/auth/auth.module'
import { ChatModule } from './modules/chat/chat.module'
import { VnpayModule } from './modules/vnpay/vnpay.module'
import { SecurityConfirmationModule } from './modules/security-confirmation/security-confirmation.module'
import { AdminModule } from './modules/admin/admin.module'

@Module({
  imports: [
    TypeOrmModule.forRoot(typeOrmConfig),
    AuthModule,
    EventsModule,
    UserModule,
    WalletModule,
    MarketModule,
    TradeEngineModule,
    OrderModule,
    PositionModule,
    SecurityConfirmationModule,
    VnpayModule,
    ChatModule,
    AdminModule,
  ],
})
export class AppModule {}