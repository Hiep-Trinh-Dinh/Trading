'use client'

import type { ApiPosition } from '@/lib/api'

export default function PositionsTable({
  positions,
  selectedPositionId,
  onSelect,
  onClose,
}: {
  positions: ApiPosition[]
  selectedPositionId: string | null
  onSelect: (id: string) => void
  onClose: (id: string, position: ApiPosition) => void
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted">
              <th className="px-6 py-3 text-left font-semibold text-foreground">Mã</th>
              <th className="px-6 py-3 text-right font-semibold text-foreground">Giá vào</th>
              <th className="px-6 py-3 text-right font-semibold text-foreground">Giá hiện tại</th>
              <th className="px-6 py-3 text-right font-semibold text-foreground">Số lượng</th>
              <th className="px-6 py-3 text-right font-semibold text-foreground">PnL</th>
              <th className="px-6 py-3 text-right font-semibold text-foreground">%</th>
              <th className="px-6 py-3 text-center font-semibold text-foreground">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {positions.map((position) => (
              <tr
                key={position.id}
                onClick={() => onSelect(position.id)}
                className={`border-b border-border hover:bg-muted cursor-pointer ${
                  selectedPositionId === position.id ? 'bg-muted' : ''
                }`}
              >
                <td className="px-6 py-4 font-semibold text-foreground">{position.symbol}</td>
                <td className="px-6 py-4 text-right font-mono text-foreground">
                  ${position.entryPrice.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right font-mono text-foreground">
                  ${(position.lastPrice ?? position.entryPrice).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right font-mono text-foreground">
                  {position.lots.toFixed(2)} lot
                </td>
                <td
                  className={`px-6 py-4 text-right font-mono font-semibold ${
                    (position.pnl ?? 0) >= 0 ? 'text-chart-1' : 'text-chart-5'
                  }`}
                >
                  {(position.pnl ?? 0) >= 0 ? '+' : ''}${(position.pnl ?? 0).toFixed(2)}
                </td>
                <td
                  className={`px-6 py-4 text-right font-semibold ${
                    (position.pnlPercent ?? 0) >= 0 ? 'text-chart-1' : 'text-chart-5'
                  }`}
                >
                  {(position.pnlPercent ?? 0) >= 0 ? '+' : ''}
                  {(position.pnlPercent ?? 0).toFixed(2)}%
                </td>
                <td className="px-6 py-4 text-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onClose(position.id, position)
                    }}
                    className="rounded bg-chart-5 px-3 py-1 text-xs font-semibold text-white transition-opacity hover:opacity-90"
                  >
                    Đóng
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {positions.length === 0 && (
        <div className="px-6 py-12 text-center text-muted-foreground">
          <p>Chưa có vị thế đang mở</p>
        </div>
      )}
    </div>
  )
}
