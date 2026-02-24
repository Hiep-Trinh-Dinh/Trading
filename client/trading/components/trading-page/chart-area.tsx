'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { CandlestickSeries, createChart, type ISeriesApi, type UTCTimestamp } from 'lightweight-charts'
import type { ApiPosition } from '@/lib/api'
import { postPrice } from '@/lib/api'

const TIMEFRAMES = ['1m', '5m', '15m', '1h', '4h', '1d']

function hashStringToSeed(input: string) {
  // Simple deterministic hash -> uint32 seed
  let h = 2166136261
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed: number) {
  return function rand() {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const generateCandleData = (seed: number) => {
  const rand = mulberry32(seed)
  const data: Array<{
    open: number
    close: number
    high: number
    low: number
    volume: number
  }> = []
  let price = 42000
  for (let i = 0; i < 50; i++) {
    const volatility = rand() * 400 - 200
    const open = price
    const close = price + volatility
    const high = Math.max(open, close) + rand() * 200
    const low = Math.min(open, close) - rand() * 200
    data.push({ open, close, high, low, volume: rand() * 1000 })
    price = close
  }
  return data
}

interface ChartAreaProps {
  symbol: string
  activePosition?: ApiPosition | null
  tradingAccountLabel?: string
  tradingBalanceUsd?: number
  tradingEquityUsd?: number
  onUpdateStops?: (positionId: string, next: { stopLoss?: number | null; takeProfit?: number | null }) => void
  onPrice?: (symbol: string, price: number) => void
}

type BinanceKline = [
  number, // openTime
  string, // open
  string, // high
  string, // low
  string, // close
  string, // volume
  number, // closeTime
  string,
  string,
  string,
  string,
  string,
]

function tfToBinanceInterval(tf: string) {
  // Chart buttons are already aligned with Binance intervals
  return tf
}

function fmtPrice(v: number) {
  return v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function lotSizeForSymbol(symbol: string) {
  const s = symbol.toUpperCase()
  // Keep consistent with backend lotSize()
  if (
    s.endsWith('USDT') &&
    (s.startsWith('EUR') ||
      s.startsWith('GBP') ||
      s.startsWith('AUD') ||
      s.startsWith('NZD') ||
      s.startsWith('USD') ||
      s.startsWith('JPY'))
  ) {
    return 100_000
  }
  return 1
}

function pnlIfHit(p: ApiPosition, targetPrice: number) {
  const qty = p.lots * lotSizeForSymbol(p.symbol)
  const diff = p.side === 'buy' ? targetPrice - p.entryPrice : p.entryPrice - targetPrice
  const pnl = diff * qty
  const notional = Math.abs(p.entryPrice * qty) || 1
  const pnlPercent = (pnl / notional) * 100
  return { pnl, pnlPercent, qty }
}

export default function ChartArea({ symbol, activePosition, tradingAccountLabel, tradingBalanceUsd, tradingEquityUsd, onUpdateStops, onPrice }: ChartAreaProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h')
  const [hoverTooltip, setHoverTooltip] = useState<{
    kind: 'sl' | 'tp'
    x: number
    y: number
  } | null>(null)

  const interval = useMemo(() => tfToBinanceInterval(selectedTimeframe), [selectedTimeframe])
  const containerRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<ReturnType<typeof createChart> | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const wsRef = useRef<WebSocket | null>(null)
  const lastBarTimeRef = useRef<number | null>(null)
  const [hiLo, setHiLo] = useState<{ high: number; low: number } | null>(null)
  const priceLinesRef = useRef<{ entry?: any; sl?: any; tp?: any }>({})
  const dragRef = useRef<{ kind: 'sl' | 'tp' | null }>({ kind: null })
  const hoverRef = useRef<{ kind: 'sl' | 'tp' | null }>({ kind: null })
  const scrollOptsRef = useRef<{
    handleScroll: { mouseWheel: boolean; pressedMouseMove: boolean; horzTouchDrag: boolean; vertTouchDrag: boolean }
    handleScale: { axisPressedMouseMove: boolean; mouseWheel: boolean; pinch: boolean }
  } | null>(null)
  const lastSentRef = useRef<{ t: number; price: number }>({ t: 0, price: 0 })
  const stopUpdateTimerRef = useRef<number | null>(null)

  // Create chart once
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const chart = createChart(el, {
      autoSize: true,
      layout: { background: { color: 'transparent' }, textColor: '#8b949e' },
      grid: {
        vertLines: { color: 'rgba(48, 54, 61, 0.5)' },
        horzLines: { color: 'rgba(48, 54, 61, 0.5)' },
      },
      rightPriceScale: { borderColor: 'rgba(48, 54, 61, 0.8)' },
      timeScale: {
        borderColor: 'rgba(48, 54, 61, 0.8)',
        rightOffset: 6,
        barSpacing: 10,
        fixLeftEdge: true,
        fixRightEdge: false,
        lockVisibleTimeRangeOnResize: false,
      },
      crosshair: {
        mode: 1,
        vertLine: { color: 'rgba(88, 166, 255, 0.35)', width: 1 },
        horzLine: { color: 'rgba(88, 166, 255, 0.35)', width: 1 },
      },
      handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
      handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#10b981',
      downColor: '#ef4444',
      borderVisible: false,
      wickUpColor: '#10b981',
      wickDownColor: '#ef4444',
    })

    chartRef.current = chart
    seriesRef.current = series

    return () => {
      wsRef.current?.close()
      wsRef.current = null
      priceLinesRef.current = {}
      if (stopUpdateTimerRef.current) window.clearTimeout(stopUpdateTimerRef.current)
      stopUpdateTimerRef.current = null
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  // Draw/Update SL/TP lines for selected position
  useEffect(() => {
    const s = seriesRef.current
    if (!s) return

    // cleanup old
    if (priceLinesRef.current.entry) {
      s.removePriceLine(priceLinesRef.current.entry)
      priceLinesRef.current.entry = undefined
    }
    if (priceLinesRef.current.sl) {
      s.removePriceLine(priceLinesRef.current.sl)
      priceLinesRef.current.sl = undefined
    }
    if (priceLinesRef.current.tp) {
      s.removePriceLine(priceLinesRef.current.tp)
      priceLinesRef.current.tp = undefined
    }

    if (!activePosition || activePosition.symbol.toUpperCase() !== symbol.toUpperCase()) return

    const entry = activePosition.entryPrice
    const side = activePosition.side
    // Mặc định SL/TP theo hướng vào lệnh: Buy → SL dưới, TP trên; Sell → SL trên, TP dưới
    const defaultSlPrice = side === 'buy' ? entry * 0.98 : entry * 1.02
    const defaultTpPrice = side === 'buy' ? entry * 1.02 : entry * 0.98

    priceLinesRef.current.entry = s.createPriceLine({
      price: entry,
      color: 'rgba(148, 163, 184, 0.9)',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: `ENTRY (${side.toUpperCase()})`,
    })

    // Luôn hiển thị SL – dùng giá thật nếu có, không thì placeholder có thể kéo để đặt
    priceLinesRef.current.sl = s.createPriceLine({
      price: activePosition.stopLoss ?? defaultSlPrice,
      color: activePosition.stopLoss != null ? 'rgba(239, 68, 68, 0.95)' : 'rgba(239, 68, 68, 0.6)',
      lineWidth: 2,
      lineStyle: activePosition.stopLoss != null ? 0 : 2,
      axisLabelVisible: true,
      title: activePosition.stopLoss != null ? 'SL (drag)' : 'SL (kéo để đặt)',
    })

    // Luôn hiển thị TP – tương tự
    priceLinesRef.current.tp = s.createPriceLine({
      price: activePosition.takeProfit ?? defaultTpPrice,
      color: activePosition.takeProfit != null ? 'rgba(16, 185, 129, 0.95)' : 'rgba(16, 185, 129, 0.6)',
      lineWidth: 2,
      lineStyle: activePosition.takeProfit != null ? 0 : 2,
      axisLabelVisible: true,
      title: activePosition.takeProfit != null ? 'TP (drag)' : 'TP (kéo để đặt)',
    })
  }, [activePosition, symbol])

  // Enable dragging SL/TP by mouse near the price line
  useEffect(() => {
    const s = seriesRef.current
    const el = containerRef.current
    const chart = chartRef.current
    if (!s || !el) return

    const pxThreshold = 12

    const getKindAtY = (y: number): 'sl' | 'tp' | null => {
      if (!activePosition || activePosition.symbol.toUpperCase() !== symbol.toUpperCase()) return null
      const entry = activePosition.entryPrice
      const side = activePosition.side
      const defaultSl = side === 'buy' ? entry * 0.98 : entry * 1.02
      const defaultTp = side === 'buy' ? entry * 1.02 : entry * 0.98
      const slPrice = activePosition.stopLoss ?? defaultSl
      const tpPrice = activePosition.takeProfit ?? defaultTp
      let kind: 'sl' | 'tp' | null = null

      const ysl = s.priceToCoordinate(slPrice)
      if (ysl != null && Math.abs(ysl - y) <= pxThreshold) kind = 'sl'
      if (!kind) {
        const ytp = s.priceToCoordinate(tpPrice)
        if (ytp != null && Math.abs(ytp - y) <= pxThreshold) kind = 'tp'
      }
      return kind
    }

    const setChartInteractivity = (enabled: boolean) => {
      const c = chartRef.current
      if (!c) return
      if (!scrollOptsRef.current) {
        scrollOptsRef.current = {
          handleScroll: { mouseWheel: true, pressedMouseMove: true, horzTouchDrag: true, vertTouchDrag: false },
          handleScale: { axisPressedMouseMove: true, mouseWheel: true, pinch: true },
        }
      }
      c.applyOptions({
        handleScroll: enabled
          ? scrollOptsRef.current.handleScroll
          : { ...scrollOptsRef.current.handleScroll, pressedMouseMove: false, horzTouchDrag: false },
        handleScale: enabled ? scrollOptsRef.current.handleScale : { ...scrollOptsRef.current.handleScale, axisPressedMouseMove: false },
      })
    }

    const updateCursor = (kind: 'sl' | 'tp' | null, dragging: boolean) => {
      const next = dragging ? 'ns-resize' : kind ? 'ns-resize' : 'default'
      if (el.style.cursor !== next) el.style.cursor = next
      // Prevent touch scroll while dragging on touch devices
      el.style.touchAction = dragging ? 'none' : 'auto'
    }

    const onPointerDown = (ev: PointerEvent) => {
      if (!activePosition || activePosition.symbol.toUpperCase() !== symbol.toUpperCase()) return
      if (ev.button != null && ev.button !== 0) return // left click only
      const rect = el.getBoundingClientRect()
      const y = ev.clientY - rect.top
      const kind = getKindAtY(y)
      if (!kind) return

      dragRef.current.kind = kind
      setHoverTooltip(null)
      try {
        el.setPointerCapture(ev.pointerId)
      } catch {}
      setChartInteractivity(false)
      updateCursor(kind, true)
      ev.preventDefault()
      ev.stopPropagation()
    }

    const onPointerMove = (ev: PointerEvent) => {
      const kind = dragRef.current.kind
      const rect = el.getBoundingClientRect()
      const y = ev.clientY - rect.top
      const x = ev.clientX - rect.left

      if (!kind) {
        const hovered = getKindAtY(y)
        if (hoverRef.current.kind !== hovered) hoverRef.current.kind = hovered
        updateCursor(hovered, false)
        if (hovered === 'sl' || hovered === 'tp') setHoverTooltip({ kind: hovered, x, y })
        else setHoverTooltip(null)
        return
      }
      if (!activePosition) return
      const p = s.coordinateToPrice(y)
      if (p == null) return
      const nextPrice = Number(p)
      if (!Number.isFinite(nextPrice) || nextPrice <= 0) return

      // Update local line immediately for smooth drag
      if (kind === 'sl' && priceLinesRef.current.sl) {
        try {
          priceLinesRef.current.sl.applyOptions({ price: nextPrice })
        } catch {}
      }
      if (kind === 'tp' && priceLinesRef.current.tp) {
        try {
          priceLinesRef.current.tp.applyOptions({ price: nextPrice })
        } catch {}
      }

      // Debounced backend update
      if (stopUpdateTimerRef.current) window.clearTimeout(stopUpdateTimerRef.current)
      stopUpdateTimerRef.current = window.setTimeout(() => {
        if (!activePosition) return
        onUpdateStops?.(activePosition.id, kind === 'sl' ? { stopLoss: nextPrice } : { takeProfit: nextPrice })
      }, 150)

      ev.preventDefault()
      ev.stopPropagation()
    }

    const onPointerUp = (ev: PointerEvent) => {
      const wasDragging = dragRef.current.kind != null
      dragRef.current.kind = null
      if (wasDragging) {
        setChartInteractivity(true)
        updateCursor(null, false)
      }
      try {
        el.releasePointerCapture(ev.pointerId)
      } catch {}
    }

    // Ensure we can prevent default gestures on touch
    el.style.touchAction = 'auto'

    el.addEventListener('pointerdown', onPointerDown)
    el.addEventListener('pointermove', onPointerMove)
    el.addEventListener('pointerup', onPointerUp)
    el.addEventListener('pointercancel', onPointerUp)
    return () => {
      el.removeEventListener('pointerdown', onPointerDown)
      el.removeEventListener('pointermove', onPointerMove)
      el.removeEventListener('pointerup', onPointerUp)
      el.removeEventListener('pointercancel', onPointerUp)
      // Restore chart interactivity if unmount during drag
      setChartInteractivity(true)
      el.style.cursor = 'default'
      el.style.touchAction = 'auto'
      setHoverTooltip(null)
    }
  }, [activePosition, onUpdateStops, symbol])

  // Load history + subscribe realtime on (symbol, interval) change
  useEffect(() => {
    const series = seriesRef.current
    const chart = chartRef.current
    if (!series || !chart) return

    // Narrow types for nested async callbacks
    const s = series
    const c = chart

    let cancelled = false
    const ac = new AbortController()

    async function load() {
      // Start with BTCUSDT as requested; other symbols still work if passed in.
      const sym = (symbol || 'BTCUSDT').toUpperCase()
      const url = `https://api.binance.com/api/v3/klines?symbol=${encodeURIComponent(sym)}&interval=${encodeURIComponent(
        interval
      )}&limit=500`

      const res = await fetch(url, { signal: ac.signal })
      if (!res.ok) throw new Error(`Failed to fetch klines: ${res.status}`)
      const klines = (await res.json()) as BinanceKline[]
      if (cancelled) return

      const data = klines.map((k) => ({
        time: Math.floor(k[0] / 1000) as UTCTimestamp,
        open: Number(k[1]),
        high: Number(k[2]),
        low: Number(k[3]),
        close: Number(k[4]),
      }))

      const highs = data.map((d) => d.high)
      const lows = data.map((d) => d.low)
      const high = Math.max(...highs)
      const low = Math.min(...lows)
      setHiLo({ high, low })

      s.setData(data)
      c.timeScale().fitContent()
      lastBarTimeRef.current = data.length ? (data[data.length - 1]!.time as unknown as number) : null

      // Reconnect websocket
      wsRef.current?.close()
      wsRef.current = null

      const stream = `${sym.toLowerCase()}@kline_${interval}`
      const ws = new WebSocket(`wss://stream.binance.com:9443/ws/${stream}`)
      wsRef.current = ws

      ws.onmessage = (evt) => {
        if (cancelled) return
        try {
          const msg = JSON.parse(evt.data as string)
          const k = msg?.k
          if (!k) return
          const t = Math.floor(Number(k.t) / 1000)
          const bar = {
            time: t as UTCTimestamp,
            open: Number(k.o),
            high: Number(k.h),
            low: Number(k.l),
            close: Number(k.c),
          }

          // update or append
          s.update(bar)
          lastBarTimeRef.current = t

          // Gửi low, high, close để TP/SL không bỏ lỡ khi giá chạm trong nến (chỉ close thì có thể miss)
          const nowTs = Date.now()
          const shouldSend = nowTs - lastSentRef.current.t > 500 || Math.abs(bar.close - lastSentRef.current.price) / (bar.close || 1) > 0.0005
          if (shouldSend) {
            lastSentRef.current = { t: nowTs, price: bar.close }
            onPrice?.(sym, bar.close)
            // Gửi tuần tự: nến giảm (close < open) → low trước (SELL TP hit trước); nến tăng → high trước (BUY TP hit trước)
            const sendPrices = async () => {
              if (bar.close < bar.open) {
                await postPrice(sym, bar.low).catch(() => {})
                await postPrice(sym, bar.high).catch(() => {})
              } else {
                await postPrice(sym, bar.high).catch(() => {})
                await postPrice(sym, bar.low).catch(() => {})
              }
              await postPrice(sym, bar.close).catch(() => {})
            }
            sendPrices()
          }

          setHiLo((prev) => {
            const nextHigh = prev ? Math.max(prev.high, bar.high) : bar.high
            const nextLow = prev ? Math.min(prev.low, bar.low) : bar.low
            return { high: nextHigh, low: nextLow }
          })
        } catch {
          // ignore malformed messages
        }
      }
    }

    load().catch(() => {
      // keep UI alive even if Binance is blocked/unreachable
    })

    return () => {
      cancelled = true
      ac.abort()
      wsRef.current?.close()
      wsRef.current = null
    }
  }, [symbol, interval])

  return (
    <div className="flex flex-col border-r border-border bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl font-bold text-foreground">{symbol}</h2>
          {(typeof tradingBalanceUsd === 'number' || typeof tradingEquityUsd === 'number') && (
            <span className="rounded-full border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
              {tradingAccountLabel ? `${tradingAccountLabel} • ` : ''}
              {typeof tradingBalanceUsd === 'number' ? (
                <>
                  Balance: ${tradingBalanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </>
              ) : (
                <>Balance: —</>
              )}
              {typeof tradingEquityUsd === 'number' && (
                <>
                  {' '}
                  • Equity: ${tradingEquityUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </>
              )}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf}
              onClick={() => setSelectedTimeframe(tf)}
              className={`rounded px-3 py-1 text-xs font-semibold transition-colors ${
                selectedTimeframe === tf
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-input'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 bg-input rounded-lg p-4 relative overflow-hidden min-h-[500px]">
        <div ref={containerRef} className="absolute inset-0" />
        {hoverTooltip &&
          activePosition &&
          activePosition.symbol.toUpperCase() === symbol.toUpperCase() && (
            <div
              className="pointer-events-none absolute z-10 rounded-lg border border-border bg-card/95 px-3 py-2 text-xs text-foreground shadow-lg"
              style={{
                left: Math.min(Math.max(hoverTooltip.x + 12, 8), 420),
                top: Math.min(Math.max(hoverTooltip.y - 18, 8), 460),
                backdropFilter: 'blur(6px)',
              }}
            >
              {(() => {
                const kind = hoverTooltip.kind
                const entry = activePosition.entryPrice
                const side = activePosition.side
                const defaultSl = side === 'buy' ? entry * 0.98 : entry * 1.02
                const defaultTp = side === 'buy' ? entry * 1.02 : entry * 0.98
                const target = kind === 'sl'
                  ? (activePosition.stopLoss ?? defaultSl)
                  : (activePosition.takeProfit ?? defaultTp)
                const { pnl, pnlPercent } = pnlIfHit(activePosition, target)
                const sign = pnl >= 0 ? '+' : ''
                return (
                  <div className="space-y-1">
                    <div className="font-semibold">
                      {kind.toUpperCase()}: ${fmtPrice(target)}
                    </div>
                    <div className={pnl >= 0 ? 'text-chart-1' : 'text-chart-5'}>
                      {pnl >= 0 ? 'Nếu ăn' : 'Nếu thua'}: {sign}${fmtPrice(Math.abs(pnl))}
                      <span className="text-muted-foreground"> ({sign}{pnlPercent.toFixed(2)}%)</span>
                    </div>
                  </div>
                )
              })()}
            </div>
          )}
      </div>

      <div className="mt-4 text-right text-sm text-muted-foreground">
        <div>
          Cao: <span className="text-foreground">${hiLo ? fmtPrice(hiLo.high) : '—'}</span>
        </div>
        <div>
          Thấp: <span className="text-foreground">${hiLo ? fmtPrice(hiLo.low) : '—'}</span>
        </div>
      </div>
    </div>
  )
}
