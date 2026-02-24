export type TradingAccountType = 'demo' | 'real'

export type TradingAccountState = {
  selected: TradingAccountType
  demoUsdBalance: number
  realUsdBalance: number
}

const STORAGE_KEY = 'trade:account:v1'
const POSITIONS_KEY = 'trade:positions:v1'
const CHANGE_EVENT = 'trade:account_changed'

function clampMoney(n: number) {
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.round(n * 100) / 100)
}

export type TradingPositionMeta = {
  account: TradingAccountType
  lockedUsd: number // amount deducted/locked when opening (margin)
  openedAt: string
}

export type TradingPositionsState = Record<string, TradingPositionMeta>

export function loadTradingAccountState(): TradingAccountState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as TradingAccountState
    if (parsed.selected !== 'demo' && parsed.selected !== 'real') return null
    return {
      selected: parsed.selected,
      demoUsdBalance: clampMoney(parsed.demoUsdBalance ?? 0),
      realUsdBalance: clampMoney(parsed.realUsdBalance ?? 0),
    }
  } catch {
    return null
  }
}

export function saveTradingAccountState(next: TradingAccountState) {
  if (typeof window === 'undefined') return
  const normalized: TradingAccountState = {
    selected: next.selected === 'real' ? 'real' : 'demo',
    demoUsdBalance: clampMoney(next.demoUsdBalance),
    realUsdBalance: clampMoney(next.realUsdBalance),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized))
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
}

export function loadTradingPositionsState(): TradingPositionsState {
  if (typeof window === 'undefined') return {}
  try {
    const raw = localStorage.getItem(POSITIONS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as TradingPositionsState
    if (!parsed || typeof parsed !== 'object') return {}
    // normalize
    const out: TradingPositionsState = {}
    for (const [k, v] of Object.entries(parsed)) {
      if (!k) continue
      const acct = v?.account === 'real' ? 'real' : 'demo'
      // Backward compatible: older versions stored `notionalUsd`
      const lockedUsd = clampMoney((v as any)?.lockedUsd ?? (v as any)?.notionalUsd ?? 0)
      const openedAt = typeof (v as any)?.openedAt === 'string' ? (v as any).openedAt : new Date().toISOString()
      out[k] = { account: acct, lockedUsd, openedAt }
    }
    return out
  } catch {
    return {}
  }
}

export function saveTradingPositionsState(next: TradingPositionsState) {
  if (typeof window === 'undefined') return
  localStorage.setItem(POSITIONS_KEY, JSON.stringify(next))
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT))
}

export function recordOpenPosition(positionId: string, meta: Omit<TradingPositionMeta, 'openedAt'> & { openedAt?: string }) {
  if (!positionId) return
  const curr = loadTradingPositionsState()
  const openedAt = meta.openedAt ?? new Date().toISOString()
  curr[positionId] = { account: meta.account, lockedUsd: clampMoney(meta.lockedUsd), openedAt }
  saveTradingPositionsState(curr)
}

export function recordOpenPositionForSelectedAccount(positionId: string, lockedUsd: number) {
  const acct = ensureTradingAccountState().selected
  recordOpenPosition(positionId, { account: acct, lockedUsd })
}

export function removePositionMeta(positionId: string) {
  if (!positionId) return
  const curr = loadTradingPositionsState()
  if (!(positionId in curr)) return
  delete curr[positionId]
  saveTradingPositionsState(curr)
}

export function ensureTradingAccountState(seed?: Partial<TradingAccountState>) {
  const existing = loadTradingAccountState()
  if (existing) return existing
  const next: TradingAccountState = {
    selected: seed?.selected === 'real' ? 'real' : 'demo',
    demoUsdBalance: clampMoney(seed?.demoUsdBalance ?? 10_000),
    realUsdBalance: clampMoney(seed?.realUsdBalance ?? 0),
  }
  saveTradingAccountState(next)
  return next
}

export function setSelectedTradingAccount(selected: TradingAccountType) {
  const curr = ensureTradingAccountState()
  saveTradingAccountState({ ...curr, selected })
}

export function setDemoUsdBalance(demoUsdBalance: number) {
  const curr = ensureTradingAccountState()
  saveTradingAccountState({ ...curr, demoUsdBalance })
}

export function setRealUsdBalance(realUsdBalance: number) {
  const curr = ensureTradingAccountState()
  saveTradingAccountState({ ...curr, realUsdBalance })
}

export function deductSelectedAccountUsd(amountUsd: number) {
  const curr = ensureTradingAccountState()
  const amt = clampMoney(amountUsd)
  if (amt <= 0) return curr
  if (curr.selected === 'demo') {
    const next = { ...curr, demoUsdBalance: clampMoney(curr.demoUsdBalance - amt) }
    saveTradingAccountState(next)
    return next
  }
  const next = { ...curr, realUsdBalance: clampMoney(curr.realUsdBalance - amt) }
  saveTradingAccountState(next)
  return next
}

export function creditSelectedAccountUsd(amountUsd: number) {
  const curr = ensureTradingAccountState()
  const amt = clampMoney(amountUsd)
  if (amt <= 0) return curr
  if (curr.selected === 'demo') {
    const next = { ...curr, demoUsdBalance: clampMoney(curr.demoUsdBalance + amt) }
    saveTradingAccountState(next)
    return next
  }
  const next = { ...curr, realUsdBalance: clampMoney(curr.realUsdBalance + amt) }
  saveTradingAccountState(next)
  return next
}

/** Cộng hoặc trừ tiền vào đúng loại tài khoản khi đóng lệnh (margin + PnL). amountUsd có thể âm khi lỗ. */
export function creditAccountUsd(accountType: TradingAccountType, amountUsd: number) {
  const curr = ensureTradingAccountState()
  const amt = Number(amountUsd)
  if (!Number.isFinite(amt) || amt === 0) return curr
  if (accountType === 'demo') {
    const next = { ...curr, demoUsdBalance: clampMoney(curr.demoUsdBalance + amt) }
    saveTradingAccountState(next)
    return next
  }
  const next = { ...curr, realUsdBalance: clampMoney(curr.realUsdBalance + amt) }
  saveTradingAccountState(next)
  return next
}

export function subscribeTradingAccountState(cb: (s: TradingAccountState) => void) {
  if (typeof window === 'undefined') return () => {}
  const handler = () => {
    const s = loadTradingAccountState()
    if (s) cb(s)
  }
  window.addEventListener(CHANGE_EVENT, handler)
  window.addEventListener('storage', handler)
  return () => {
    window.removeEventListener(CHANGE_EVENT, handler)
    window.removeEventListener('storage', handler)
  }
}

export function subscribeTradeStateChange(cb: () => void) {
  if (typeof window === 'undefined') return () => {}
  window.addEventListener(CHANGE_EVENT, cb)
  window.addEventListener('storage', cb)
  return () => {
    window.removeEventListener(CHANGE_EVENT, cb)
    window.removeEventListener('storage', cb)
  }
}

