import { Body, Controller, Get, Post } from '@nestjs/common'
import { MarketService } from './market.service'

@Controller('market')
export class MarketController {
  constructor(private readonly market: MarketService) {}

  @Get('prices')
  prices() {
    return this.market.getAllPrices()
  }

  @Post('price')
  async setPrice(@Body() body: { symbol: string; price: number }) {
    return this.market.setPrice(body.symbol, body.price)
  }
}

