'use client'

import { Suspense } from 'react'
import WalletDashboard from '@/components/wallet-page/wallet-page'

export default function WalletPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center">Đang tải...</div>}>
      <WalletDashboard />
    </Suspense>
  )
}
