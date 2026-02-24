'use client'

import { useEffect, useState } from 'react'
import TradingDashboard from '@/components/trading-page/trading-dashboard'
import LoginPage from '@/components/login-page/login-page'
import RegisterPage from '@/components/register-page/register-page'
import ProfileSettings from '@/components/profile-page/profile-setting'
import LandingPage from '@/components/landing-page/landing-page'
import { fetchMe } from '@/lib/api'
import { getAccessToken } from '@/lib/auth-session'

type AuthPage = 'login' | 'register' | 'landing'
type MainPage = 'dashboard' | 'profile'

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [currentPage, setCurrentPage] = useState<AuthPage>('landing')
  const [mainPage, setMainPage] = useState<MainPage>('dashboard')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    // If there's a token, validate it by calling /user/me
    const token = getAccessToken()
    if (token) {
      fetchMe()
        .then(() => setIsLoggedIn(true))
        .catch(() => setIsLoggedIn(false))
        .finally(() => setHydrated(true))
    } else {
      setIsLoggedIn(false)
      setHydrated(true)
    }

    const main = new URLSearchParams(window.location.search).get('main')
    if (main === 'profile') setMainPage('profile')
  }, [])

  if (!hydrated) return null

  if (!isLoggedIn) {
    if (currentPage === 'landing') {
      return (
        <LandingPage
          onSwitchToLogin={() => setCurrentPage('login')}
          onSwitchToRegister={() => setCurrentPage('register')}
        />
      )
    } else if (currentPage === 'login') {
      return (
        <LoginPage
          onLoginSuccess={() => {
            setIsLoggedIn(true)
          }}
          onSwitchToRegister={() => setCurrentPage('register')}
        />
      )
    } else {
      return (
        <RegisterPage
          onRegisterSuccess={() => {
            setIsLoggedIn(true)
          }}
          onSwitchToLogin={() => setCurrentPage('login')}
        />
      )
    }
  }

  if (mainPage === 'profile') {
    return (
      <ProfileSettings
        onLogout={() => {
          setIsLoggedIn(false)
          setCurrentPage('login')
          setMainPage('dashboard')
        }}
        onNavigateToChart={() => setMainPage('dashboard')}
      />
    )
  }

  return (
    <main className="h-screen w-full bg-background text-foreground dark">
      <TradingDashboard 
        onNavigateToProfile={() => setMainPage('profile')}
        onNavigateToLanding={() => {
          setIsLoggedIn(false)
          setCurrentPage('landing')
          setMainPage('dashboard')
        }}
      />
    </main>
  )
}
