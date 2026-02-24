'use client'

import type { ApiOrder } from '@/lib/api'

function sideLabel(side: ApiOrder['side']) {
  return side === 'buy' ? 'Mua' : 'Bán'
}

function typeLabel(type: ApiOrder['type']) {
  return type === 'market' ? 'Thị trường' : 'Giới hạn'
}

function statusLabel(status: ApiOrder['status']) {
  if (status === 'filled') return 'Khớp'
  if (status === 'cancelled') return 'Đã hủy'
  return 'Đang chờ'
}

function statusClass(status: ApiOrder['status']) {
  if (status === 'filled') return 'bg-chart-1 bg-opacity-20 text-chart-1'
  if (status === 'cancelled') return 'bg-muted text-muted-foreground'
  return 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
}

function fmtTime(iso: string) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  const h = String(d.getHours()).padStart(2, '0')
  const m = String(d.getMinutes()).padStart(2, '0')
  return `${day}/${month}/${year} ${h}:${m}`
}

/** Short id for display (last 8 chars), full id in title. */
function shortId(id: string) {
  if (id.length <= 10) return id
  return `…${id.slice(-8)}`
}

export default function OrderHistory({ orders }: { orders: ApiOrder[] }) {
  if (orders.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-card px-6 py-12 text-center text-muted-foreground">
        <p>Chưa có lịch sử lệnh</p>
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="px-4 py-3 text-left font-semibold text-foreground">Thời gian</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Mã lệnh</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Mã</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Loại</th>
              <th className="px-4 py-3 text-left font-semibold text-foreground">Chiều</th>
              <th className="px-4 py-3 text-right font-semibold text-foreground">Giá vào</th>
              <th className="px-4 py-3 text-right font-semibold text-foreground">Khối lượng</th>
              <th className="px-4 py-3 text-right font-semibold text-foreground">PnL</th>
              <th className="px-4 py-3 text-center font-semibold text-foreground">Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-border hover:bg-muted">
                <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{fmtTime(order.createdAt)}</td>
                <td className="px-4 py-3 font-mono text-foreground" title={order.id}>
                  {shortId(order.id)}
                </td>
                <td className="px-4 py-3 font-semibold text-foreground">{order.symbol}</td>
                <td className="px-4 py-3 text-muted-foreground">{typeLabel(order.type)}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-2 py-1 text-xs font-bold ${
                      order.side === 'buy'
                        ? 'bg-chart-1 bg-opacity-20 text-chart-1'
                        : 'bg-chart-5 bg-opacity-20 text-chart-5'
                    }`}
                  >
                    {sideLabel(order.side)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right font-mono text-foreground">
                  ${order.entryPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </td>
                <td className="px-4 py-3 text-right font-mono text-foreground">{order.lots.toFixed(2)} lot</td>
                <td className="px-4 py-3 text-right font-mono">
                  {order.realizedPnl != null && Number.isFinite(order.realizedPnl) ? (
                    <span className={order.realizedPnl >= 0 ? 'text-chart-1' : 'text-chart-5'}>
                      {order.realizedPnl >= 0 ? '+' : ''}${order.realizedPnl.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`rounded px-2 py-1 text-xs font-bold ${statusClass(order.status)}`}>
                    {statusLabel(order.status)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
