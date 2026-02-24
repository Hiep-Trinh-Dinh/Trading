import { getAccessToken } from './auth-session'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getAccessToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers || {}),
    },
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${text || path}`)
  }
  return (await res.json()) as T
}

export type ApiUser = {
  id: string
  email: string
  name: string
  accountType: 'Demo' | 'Live'
  role?: 'admin' | 'user'
}

export function authRegister(body: { email: string; name: string; password: string }) {
  return api<{ user: ApiUser; accessToken: string }>('/auth/register', { method: 'POST', body: JSON.stringify(body) })
}

export function authLogin(body: { email: string; password: string }) {
  return api<{ user: ApiUser; accessToken: string }>('/auth/login', { method: 'POST', body: JSON.stringify(body) })
}

export function fetchMe() {
  return api<ApiUser>('/user/me')
}

export function updateProfile(body: { name?: string; email?: string }) {
  return api<ApiUser>('/user/me', { method: 'PATCH', body: JSON.stringify(body) })
}

export function changePassword(body: { currentPassword: string; newPassword: string }) {
  return api<{ ok: boolean }>('/auth/change-password', { method: 'POST', body: JSON.stringify(body) })
}

/** Trạng thái xác nhận bảo mật (nạp tiền real chỉ được khi confirmed). */
export function getSecurityConfirmationStatus() {
  return api<{ confirmed: boolean }>('/security-confirmation/status')
}

export function submitSecurityConfirmation(body: {
  address: string
  citizenId: string
  bankAccountNumber: string
  bankName: string
  bankAccountCreatedAt: string
}) {
  return api<{ ok: boolean }>('/security-confirmation/submit', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export type ApiOrder = {
  id: string
  userId: string
  symbol: string
  side: 'buy' | 'sell'
  type: 'market' | 'limit'
  lots: number
  entryPrice: number
  stopLoss: number | null
  takeProfit: number | null
  status: 'filled' | 'pending' | 'cancelled'
  createdAt: string
  /** PnL đã thực hiện khi position đóng (null nếu chưa đóng). */
  realizedPnl?: number | null
}

export type ApiPosition = {
  id: string
  orderId: string
  userId: string
  symbol: string
  side: 'buy' | 'sell'
  lots: number
  entryPrice: number
  stopLoss: number | null
  takeProfit: number | null
  status: 'open' | 'closed'
  closePrice: number | null
  closeReason: 'manual' | 'tp' | 'sl' | null
  closedAt: string | null
  openedAt: string
  // computed fields (from /positions/open)
  lastPrice?: number
  qty?: number
  pnl?: number
  pnlPercent?: number
  marginReserved?: number
  /** demo | real – dùng để cộng PnL vào đúng ví khi đóng lệnh */
  accountType?: 'demo' | 'real'
}

export type ApiWalletRow = {
  id: number
  userId: string
  symbol: string
  amount: number
  lastPrice: number
}

export function sseUrl() {
  return `${API_URL}/events`
}

/** Single source of truth: fetch wallet rows from server. */
export function fetchWallet() {
  return api<ApiWalletRow[]>('/wallet')
}

/** Lấy số dư Demo và Real từ server (ví Demo cập nhật thủ công, ví Real nạp VNPay). */
export async function fetchWalletBalances(): Promise<{ demo: number; real: number }> {
  const rows = await fetchWallet()
  const demoRow = rows.find((r) => r.symbol === 'USD_DEMO')
  const realRow = rows.find((r) => r.symbol === 'USD_REAL')
  const legacyUsd = rows.find((r) => r.symbol === 'USD')
  const demo = typeof demoRow?.amount === 'number' && Number.isFinite(demoRow.amount) ? demoRow.amount : 0
  const real =
    typeof realRow?.amount === 'number' && Number.isFinite(realRow.amount)
      ? realRow.amount
      : typeof legacyUsd?.amount === 'number' && Number.isFinite(legacyUsd.amount)
        ? legacyUsd.amount
        : 0
  return { demo, real }
}

/** @deprecated Use fetchWalletBalances() and use .demo. */
export async function fetchWalletBalanceUsd(): Promise<number> {
  const { demo } = await fetchWalletBalances()
  return demo
}

/** Reset demo wallet to initial balance (server). */
export function resetDemoWallet() {
  return api<{ amount: number }>('/wallet/reset-demo', { method: 'POST' })
}

/** Set demo USD balance (server). */
export function setDemoWalletBalance(amount: number) {
  return api<{ amount: number }>('/wallet/demo-balance', {
    method: 'PATCH',
    body: JSON.stringify({ amount }),
  })
}

export function fetchOrders() {
  return api<ApiOrder[]>('/orders/history')
}

export function fetchOpenPositions() {
  return api<ApiPosition[]>('/positions/open')
}

export function placeMarketOrder(body: {
  symbol: string
  side: 'buy' | 'sell'
  lots: number
  entryPrice: number
  stopLoss: number | null
  takeProfit: number | null
  accountType?: 'demo' | 'real'
}) {
  return api<{ order: ApiOrder; position: ApiPosition }>('/orders/market', { method: 'POST', body: JSON.stringify(body) })
}

export function updateStops(positionId: string, body: { stopLoss?: number | null; takeProfit?: number | null }) {
  return api<ApiPosition>(`/positions/${encodeURIComponent(positionId)}/stops`, { method: 'PATCH', body: JSON.stringify(body) })
}

export function closePosition(positionId: string) {
  return api<{ positionId: string; pnl: number; closePrice: number; reason: string } | null>(
    `/positions/${encodeURIComponent(positionId)}/close`,
    { method: 'POST' },
  )
}

// VNPay deposit
export function createVnpayDeposit(amountVnd: number) {
  return api<{ paymentUrl: string; orderId: string }>('/vnpay/create-deposit', {
    method: 'POST',
    body: JSON.stringify({ amountVnd }),
  })
}

export function getVnpayDepositStatus(orderId: string) {
  return api<{ status: string | null; amountUsd?: number }>(
    `/vnpay/deposit-status?orderId=${encodeURIComponent(orderId)}`,
  )
}

/** Gửi query từ return URL lên backend để xác nhận thanh toán (khi IPN chưa kịp gọi). */
export function confirmVnpayReturn(query: Record<string, string>) {
  return api<{ ok: boolean; status: string; amountUsd?: number }>('/vnpay/confirm-return', {
    method: 'POST',
    body: JSON.stringify(query),
  })
}

/** Public confirm (no JWT) for VNPay return flow. */
export async function confirmVnpayReturnPublic(query: Record<string, string>) {
  const res = await fetch(`${API_URL}/vnpay/confirm-return-public`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`API ${res.status}: ${text || '/vnpay/confirm-return-public'}`)
  }
  return (await res.json()) as { ok: boolean; status: string; amountUsd?: number }
}

export function postPrice(symbol: string, price: number) {
  return api<{ ok: boolean }>('/market/price', { method: 'POST', body: JSON.stringify({ symbol, price }) })
}

// ========== Admin API ==========

export type AdminUser = {
  id: string
  email: string
  name: string
  accountType: string
  role: 'admin' | 'user'
  isLocked: boolean
  createdAt: string
  updatedAt: string
}

export function adminListUsers() {
  return api<AdminUser[]>('/admin/users')
}

export function adminCreateUser(body: {
  email: string
  name: string
  password: string
  role?: 'admin' | 'user'
}) {
  return api<AdminUser>('/admin/users', { method: 'POST', body: JSON.stringify(body) })
}

export function adminUpdateUser(
  id: string,
  body: { name?: string; email?: string; password?: string; role?: 'admin' | 'user' },
) {
  return api<AdminUser>(`/admin/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })
}

