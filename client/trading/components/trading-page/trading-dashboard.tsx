'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { User } from 'lucide-react'
import MarketList from './market-list'
import ChartArea from './chart-area'
import OrderPanel from './order-panel'
import PositionsTable from './positions-table'
import OrderHistory from './order-history'
import { closePosition, fetchOpenPositions, fetchOrders, fetchWalletBalances, updateStops } from '@/lib/api'
import type { ApiPosition, ApiOrder } from '@/lib/api'
import { sseUrl } from '@/lib/api'
import {
  ensureTradingAccountState,
  loadTradingAccountState,
  loadTradingPositionsState,
  creditSelectedAccountUsd,
  creditAccountUsd,
  removePositionMeta,
  subscribeTradingAccountState,
  subscribeTradeStateChange,
  type TradingAccountState,
} from '@/lib/trading-account'

interface Market {
  symbol: string
  price: number
  change: number
}

interface TradingDashboardProps {
  onNavigateToProfile?: () => void
  onNavigateToLanding?: () => void
}

const MARKETS_DATA: { [key: string]: Market } = {
  BTCUSDT: { symbol: 'BTCUSDT', price: 42567.89, change: 2.45 },
  ETHUSDT: { symbol: 'ETHUSDT', price: 2245.67, change: -1.23 },
  BNBUSDT: { symbol: 'BNBUSDT', price: 612.45, change: 3.12 },
  XRPUSDT: { symbol: 'XRPUSDT', price: 2.34, change: -0.56 },
  ADAUSDT: { symbol: 'ADAUSDT', price: 0.89, change: 1.78 },
  SOLUSDT: { symbol: 'SOLUSDT', price: 178.23, change: 5.67 },
  EURUSDT: { symbol: 'EURUSDT', price: 1.0856, change: 0.23 },
  GBPUSDT: { symbol: 'GBPUSDT', price: 1.2678, change: -0.12 },
}

