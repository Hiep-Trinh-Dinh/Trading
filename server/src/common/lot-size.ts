/**
 * Lot size (contract size) per symbol for PnL/quantity calculation.
 * Shared by trade-engine and position modules.
 */
export function lotSize(symbol: string): number {
  const s = symbol.toUpperCase()
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
