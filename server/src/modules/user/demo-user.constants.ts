export const DEMO_USER = {
  id: 'demo-user-001',
  email: 'demo@trading.com',
  name: 'Demo Trader',
  accountType: 'Demo' as const,
}

export const DEMO_WALLET = [
  { symbol: 'USD_DEMO', amount: 25000, lastPrice: 1 },
  { symbol: 'USD_REAL', amount: 0, lastPrice: 1 },
  { symbol: 'BTC', amount: 0.25, lastPrice: 42567.89 },
  { symbol: 'ETH', amount: 3, lastPrice: 2245.67 },
  { symbol: 'XAU', amount: 2, lastPrice: 2035.5 },
]

