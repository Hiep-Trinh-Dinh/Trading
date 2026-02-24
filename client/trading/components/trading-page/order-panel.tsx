'use client'

import { useState } from 'react'
import { placeMarketOrder } from '@/lib/api'
import { deductSelectedAccountUsd, recordOpenPositionForSelectedAccount } from '@/lib/trading-account'

interface OrderPanelProps {
  symbol: string
  currentPrice: number
  tradingAccountLabel?: string
  tradingBalanceUsd?: number
  /** When true, balance is from server (demo); server deducts/credits margin. */
  isDemoAccount?: boolean
  onOrderPlaced?: (createdPositionId: string) => void
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

/** Match server: ký quỹ cố định 1 USD. */
function marginRequiredUsd(_notionalUsd: number): number {
  return 1
}

export default function OrderPanel({
  symbol,
  currentPrice,
  tradingAccountLabel,
  tradingBalanceUsd,
  isDemoAccount = false,
  onOrderPlaced,
}: OrderPanelProps) {
  const [orderType, setOrderType] = useState<'market' | 'limit'>('market')
  const [price, setPrice] = useState(currentPrice.toString())
  const [volume, setVolume] = useState('0.01')
  const [stopLoss, setStopLoss] = useState('')
  const [takeProfit, setTakeProfit] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const MIN_LOT = 0.01
  const volumeNum = parseFloat(volume) || 0
  const isValidVolume = volumeNum >= MIN_LOT
  const previewEntry = orderType === 'limit' ? parseFloat(price) || 0 : currentPrice
  const lotSize = lotSizeForSymbol(symbol)
  const qty = volumeNum * lotSize
  const notionalUsd = previewEntry * qty
  const requiredUsd = marginRequiredUsd(notionalUsd)
  const hasBalance = typeof tradingBalanceUsd === 'number'
  const enoughBalance = !hasBalance ? true : tradingBalanceUsd >= requiredUsd && tradingBalanceUsd > 0
  const hasStops = stopLoss.trim() !== '' && takeProfit.trim() !== ''
  const canSubmit = isValidVolume && previewEntry > 0 && enoughBalance && hasStops

  const handleVolumeChange = (value: string) => {
    const num = parseFloat(value)
    if (value === '' || (!isNaN(num) && num >= 0)) {
      setVolume(value)
    }
  }

  const handleOrder = async (side: 'buy' | 'sell') => {
    if (!isValidVolume) {
      alert(`Khối lượng tối thiểu là ${MIN_LOT} lot`)
      return
    }
    if (!Number.isFinite(previewEntry) || previewEntry <= 0) {
      alert('Giá vào không hợp lệ')
      return
    }
    if (hasBalance && (!Number.isFinite(tradingBalanceUsd!) || tradingBalanceUsd! <= 0)) {
      alert(`Số dư ${tradingAccountLabel ? `(${tradingAccountLabel}) ` : ''}đang là $0. Vui lòng nạp tiền hoặc đổi sang Demo.`)
      return
    }
    if (hasBalance && tradingBalanceUsd! < requiredUsd) {
      alert(
        `Không đủ số dư ${tradingAccountLabel ? `(${tradingAccountLabel}) ` : ''}để vào lệnh này.\n` +
          `Cần: $${requiredUsd.toFixed(2)} • Hiện có: $${tradingBalanceUsd!.toFixed(2)}.`,
      )
      return
    }
    if (!hasStops) {
      alert('Vui lòng đặt đầy đủ Stop Loss và Take Profit trước khi vào lệnh.')
      return
    }
    try {
      setSubmitting(true)
      const entry = orderType === 'limit' ? parseFloat(price) : currentPrice
      const usedNotionalUsd = Number(entry) * qty
      const usedRequiredUsd = marginRequiredUsd(usedNotionalUsd)
      const res = await placeMarketOrder({
        symbol,
        side,
        lots: volumeNum,
        entryPrice: entry,
        stopLoss: stopLoss ? parseFloat(stopLoss) : null,
        takeProfit: takeProfit ? parseFloat(takeProfit) : null,
        accountType: isDemoAccount ? 'demo' : 'real',
      })
      if (Number.isFinite(usedRequiredUsd) && usedRequiredUsd > 0) {
        deductSelectedAccountUsd(usedRequiredUsd)
        recordOpenPositionForSelectedAccount(res.position.id, usedRequiredUsd)
      }
      onOrderPlaced?.(res.position.id)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Đặt lệnh thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col border-l border-border bg-card p-6">
      <h3 className="mb-6 text-lg font-bold text-foreground">{symbol}</h3>

      {typeof tradingBalanceUsd === 'number' && (
        <div className="mb-6 rounded-lg border border-border bg-muted p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-xs text-muted-foreground">
              Số dư giao dịch {tradingAccountLabel ? `(${tradingAccountLabel})` : ''}
            </div>
            <div className="text-sm font-bold text-foreground">
              ${tradingBalanceUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
          </div>
        </div>
      )}

      {/* Order Type Selector */}
      <div className="mb-6">
        <label className="block text-xs font-semibold uppercase text-muted-foreground mb-2">
          Loại lệnh
        </label>
        <div className="flex gap-2">
          {(['market', 'limit'] as const).map((type) => (
            <button
              key={type}
              onClick={() => setOrderType(type)}
              className={`flex-1 rounded-lg py-2 text-sm font-semibold transition-colors ${
                orderType === type
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-input'
              }`}
            >
              {type === 'market' ? 'Thị trường' : 'Giới hạn'}
            </button>
          ))}
        </div>
      </div>

      {/* Price Input */}
      {orderType === 'limit' && (
        <div className="mb-4">
          <label className="block text-xs font-semibold uppercase text-muted-foreground mb-2">
            Giá (USDT)
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full rounded-lg bg-input px-3 py-2 text-sm text-foreground outline-none ring-ring focus:ring-2"
          />
        </div>
      )}

      {/* Volume Input */}
      <div className="mb-6">
        <label className="block text-xs font-semibold uppercase text-muted-foreground mb-2">
          Khối lượng ({symbol.slice(0, 3)}) <span className="text-muted-foreground/70">(Tối thiểu: {MIN_LOT})</span>
        </label>
        <input
          type="number"
          step="0.01"
          min={MIN_LOT}
          value={volume}
          onChange={(e) => handleVolumeChange(e.target.value)}
          className={`w-full rounded-lg bg-input px-3 py-2 text-sm text-foreground outline-none ring-ring focus:ring-2 ${
            !isValidVolume && volume !== '' ? 'ring-chart-5 ring-2' : ''
          }`}
        />
        {!isValidVolume && volume !== '' && (
          <p className="mt-1 text-xs text-chart-5">Khối lượng phải tối thiểu {MIN_LOT} lot</p>
        )}
      </div>

      {/* Stop Loss */}
      <div className="mb-4">
        <label className="block text-xs font-semibold uppercase text-muted-foreground mb-2">
          Dừng lỗ (Stop Loss) <span className="text-muted-foreground/70">(Bắt buộc)</span>
        </label>
        <input
          type="number"
          step="0.01"
          value={stopLoss}
          onChange={(e) => setStopLoss(e.target.value)}
          placeholder="Giá dừng lỗ"
          className="w-full rounded-lg bg-input px-3 py-2 text-sm text-foreground outline-none ring-ring focus:ring-2"
        />
      </div>

      {/* Take Profit */}
      <div className="mb-6">
        <label className="block text-xs font-semibold uppercase text-muted-foreground mb-2">
          Chốt lời (Take Profit) <span className="text-muted-foreground/70">(Bắt buộc)</span>
        </label>
        <input
          type="number"
          step="0.01"
          value={takeProfit}
          onChange={(e) => setTakeProfit(e.target.value)}
          placeholder="Giá chốt lời"
          className="w-full rounded-lg bg-input px-3 py-2 text-sm text-foreground outline-none ring-ring focus:ring-2"
        />
      </div>

      {/* Total */}
      <div className="mb-6 rounded-lg bg-muted p-3">
        <div className="text-xs text-muted-foreground">Ký quỹ (margin) / Notional</div>
        <div className="text-lg font-bold text-foreground">
          ${Number.isFinite(requiredUsd) ? requiredUsd.toFixed(2) : '—'}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Qty: {Number.isFinite(qty) ? qty.toLocaleString('en-US', { maximumFractionDigits: 8 }) : '—'} ({lotSize === 100_000 ? 'FX lot' : 'unit'})
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Notional: ${Number.isFinite(notionalUsd) ? notionalUsd.toFixed(2) : '—'}
        </div>
        {hasBalance && !enoughBalance && (
          <div className="mt-2 text-xs font-semibold text-chart-5">
            Không đủ số dư để vào lot này.
          </div>
        )}
      </div>

      {/* Buy/Sell Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => handleOrder('buy')}
          disabled={submitting || !canSubmit}
          className="flex-1 rounded-lg bg-chart-1 px-4 py-3 font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Đang gửi...' : 'Mua'}
        </button>
        <button
          onClick={() => handleOrder('sell')}
          disabled={submitting || !canSubmit}
          className="flex-1 rounded-lg bg-chart-5 px-4 py-3 font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Đang gửi...' : 'Bán'}
        </button>
      </div>

      {/* Additional Options */}
      <div className="mt-6 space-y-3 border-t border-border pt-6">
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-border bg-input"
            defaultChecked
          />
          <span className="text-sm text-muted-foreground">Chỉ đăng lệnh (Post-only)</span>
        </label>
        <label className="flex items-center gap-3">
          <input type="checkbox" className="h-4 w-4 rounded border-border bg-input" />
          <span className="text-sm text-muted-foreground">Chỉ giảm vị thế (Reduce only)</span>
        </label>
      </div>
    </div>
  )
}
