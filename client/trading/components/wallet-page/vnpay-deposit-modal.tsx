'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createVnpayDeposit, getSecurityConfirmationStatus } from '@/lib/api'

const PRESET_AMOUNTS = [50_000, 100_000, 200_000, 500_000, 1_000_000]

export default function VnpayDepositModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void
  onSuccess?: () => void
}) {
  const [securityChecked, setSecurityChecked] = useState(false)
  const [securityConfirmed, setSecurityConfirmed] = useState(false)
  const [amount, setAmount] = useState<string>('100000')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null)

  useEffect(() => {
    getSecurityConfirmationStatus()
      .then((r) => {
        setSecurityConfirmed(r.confirmed)
        setSecurityChecked(true)
      })
      .catch(() => {
        setSecurityConfirmed(false)
        setSecurityChecked(true)
      })
  }, [])

  const handleCreate = async () => {
    const n = parseInt(amount.replace(/\D/g, ''), 10)
    if (!Number.isFinite(n) || n < 1000) {
      setError('Số tiền tối thiểu 1.000 VND')
      return
    }
    if (n > 50_000_000) {
      setError('Số tiền tối đa 50.000.000 VND')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const res = await createVnpayDeposit(n)
      setPaymentUrl(res.paymentUrl)
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('vnpay_orderId', res.orderId)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tạo phiên thanh toán thất bại')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenVnpay = () => {
    if (paymentUrl) {
      window.location.href = paymentUrl
    }
  }

  if (paymentUrl) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
        <div
          className="max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-bold">Chuyển đến VNPay</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Bạn sẽ được chuyển sang trang thanh toán VNPay. Sau khi thanh toán xong, bạn sẽ quay lại trang Ví.
          </p>
          <div className="mt-6 flex gap-2">
            <button
              onClick={handleOpenVnpay}
              className="flex-1 rounded-lg bg-[#0066B3] px-4 py-3 font-semibold text-white hover:opacity-90"
            >
              Mở VNPay
            </button>
            <button
              onClick={() => {
                setPaymentUrl(null)
                onSuccess?.()
                onClose()
              }}
              className="rounded-lg border border-border px-4 py-3 font-medium hover:bg-muted"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!securityChecked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
        <div
          className="max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-muted-foreground">Đang kiểm tra...</div>
          <button onClick={onClose} className="mt-4 rounded-lg border border-border px-4 py-2 font-medium hover:bg-muted">
            Hủy
          </button>
        </div>
      </div>
    )
  }

  if (!securityConfirmed) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
        <div
          className="max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="text-lg font-bold">Cần xác nhận bảo mật</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Để nạp tiền vào tài khoản real, bạn cần hoàn thành <strong>Xác nhận bảo mật</strong> tại Hồ sơ cá nhân (địa chỉ, CCCD, tài khoản ngân hàng, v.v.) trước.
          </p>
          <div className="mt-6 flex gap-2">
            <Link
              href="/?main=profile"
              className="flex-1 rounded-lg bg-primary px-4 py-3 font-semibold text-primary-foreground text-center hover:opacity-90"
              onClick={onClose}
            >
              Đi tới Hồ sơ
            </Link>
            <button
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-3 font-medium hover:bg-muted"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-lg font-bold">Nạp tiền bằng VNPay</h3>
        <p className="mt-1 text-sm text-muted-foreground">Chọn hoặc nhập số tiền VND cần nạp</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {PRESET_AMOUNTS.map((a) => (
            <button
              key={a}
              onClick={() => setAmount(String(a))}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                amount === String(a) ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted'
              }`}
            >
              {(a / 1000).toFixed(0)}K
            </button>
          ))}
        </div>

        <div className="mt-4">
          <label className="block text-sm font-medium text-muted-foreground">Số tiền (VND)</label>
          <input
            type="text"
            inputMode="numeric"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
            placeholder="100000"
            className="mt-1 w-full rounded-lg border border-border bg-input px-3 py-2 text-foreground outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        {error && <p className="mt-2 text-sm text-red-500">{error}</p>}

        <div className="mt-6 flex gap-2">
          <button
            onClick={handleCreate}
            disabled={loading}
            className="flex-1 rounded-lg bg-[#0066B3] px-4 py-3 font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {loading ? 'Đang tạo...' : 'Tiếp tục'}
          </button>
          <button
            onClick={onClose}
            className="rounded-lg border border-border px-4 py-3 font-medium hover:bg-muted"
          >
            Hủy
          </button>
        </div>
      </div>
    </div>
  )
}