export default function TradingDashboard({ onNavigateToProfile, onNavigateToLanding }: TradingDashboardProps) {
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT')
  const [selectedPositionId, setSelectedPositionId] = useState<string | null>(null)
  const [positions, setPositions] = useState<ApiPosition[]>([])
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [lastPriceBySymbol, setLastPriceBySymbol] = useState<Record<string, number>>({})
  const [acct, setAcct] = useState<TradingAccountState>(() => loadTradingAccountState() ?? ensureTradingAccountState())
  const [posMeta, setPosMeta] = useState(() => loadTradingPositionsState())
  /** Số dư từ server: Demo (cập nhật thủ công) và Real (nạp VNPay). */
  const [serverDemoBalanceUsd, setServerDemoBalanceUsd] = useState<number | null>(null)
  const [serverRealBalanceUsd, setServerRealBalanceUsd] = useState<number | null>(null)

  useEffect(() => {
    const unsub = subscribeTradingAccountState((s) => setAcct(s))
    const unsub2 = subscribeTradeStateChange(() => setPosMeta(loadTradingPositionsState()))
    setAcct(loadTradingAccountState() ?? ensureTradingAccountState())
    setPosMeta(loadTradingPositionsState())
    return () => {
      unsub()
      unsub2()
    }
  }, [])

  const tradingBalanceUsd =
    acct.selected === 'demo'
      ? serverDemoBalanceUsd ?? acct.demoUsdBalance
      : serverRealBalanceUsd ?? acct.realUsdBalance
  const tradingAccountLabel = acct.selected === 'demo' ? 'Demo' : 'Real'

  /** Merge giá real-time từ chart vào positions để PnL hiển thị đúng */
  const positionsWithLivePrice = useMemo(() => {
    return positions.map((p) => {
      const livePrice = lastPriceBySymbol[p.symbol.toUpperCase()]
      if (typeof livePrice !== 'number' || !Number.isFinite(livePrice)) return p
      const qty = p.qty ?? p.lots
      const diff = p.side === 'buy' ? livePrice - p.entryPrice : p.entryPrice - livePrice
      const pnl = diff * qty
      const notional = Math.abs(p.entryPrice * qty) || 1
      const pnlPercent = (pnl / notional) * 100
      return { ...p, lastPrice: livePrice, pnl, pnlPercent }
    })
  }, [positions, lastPriceBySymbol])

  const tradingEquityUsd = useMemo(() => {
    if (acct.selected === 'demo') {
      const balance = serverDemoBalanceUsd ?? acct.demoUsdBalance ?? 0
      const unrealizedPnl = positionsWithLivePrice.reduce(
        (sum, p) => sum + (typeof p.pnl === 'number' && Number.isFinite(p.pnl) ? p.pnl : 0),
        0,
      )
      return balance + unrealizedPnl
    }
    let lockedPlusPnl = 0
    for (const p of positionsWithLivePrice) {
      const meta = posMeta[p.id]
      if (!meta || meta.account !== 'real') continue
      const pnl = typeof p.pnl === 'number' && Number.isFinite(p.pnl) ? p.pnl : 0
      lockedPlusPnl += (meta.lockedUsd || 0) + pnl
    }
    return (serverRealBalanceUsd ?? acct.realUsdBalance ?? 0) + lockedPlusPnl
  }, [acct.selected, acct.demoUsdBalance, acct.realUsdBalance, posMeta, positionsWithLivePrice, serverDemoBalanceUsd, serverRealBalanceUsd])

  const currentMarket = useMemo(() => {
    const fallback = MARKETS_DATA[selectedSymbol] || MARKETS_DATA['BTCUSDT']
    const last = lastPriceBySymbol[selectedSymbol]
    return { ...fallback, price: typeof last === 'number' ? last : fallback.price }
  }, [lastPriceBySymbol, selectedSymbol])

  const activePosition = useMemo(() => {
    if (!selectedPositionId) return null
    return positionsWithLivePrice.find((p) => p.id === selectedPositionId) ?? null
  }, [positionsWithLivePrice, selectedPositionId])

  const refreshInFlight = useRef<Promise<void> | null>(null)
  const refresh = async () => {
    if (refreshInFlight.current) return refreshInFlight.current
    refreshInFlight.current = (async () => {
      const [p, o, balances] = await Promise.all([
        fetchOpenPositions(),
        fetchOrders(),
        fetchWalletBalances(),
      ])
      setPositions(p)
      setOrders(o)
      setServerDemoBalanceUsd(balances.demo)
      setServerRealBalanceUsd(balances.real)
      setSelectedPositionId((prev) => {
        if (prev && p.some((x) => x.id === prev)) return prev
        const sameSymbol = p.find((x) => x.symbol.toUpperCase() === selectedSymbol.toUpperCase())
        return sameSymbol ? sameSymbol.id : null
      })
    })().finally(() => {
      refreshInFlight.current = null
    })
    return refreshInFlight.current
  }

  useEffect(() => {
    refresh().catch(() => {})
  }, [])

  useEffect(() => {
    // Push update channel from backend (SSE)
    const es = new EventSource(sseUrl())
    es.onmessage = () => {
      refresh().catch(() => {})
    }
    es.onerror = () => {
      // keep silent; browser will auto-retry
    }
    return () => es.close()
  }, [])

  return (
    <div className="flex flex-col h-screen bg-background text-foreground">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <h1 
          onClick={onNavigateToLanding}
          className={`text-xl font-bold ${onNavigateToLanding ? 'cursor-pointer hover:text-primary transition-colors' : ''}`}
        >
          Trading Platform
        </h1>
        <button
          onClick={onNavigateToProfile}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-card border border-border hover:bg-muted transition-colors"
        >
          <User size={20} />
          <span className="text-sm font-medium">Profile</span>
        </button>
      </div>

    <div className="flex h-screen bg-background text-foreground">
      {/* Left Sidebar - Market List */}
      <div className="w-64 flex-shrink-0 overflow-hidden">
        <MarketList selectedSymbol={selectedSymbol} onSelectMarket={setSelectedSymbol} />
      </div>

      {/* Center - Chart */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-hidden">
          <ChartArea
            symbol={selectedSymbol}
            activePosition={activePosition}
            tradingAccountLabel={tradingAccountLabel}
            tradingBalanceUsd={tradingBalanceUsd}
            tradingEquityUsd={tradingEquityUsd}
            onPrice={(sym, price) => {
              setLastPriceBySymbol((prev) => ({ ...prev, [sym]: price }))
              // refresh occasionally so PnL/SLTP updates reflect in tables
              // (SSE push will be added soon; this is safe fallback)
              refresh().catch(() => {})
            }}
            onUpdateStops={async (positionId, next) => {
              await updateStops(positionId, next)
              await refresh()
            }}
          />
        </div>

        {/* Bottom - Tables */}
        <div className="border-t border-border bg-background">
          <div className="max-h-60 overflow-y-auto p-6">
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-bold uppercase text-muted-foreground">
                Vị thế đang mở
              </h3>
              <PositionsTable
                positions={positionsWithLivePrice}
                selectedPositionId={selectedPositionId}
                onSelect={(id) => setSelectedPositionId(id)}
                onClose={async (id, position) => {
                  const meta = posMeta[id]
                  const res = await closePosition(id)
                  if (res && typeof res.pnl === 'number' && Number.isFinite(res.pnl)) {
                    const accountType = position.accountType === 'real' ? 'real' : 'demo'
                    const toCredit = (meta?.lockedUsd ?? 0) + res.pnl
                    creditAccountUsd(accountType, toCredit)
                    removePositionMeta(id)
                  }
                  await refresh()
                }}
              />
            </div>

            <div>
              <h3 className="mb-3 text-sm font-bold uppercase text-muted-foreground">
                Lịch sử lệnh
              </h3>
              <OrderHistory orders={orders} />
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Order Panel */}
      <div className="w-80 flex-shrink-0 overflow-hidden">
        <OrderPanel
          symbol={selectedSymbol}
          currentPrice={currentMarket.price}
          tradingAccountLabel={tradingAccountLabel}
          tradingBalanceUsd={tradingBalanceUsd}
          isDemoAccount={acct.selected === 'demo'}
          onOrderPlaced={async (createdPositionId) => {
            setSelectedPositionId(createdPositionId)
            await refresh()
          }}
        />
      </div>
    </div>
    </div>
  )
}
