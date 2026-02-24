'use client'

import { useState, useMemo } from 'react'
import { Search } from 'lucide-react'

interface Market {
  symbol: string
  price: number
  change: number
  name: string
}

const MARKETS: Market[] = [
  { symbol: 'BTCUSDT', name: 'Bitcoin', price: 42567.89, change: 2.45 },
  { symbol: 'ETHUSDT', name: 'Ethereum', price: 2245.67, change: -1.23 },
  { symbol: 'BNBUSDT', name: 'Binance Coin', price: 612.45, change: 3.12 },
  { symbol: 'XRPUSDT', name: 'Ripple', price: 2.34, change: -0.56 },
  { symbol: 'ADAUSDT', name: 'Cardano', price: 0.89, change: 1.78 },
  { symbol: 'SOLUSDT', name: 'Solana', price: 178.23, change: 5.67 },
  // Binance-compatible FX proxies (quoted in USDT)
  { symbol: 'EURUSDT', name: 'EUR/USDT', price: 1.0856, change: 0.23 },
  { symbol: 'GBPUSDT', name: 'GBP/USDT', price: 1.2678, change: -0.12 },
]

interface MarketListProps {
  selectedSymbol: string
  onSelectMarket: (symbol: string) => void
}

export default function MarketList({
  selectedSymbol,
  onSelectMarket,
}: MarketListProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredMarkets = useMemo(() => {
    return MARKETS.filter(
      (market) =>
        market.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        market.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  }, [searchQuery])

  return (
    <div className="flex h-full flex-col border-r border-border bg-card">
      <div className="border-b border-border p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Tìm kiếm thị trường..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg bg-input pl-10 pr-4 py-2 text-sm text-foreground placeholder-muted-foreground outline-none ring-ring focus:ring-2"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {filteredMarkets.map((market) => (
          <button
            key={market.symbol}
            onClick={() => onSelectMarket(market.symbol)}
            className={`w-full border-b border-border px-4 py-3 text-left transition-colors hover:bg-muted ${
              selectedSymbol === market.symbol ? 'bg-muted' : ''
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-foreground">{market.symbol}</div>
                <div className="text-xs text-muted-foreground">{market.name}</div>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between">
              <span className="font-mono text-sm text-foreground">
                ${market.price.toFixed(market.price < 10 ? 4 : 2)}
              </span>
              <span
                className={`text-xs font-semibold ${
                  market.change >= 0 ? 'text-chart-1' : 'text-chart-5'
                }`}
              >
                {market.change >= 0 ? '+' : ''}
                {market.change.toFixed(2)}%
              </span>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
