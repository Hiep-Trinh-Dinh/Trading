import { NestFactory } from '@nestjs/core'
import { ValidationPipe } from '@nestjs/common'
import { AppModule } from './app.module'
import { DataSource } from 'typeorm'
import { VnpayService } from './modules/vnpay/vnpay.service'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )
  // Production: set CORS_ORIGIN to allowed origins (e.g. "https://your-frontend.com")
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean) ?? true,
    credentials: false,
  })

  const dataSource = app.get(DataSource)

  try {
    if (dataSource.isInitialized) {
      console.log('✅ Database connected successfully')
    } else {
      await dataSource.initialize()
      console.log('✅ Database connected successfully')
    }
  } catch (error) {
    console.error('❌ Database connection failed')
    console.error(error)
    process.exit(1)
  }

  const port = Number(process.env.PORT) || 3001
  await app.listen(port)
  console.log(`🚀 Server running on port ${port}`)

  const vnpayReady =
    (process.env.VNPAY_TMN_CODE || process.env.tanCode) &&
    (process.env.VNPAY_SECURE_SECRET || process.env.secureSecret)
  if (vnpayReady) {
    const vnpay = app.get(VnpayService)
    const returnUrl = vnpay.getConfiguredReturnUrl()
    console.log('✅ Cổng thanh toán VNPay đã sẵn sàng')
    console.log(`   Return URL: ${returnUrl}`)
  } else {
    console.log('⚠️  Cổng thanh toán VNPay chưa được cấu hình (VNPAY_TMN_CODE, VNPAY_SECURE_SECRET)')
  }
}

bootstrap().catch((err) => {
  console.error('❌ Server khởi động thất bại')
  console.error(err)
  process.exit(1)
})