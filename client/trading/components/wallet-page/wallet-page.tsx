'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { ensureDemoSession, loadDemoSession, resetDemoSession, type DemoWalletAsset } from '@/lib/demo-session'
import {
  ensureTradingAccountState,
  loadTradingAccountState,
  setDemoUsdBalance,
  setRealUsdBalance,
  setSelectedTradingAccount,
  type TradingAccountType,
} from '@/lib/trading-account'
import {
  fetchWalletBalances,
  resetDemoWallet,
  setDemoWalletBalance,
  getVnpayDepositStatus,
  confirmVnpayReturn,
  confirmVnpayReturnPublic,
} from '@/lib/api'
import VnpayDepositModal from './vnpay-deposit-modal'

interface WalletAsset {
  symbol: string
  amount: number
  price: number
  value: number
}

function toWalletAssets(assets: DemoWalletAsset[]): WalletAsset[] {
  return assets.map((a) => ({
    symbol: a.symbol,
    amount: a.amount,
    price: a.price,
    value: a.amount * a.price,
  }))
}

const INITIAL_DEMO_USD = 25_000

export default function WalletDashboard() {
  // Avoid hydration mismatch: wallet state depends on client-only storage/network.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const searchParams = useSearchParams()
  const session = loadDemoSession() ?? ensureDemoSession()
  const [assets, setAssets] = useState<WalletAsset[]>(toWalletAssets(session.wallet.assets))
  const [acct, setAcct] = useState(() => loadTradingAccountState() ?? ensureTradingAccountState({ demoUsdBalance: INITIAL_DEMO_USD }))
  const [serverDemoBalanceUsd, setServerDemoBalanceUsd] = useState<number | null>(null)
  const [serverRealBalanceUsd, setServerRealBalanceUsd] = useState<number | null>(null)
  const [demoEdit, setDemoEdit] = useState<string>(() => String(acct.demoUsdBalance))
  const [resetting, setResetting] = useState(false)
  const [applying, setApplying] = useState(false)
  const [vnpayModalOpen, setVnpayModalOpen] = useState(false)
  const [vnpayReturnStatus, setVnpayReturnStatus] = useState<'pending' | 'success' | 'failed' | null>(null)
  const [vnpayReturnAmount, setVnpayReturnAmount] = useState<number | null>(null)
  const totalBalance = assets.reduce((sum, asset) => sum + asset.value, 0)
  const usdBalance = assets.find((a) => a.symbol === 'USD')?.amount || 0
  const cryptoAssetsValue = totalBalance - usdBalance
  const demoBalanceDisplay = serverDemoBalanceUsd ?? acct.demoUsdBalance
  const realBalanceDisplay = serverRealBalanceUsd ?? acct.realUsdBalance
  const selectedBalance = acct.selected === 'demo' ? demoBalanceDisplay : realBalanceDisplay

  const refreshBalances = async () => {
    try {
      const { demo, real } = await fetchWalletBalances()
      setServerDemoBalanceUsd(demo)
      setServerRealBalanceUsd(real)
      setDemoEdit(String(demo))
      setDemoUsdBalance(demo)
      setRealUsdBalance(real)
      setAcct(loadTradingAccountState() ?? ensureTradingAccountState())
    } catch {
      setServerDemoBalanceUsd(null)
      setServerRealBalanceUsd(null)
    }
  }

  useEffect(() => {
    refreshBalances()
  }, [])

  // Handle return from VNPay payment
  useEffect(() => {
    const vnpayReturn = searchParams.get('vnpay')
    if (vnpayReturn !== 'return') return

    const orderIdFromUrl = searchParams.get('vnp_TxnRef') ?? searchParams.get('orderId')
    const orderIdFromStorage = typeof window !== 'undefined' ? sessionStorage.getItem('vnpay_orderId') : null
    const orderId = orderIdFromUrl || orderIdFromStorage
    if (!orderId) {
      setVnpayReturnStatus('pending')
      return
    }

    const run = async () => {
      try {
        // Gửi toàn bộ query VNPay lên backend để xác nhận (trường hợp IPN chưa/không gọi được)
        const queryObj: Record<string, string> = {}
        searchParams.forEach((value, key) => {
          // VNPay signature only covers vnp_* params; avoid adding extra keys like `vnpay=return`.
          if (key.startsWith('vnp_')) queryObj[key] = value
        })
        if (Object.keys(queryObj).length > 0) {
          // Prefer authenticated confirm; fallback to public confirm when token/session missing.
          let confirmRes: { ok: boolean; status: string; amountUsd?: number } | null = null
          try {
            confirmRes = await confirmVnpayReturn(queryObj)
          } catch {
            confirmRes = await confirmVnpayReturnPublic(queryObj)
          }
          if (confirmRes.ok && confirmRes.status === 'success') {
            setVnpayReturnStatus('success')
            setVnpayReturnAmount(confirmRes.amountUsd ?? null)
            if (typeof window !== 'undefined') sessionStorage.removeItem('vnpay_orderId')
            refreshBalances()
            setAcct(loadTradingAccountState() ?? ensureTradingAccountState())
            return
          }
        }

        const res = await getVnpayDepositStatus(orderId)
        if (res.status === 'success') {
          setVnpayReturnStatus('success')
          setVnpayReturnAmount(res.amountUsd ?? null)
          if (typeof window !== 'undefined') sessionStorage.removeItem('vnpay_orderId')
          refreshBalances()
          setAcct(loadTradingAccountState() ?? ensureTradingAccountState())
          return
        }
        if (res.status === 'failed') {
          setVnpayReturnStatus('failed')
          if (typeof window !== 'undefined') sessionStorage.removeItem('vnpay_orderId')
          return
        }
        setTimeout(run, 2000)
      } catch {
        setTimeout(run, 2000)
      }
    }
    run()
  }, [searchParams])

  useEffect(() => {
    if (serverDemoBalanceUsd != null) setDemoEdit(String(serverDemoBalanceUsd))
  }, [serverDemoBalanceUsd])

  const handleResetBalance = async () => {
    try {
      setResetting(true)
      const res = await resetDemoWallet()
      setServerDemoBalanceUsd(res.amount)
      setDemoEdit(String(res.amount))
      setDemoUsdBalance(res.amount)
      setAcct(loadTradingAccountState() ?? ensureTradingAccountState())
      const next = resetDemoSession()
      setAssets(toWalletAssets(next.wallet.assets))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Reset thất bại')
    } finally {
      setResetting(false)
    }
  }

  const pickAccount = (t: TradingAccountType) => {
    setSelectedTradingAccount(t)
    setAcct(loadTradingAccountState() ?? ensureTradingAccountState())
  }

  const applyDemoBalance = async () => {
    const n = Number(demoEdit)
    if (!Number.isFinite(n) || n < 0) {
      alert('Số tiền không hợp lệ')
      return
    }
    try {
      setApplying(true)
      const res = await setDemoWalletBalance(n)
      setServerDemoBalanceUsd(res.amount)
      setDemoUsdBalance(res.amount)
      setAcct(loadTradingAccountState() ?? ensureTradingAccountState())
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Cập nhật thất bại')
    } finally {
      setApplying(false)
    }
  }

  const accountBadge = useMemo(() => {
    return acct.selected === 'demo'
      ? { label: 'Demo', cls: 'bg-blue-500/10 text-blue-300 border-blue-500/20' }
      : { label: 'Real', cls: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' }
  }, [acct.selected])

  if (!mounted) {
    return (
      <main className="min-h-screen bg-background text-foreground dark">
        <div className="mx-auto max-w-7xl px-6 py-8">
          <div className="flex min-h-[40vh] items-center justify-center text-muted-foreground">Đang tải...</div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background text-foreground dark">
      <div className="mx-auto max-w-7xl px-6 py-8">
        {/* VNPay return banner */}
        {vnpayReturnStatus && (
          <div
            className={`mb-6 rounded-lg border px-6 py-4 ${
              vnpayReturnStatus === 'success'
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : vnpayReturnStatus === 'failed'
                  ? 'border-red-500/30 bg-red-500/10 text-red-300'
                  : 'border-blue-500/30 bg-blue-500/10 text-blue-300'
            }`}
          >
            {vnpayReturnStatus === 'success' && (
              <p className="font-medium">
                Nạp tiền thành công! +${vnpayReturnAmount?.toFixed(2) ?? '0.00'} USD đã được cộng vào ví.
              </p>
            )}
            {vnpayReturnStatus === 'failed' && <p className="font-medium">Thanh toán thất bại hoặc đã bị hủy.</p>}
            {vnpayReturnStatus === 'pending' && <p className="font-medium">Đang xử lý thanh toán...</p>}
          </div>
        )}

        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold">Ví</h1>
            <p className="mt-2 text-muted-foreground">Chọn tài khoản giao dịch và quản lý số dư</p>
          </div>
          <Link
            href="/?main=profile"
            className="inline-flex items-center gap-2 rounded-lg bg-card border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
          >
            Quay lại hồ sơ
          </Link>
        </div>

        {/* Trading Account Selector */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Demo account */}
          <div className={`rounded-lg border border-border bg-card p-6 ${acct.selected === 'demo' ? 'ring-2 ring-primary' : ''}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold uppercase text-muted-foreground">Tài khoản Demo</span>
                  <span className="rounded-full border px-2 py-0.5 text-xs font-semibold bg-blue-500/10 text-blue-300 border-blue-500/20">
                    Có thể chỉnh
                  </span>
                </div>
                <div className="mt-2 text-3xl font-bold text-foreground">
                  ${(demoBalanceDisplay ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Số dư này sẽ dùng để giao dịch khi bạn chọn Demo.</p>
              </div>
              <button
                onClick={() => pickAccount('demo')}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  acct.selected === 'demo' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-input'
                }`}
              >
                Dùng để giao dịch
              </button>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
              <input
                type="number"
                min={0}
                step="0.01"
                value={demoEdit}
                onChange={(e) => setDemoEdit(e.target.value)}
                className="w-full rounded-lg bg-input px-3 py-2 text-sm text-foreground outline-none ring-ring focus:ring-2"
                placeholder="Nhập số dư demo (USD)"
              />
              <button
                onClick={applyDemoBalance}
                disabled={applying}
                className="rounded-lg bg-card border border-border px-4 py-2 text-sm font-semibold hover:bg-muted transition-colors disabled:opacity-50"
              >
                {applying ? 'Đang cập nhật...' : 'Cập nhật'}
              </button>
            </div>
          </div>

          {/* Real account */}
          <div className={`rounded-lg border border-border bg-card p-6 ${acct.selected === 'real' ? 'ring-2 ring-primary' : ''}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold uppercase text-muted-foreground">Tài khoản Real</span>
                  <span className="rounded-full border px-2 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
                    Nạp tiền
                  </span>
                </div>
                <div className="mt-2 text-3xl font-bold text-foreground">
                  ${realBalanceDisplay.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">Nạp VND qua VNPay, quy đổi sang USD (tỷ giá ~24.000 VND/USD).</p>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setVnpayModalOpen(true)}
                  className="rounded-lg bg-[#0066B3] px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                >
                  Nạp tiền VNPay
                </button>
                <button
                  onClick={() => pickAccount('real')}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    acct.selected === 'real' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:bg-input'
                  }`}
                >
                  Dùng để giao dịch
                </button>
              </div>
            </div>
          </div>
        </div>

        {vnpayModalOpen && (
          <VnpayDepositModal
            onClose={() => setVnpayModalOpen(false)}
            onSuccess={() => {
              refreshBalances()
              setAcct(loadTradingAccountState() ?? ensureTradingAccountState())
            }}
          />
        )}

        {/* Selected summary */}
        <div className={`mb-8 rounded-lg border px-6 py-4 ${accountBadge.cls}`}>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm">
              Đang chọn giao dịch: <span className="font-semibold">{accountBadge.label}</span>
            </div>
            <div className="text-sm">
              Số dư giao dịch: <span className="font-semibold">${selectedBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            </div>
            <Link href="/?main=dashboard" className="text-sm font-semibold underline underline-offset-4">
              Đi tới Trading
            </Link>
          </div>
        </div>

        {/* Assets Table Section */}
        <div className="mb-8 rounded-lg border border-border bg-card">
          <div className="border-b border-border px-6 py-4">
            <h2 className="text-lg font-bold">Your Assets</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted">
                  <th className="px-6 py-3 text-left font-semibold text-foreground">Asset</th>
                  <th className="px-6 py-3 text-right font-semibold text-foreground">Amount</th>
                  <th className="px-6 py-3 text-right font-semibold text-foreground">Price</th>
                  <th className="px-6 py-3 text-right font-semibold text-foreground">Value</th>
                  <th className="px-6 py-3 text-right font-semibold text-foreground">% of Portfolio</th>
                </tr>
              </thead>
              <tbody>
                {assets.map((asset) => {
                  const percentage = ((asset.value / totalBalance) * 100).toFixed(2)
                  return (
                    <tr key={asset.symbol} className="border-b border-border hover:bg-muted">
                      <td className="px-6 py-4 font-semibold text-foreground">{asset.symbol}</td>
                      <td className="px-6 py-4 text-right font-mono text-foreground">
                        {asset.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 8 })}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-foreground">
                        {asset.symbol === 'USD' ? '$' : ''}
                        {asset.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-semibold text-foreground">
                        ${asset.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-foreground">{percentage}%</td>
                    </tr>
                  )
                })}
                {/* Total Row */}
                <tr className="bg-muted font-semibold">
                  <td className="px-6 py-4 text-foreground">Total</td>
                  <td className="px-6 py-4 text-right text-foreground">-</td>
                  <td className="px-6 py-4 text-right text-foreground">-</td>
                  <td className="px-6 py-4 text-right font-mono text-foreground">
                    ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right text-foreground">100%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {assets.length === 0 && (
            <div className="px-6 py-12 text-center text-muted-foreground">
              <p>No assets in wallet</p>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="mb-8 rounded-lg border border-blue-500/30 bg-blue-500/5 px-6 py-4">
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Demo Trading Account:</span> This is a virtual trading
            account with $10,000 USD in demo balance. All assets and transactions are simulated. Reset your balance at
            any time using the button below to start fresh.
          </p>
        </div>

        {/* Reset Button */}
        <div className="flex justify-center">
          <button
            onClick={handleResetBalance}
            disabled={resetting}
            className="rounded-lg bg-destructive px-8 py-3 font-semibold text-white transition-opacity hover:opacity-90 active:opacity-75 disabled:opacity-50"
          >
            {resetting ? 'Đang reset...' : 'Reset Demo Balance'}
          </button>
        </div>
      </div>
    </main>
  )
}
