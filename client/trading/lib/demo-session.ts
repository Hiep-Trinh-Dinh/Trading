export type DemoUser = {
  id: string
  name: string
  email: string
  accountType: 'Demo' | 'Live'
  joinDate: string
}

export type DemoWalletAsset = {
  symbol: string
  amount: number
  price: number
}

export type DemoSession = {
  user: DemoUser
  wallet: {
    baseCurrency: 'USD'
    assets: DemoWalletAsset[]
  }
}

const STORAGE_KEY = 'demo:session:v1'

export const DEFAULT_DEMO_SESSION: DemoSession = {
  user: {
    id: 'demo-user-001',
    name: 'Demo Trader',
    email: 'demo@trading.com',
    accountType: 'Demo',
    joinDate: '2026-01-28',
  },
  wallet: {
    baseCurrency: 'USD',
    assets: [
      { symbol: 'USD', amount: 25000, price: 1 },
      { symbol: 'BTC', amount: 0.25, price: 42567.89 },
      { symbol: 'ETH', amount: 3, price: 2245.67 },
      { symbol: 'XAU', amount: 2, price: 2035.5 }, // vàng demo (minh hoạ)
    ],
  },
}

export function loadDemoSession(): DemoSession | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as DemoSession
  } catch {
    return null
  }
}

export function saveDemoSession(session: DemoSession) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function ensureDemoSession(): DemoSession {
  const existing = loadDemoSession()
  if (existing) return existing
  saveDemoSession(DEFAULT_DEMO_SESSION)
  return DEFAULT_DEMO_SESSION
}

export function resetDemoSession(): DemoSession {
  saveDemoSession(DEFAULT_DEMO_SESSION)
  return DEFAULT_DEMO_SESSION
}