export function adminLockUser(id: string) {
  return api<{ ok: boolean; isLocked: boolean }>(`/admin/users/${encodeURIComponent(id)}/lock`, {
    method: 'POST',
  })
}

export function adminUnlockUser(id: string) {
  return api<{ ok: boolean; isLocked: boolean }>(`/admin/users/${encodeURIComponent(id)}/unlock`, {
    method: 'POST',
  })
}

export type AdminTradeHistory = {
  id: number
  userId: string
  orderId: string
  positionId: string
  symbol: string
  side: 'buy' | 'sell'
  lots: number
  entryPrice: number
  exitPrice: number
  pnl: number
  createdAt: string
}

export function adminListTradeHistory(userId?: string, limit?: number) {
  const params = new URLSearchParams()
  if (userId) params.set('userId', userId)
  if (limit != null) params.set('limit', String(limit))
  return api<AdminTradeHistory[]>(`/admin/trade-history?${params.toString()}`)
}

export function adminExportTradeHistory(userId?: string) {
  const params = new URLSearchParams()
  if (userId) params.set('userId', userId)
  return api<{ csv: string }>(`/admin/trade-history/export?${params.toString()}`)
}

export type AdminChatMessage = {
  id: number
  room: 'general' | 'support'
  userId: string
  userName: string
  content: string
  createdAt: string
}

export function adminListChatMessages(room?: 'general' | 'support', limit?: number) {
  const params = new URLSearchParams()
  if (room) params.set('room', room)
  if (limit != null) params.set('limit', String(limit))
  return api<AdminChatMessage[]>(`/admin/chat-messages?${params.toString()}`)
}

export function adminDeleteChatMessage(id: number) {
  return api<{ ok: boolean }>(`/admin/chat-messages/${id}`, { method: 'DELETE' })
}
