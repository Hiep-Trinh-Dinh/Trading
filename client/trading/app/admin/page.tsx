'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import AdminDashboard from '@/components/admin-page/admin-dashboard'
import { fetchMe } from '@/lib/api'
import { getAccessToken } from '@/lib/auth-session'

export default function AdminPage() {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'denied' | 'ok'>('loading')

  useEffect(() => {
    const token = getAccessToken()
    if (!token) {
      router.replace('/')
      return
    }
    fetchMe()
      .then((user) => {
        if (user.role === 'admin') {
          setStatus('ok')
        } else {
          setStatus('denied')
        }
      })
      .catch(() => {
        router.replace('/')
      })
  }, [router])

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Đang tải...</p>
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-chart-5 font-medium mb-2">Bạn không có quyền truy cập trang quản trị</p>
          <a href="/" className="text-primary hover:underline">
            Quay lại trang chủ
          </a>
        </div>
      </div>
    )
  }

  return <AdminDashboard />
}
