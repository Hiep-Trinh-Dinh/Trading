'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { Eye, EyeOff, LogOut, Sun, Moon, Check, Wallet, BarChart3, Pencil, X, ShieldCheck, Settings2 } from 'lucide-react'
import ProfileChat from './profile-chat'
import { fetchMe, updateProfile, changePassword, getSecurityConfirmationStatus, submitSecurityConfirmation } from '@/lib/api'
import { clearAccessToken } from '@/lib/auth-session'

interface ProfileSettingsProps {
  onLogout: () => void
  onNavigateToChart?: () => void
}

export default function ProfileSettings({ onLogout, onNavigateToChart }: ProfileSettingsProps) {
  const [darkMode, setDarkMode] = useState(true)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoadingPassword, setIsLoadingPassword] = useState(false)
  const [passwordSuccess, setPasswordSuccess] = useState(false)
  const [passwordError, setPasswordError] = useState('')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [userData, setUserData] = useState<{ name: string; email: string; accountType: string; joinDate: string; role?: 'admin' | 'user' } | null>(null)
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editName, setEditName] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [profileSaveError, setProfileSaveError] = useState('')
  const [profileSaveSuccess, setProfileSaveSuccess] = useState(false)
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)

  const [securityConfirmed, setSecurityConfirmed] = useState<boolean | null>(null)
  const [securityLoading, setSecurityLoading] = useState(false)
  const [securitySubmitLoading, setSecuritySubmitLoading] = useState(false)
  const [securityError, setSecurityError] = useState('')
  const [securitySuccess, setSecuritySuccess] = useState(false)
  const [secAddress, setSecAddress] = useState('')
  const [secCitizenId, setSecCitizenId] = useState('')
  const [secBankAccount, setSecBankAccount] = useState('')
  const [secBankName, setSecBankName] = useState('')
  const [secBankDate, setSecBankDate] = useState('')

  const loadUser = () => {
    fetchMe()
      .then((u) =>
        setUserData({
          name: u.name,
          email: u.email,
          accountType: u.accountType === 'Demo' ? 'Demo Account' : 'Live Account',
          joinDate: '—',
          role: u.role,
        }),
      )
      .catch(() => setUserData(null))
  }

  const loadSecurityStatus = () => {
    getSecurityConfirmationStatus()
      .then((r) => setSecurityConfirmed(r.confirmed))
      .catch(() => setSecurityConfirmed(false))
  }

  useEffect(() => {
    loadUser()
  }, [])

  useEffect(() => {
    loadSecurityStatus()
  }, [])

  const startEditProfile = () => {
    if (userData) {
      setEditName(userData.name)
      setEditEmail(userData.email)
      setProfileSaveError('')
      setProfileSaveSuccess(false)
      setIsEditingProfile(true)
    }
  }

  const cancelEditProfile = () => {
    setIsEditingProfile(false)
    setProfileSaveError('')
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setProfileSaveError('')
    setProfileSaveSuccess(false)
    const name = editName.trim()
    const email = editEmail.trim().toLowerCase()
    if (!name) {
      setProfileSaveError('Vui lòng nhập tên')
      return
    }
    if (!email) {
      setProfileSaveError('Vui lòng nhập email')
      return
    }
    setIsLoadingProfile(true)
    try {
      await updateProfile({ name, email })
      setUserData((prev) => (prev ? { ...prev, name, email } : null))
      setProfileSaveSuccess(true)
      setIsEditingProfile(false)
      setTimeout(() => setProfileSaveSuccess(false), 3000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('email_already_used') || msg.includes('already')) {
        setProfileSaveError('Email này đã được sử dụng')
      } else if (msg.includes('401') || msg.includes('Unauthorized')) {
        setProfileSaveError('Phiên đăng nhập hết hạn, vui lòng đăng nhập lại')
      } else {
        setProfileSaveError(msg || 'Cập nhật thất bại')
      }
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError('')
    setPasswordSuccess(false)

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('Vui lòng điền đầy đủ các trường mật khẩu')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Mật khẩu mới không trùng khớp')
      return
    }

    if (newPassword.length < 8) {
      setPasswordError('Mật khẩu mới phải có ít nhất 8 ký tự')
      return
    }

    setIsLoadingPassword(true)
    try {
      await changePassword({ currentPassword, newPassword })
      setPasswordSuccess(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setPasswordSuccess(false), 3000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('401') || msg.includes('Invalid credentials')) {
        setPasswordError('Mật khẩu hiện tại không đúng')
      } else if (msg.includes('8 characters')) {
        setPasswordError('Mật khẩu mới phải có ít nhất 8 ký tự')
      } else {
        setPasswordError(msg || 'Đổi mật khẩu thất bại')
      }
    } finally {
      setIsLoadingPassword(false)
    }
  }

  const handleLogout = () => {
    clearAccessToken()
    onLogout()
  }

  const handleSecuritySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSecurityError('')
    setSecuritySuccess(false)
    const address = secAddress.trim()
    const citizenId = secCitizenId.replace(/\s/g, '')
    const bankAccountNumber = secBankAccount.replace(/\s/g, '')
    const bankName = secBankName.trim()
    if (!address) {
      setSecurityError('Vui lòng nhập địa chỉ sinh sống')
      return
    }
    if (!citizenId) {
      setSecurityError('Vui lòng nhập số căn cước công dân')
      return
    }
    if (!bankAccountNumber) {
      setSecurityError('Vui lòng nhập số tài khoản ngân hàng')
      return
    }
    if (!bankName) {
      setSecurityError('Vui lòng nhập tên ngân hàng')
      return
    }
    if (!secBankDate) {
      setSecurityError('Vui lòng chọn ngày tạo tài khoản ngân hàng')
      return
    }
    setSecuritySubmitLoading(true)
    try {
      await submitSecurityConfirmation({
        address,
        citizenId,
        bankAccountNumber,
        bankName,
        bankAccountCreatedAt: secBankDate,
      })
      setSecurityConfirmed(true)
      setSecuritySuccess(true)
      setSecAddress('')
      setSecCitizenId('')
      setSecBankAccount('')
      setSecBankName('')
      setSecBankDate('')
      setTimeout(() => setSecuritySuccess(false), 3000)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('đã xác nhận') || msg.includes('already')) {
        setSecurityError('Bạn đã xác nhận bảo mật trước đó.')
      } else if (msg.includes('căn cước') || msg.includes('citizen')) {
        setSecurityError('Số căn cước công dân này đã được đăng ký.')
      } else if (msg.includes('tài khoản ngân hàng') || msg.includes('bank')) {
        setSecurityError('Số tài khoản ngân hàng này đã được đăng ký.')
      } else {
        setSecurityError(msg || 'Xác nhận bảo mật thất bại')
      }
    } finally {
      setSecuritySubmitLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground dark">
      {/* Header */}
      <div className="border-b border-border">
        <div className="max-w-2xl mx-auto px-6 py-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Hồ sơ & Cài đặt</h1>
            <p className="text-muted-foreground mt-1">Quản lý tài khoản và tuỳ chọn</p>
          </div>

          <div className="flex items-center gap-3">
            {onNavigateToChart && (
              <button
                onClick={onNavigateToChart}
                className="inline-flex items-center gap-2 rounded-lg bg-card border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                <BarChart3 size={18} />
                Quay về Chart
              </button>
            )}
            <Link
              href="/wallet"
              className="inline-flex items-center gap-2 rounded-lg bg-card border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              <Wallet size={18} />
              Ví cá nhân
            </Link>
            {userData?.role === 'admin' && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-2 rounded-lg bg-primary/20 border border-primary px-4 py-2 text-sm font-medium text-primary hover:bg-primary/30 transition-colors"
              >
                <Settings2 size={18} />
                Quản trị
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
        {/* User Information Card */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Thông tin tài khoản</h2>
            {!isEditingProfile && userData && (
              <button
                type="button"
                onClick={startEditProfile}
                className="inline-flex items-center gap-2 rounded-lg bg-muted border border-border px-3 py-2 text-sm font-medium hover:bg-muted/80 transition-colors"
              >
                <Pencil size={16} />
                Sửa
              </button>
            )}
          </div>

          {isEditingProfile ? (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Họ tên</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Nhập họ tên"
                  disabled={isLoadingProfile}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Email</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="email@example.com"
                  disabled={isLoadingProfile}
                />
              </div>
              {profileSaveError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  {profileSaveError}
                </div>
              )}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={isLoadingProfile}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50"
                >
                  {isLoadingProfile ? 'Đang lưu...' : 'Lưu'}
                </button>
                <button
                  type="button"
                  onClick={cancelEditProfile}
                  disabled={isLoadingProfile}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-muted border border-border font-medium hover:bg-muted/80 disabled:opacity-50"
                >
                  <X size={16} />
                  Huỷ
                </button>
              </div>
            </form>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Họ tên</label>
                  <p className="text-foreground font-medium">{userData?.name ?? '—'}</p>
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Email</label>
                  <p className="text-foreground font-medium">{userData?.email ?? '—'}</p>
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Loại tài khoản</label>
                  <p className="text-foreground font-medium">{userData?.accountType ?? '—'}</p>
                </div>
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">Tham gia</label>
                  <p className="text-foreground font-medium">{userData?.joinDate ?? '—'}</p>
                </div>
              </div>
              {profileSaveSuccess && (
                <div className="mt-4 p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-400 flex items-center gap-2">
                  <Check size={16} />
                  Đã cập nhật thông tin
                </div>
              )}
            </>
          )}
        </div>

        {/* Xác nhận bảo mật - bắt buộc để nạp tiền real */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ShieldCheck size={22} className="text-primary" />
              <h2 className="text-xl font-bold">Xác nhận bảo mật</h2>
            </div>
            {securityConfirmed === true && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-green-500/30 bg-green-500/10 px-3 py-1 text-sm font-medium text-green-400">
                <Check size={16} />
                Đã xác nhận
              </span>
            )}
          </div>
          {securityConfirmed === false && (
            <>
              <p className="mt-4 text-sm text-muted-foreground mb-4">
                Để nạp tiền vào tài khoản real, bạn cần hoàn thành xác nhận bảo mật một lần. Thông tin dùng để xác minh và không cho phép trùng với tài khoản khác.
              </p>
            <form onSubmit={handleSecuritySubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Địa chỉ sinh sống</label>
                <input
                  type="text"
                  value={secAddress}
                  onChange={(e) => setSecAddress(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Ví dụ: Số 1, đường X, quận Y, TP.HCM"
                  disabled={securitySubmitLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Số căn cước công dân</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={secCitizenId}
                  onChange={(e) => setSecCitizenId(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="12 chữ số"
                  maxLength={12}
                  disabled={securitySubmitLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Số tài khoản ngân hàng</label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={secBankAccount}
                  onChange={(e) => setSecBankAccount(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Số tài khoản"
                  disabled={securitySubmitLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Tên ngân hàng</label>
                <input
                  type="text"
                  value={secBankName}
                  onChange={(e) => setSecBankName(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  placeholder="Ví dụ: Vietcombank, Techcombank"
                  disabled={securitySubmitLoading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">Ngày tạo tài khoản ngân hàng</label>
                <input
                  type="date"
                  value={secBankDate}
                  onChange={(e) => setSecBankDate(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  disabled={securitySubmitLoading}
                />
              </div>
              {securityError && (
                <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                  {securityError}
                </div>
              )}
              {securitySuccess && (
                <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-400 flex items-center gap-2">
                  <Check size={16} />
                  Đã xác nhận bảo mật thành công
                </div>
              )}
              <button
                type="submit"
                disabled={securitySubmitLoading}
                className="w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50"
              >
                {securitySubmitLoading ? 'Đang xử lý...' : 'Xác nhận bảo mật'}
              </button>
            </form>
            </>
          )}
          {securityConfirmed === null && (
            <p className="mt-4 text-sm text-muted-foreground">Đang tải trạng thái...</p>
          )}
        </div>

        {/* Chat Section */}
        <ProfileChat />

        {/* Change Password Section */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-bold mb-6">Bảo mật</h2>

          <form onSubmit={handlePasswordChange} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="current-password" className="block text-sm font-medium text-foreground">
                Mật khẩu hiện tại
              </label>
              <div className="relative">
                <input
                  id="current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 pr-12"
                  disabled={isLoadingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoadingPassword}
                >
                  {showCurrentPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <label htmlFor="new-password" className="block text-sm font-medium text-foreground">
                Mật khẩu mới
              </label>
              <div className="relative">
                <input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 pr-12"
                  disabled={isLoadingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoadingPassword}
                >
                  {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">Ít nhất 8 ký tự</p>
            </div>

            <div className="space-y-2">
              <label htmlFor="confirm-password" className="block text-sm font-medium text-foreground">
                Xác nhận mật khẩu mới
              </label>
              <div className="relative">
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 pr-12"
                  disabled={isLoadingPassword}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={isLoadingPassword}
                >
                  {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {passwordError && (
              <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg text-sm text-destructive">
                {passwordError}
              </div>
            )}

            {passwordSuccess && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-sm text-green-400 flex items-center gap-2">
                <Check size={16} />
                Đã đổi mật khẩu thành công
              </div>
            )}

            <button
              type="submit"
              disabled={isLoadingPassword}
              className="w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-card transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoadingPassword ? 'Đang cập nhật...' : 'Đổi mật khẩu'}
            </button>
          </form>
        </div>

        {/* Preferences Section */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-bold mb-6">Preferences</h2>

          <div className="flex items-center justify-between p-4 bg-background/50 border border-border/50 rounded-lg">
            <div className="flex items-center gap-3">
              {darkMode ? <Moon size={20} className="text-primary" /> : <Sun size={20} className="text-yellow-400" />}
              <div>
                <p className="font-medium text-foreground">Dark Mode</p>
                <p className="text-sm text-muted-foreground">Currently {darkMode ? 'enabled' : 'disabled'}</p>
              </div>
            </div>
            <button
              onClick={() => setDarkMode(!darkMode)}
              className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${
                darkMode ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-foreground transition-transform ${
                  darkMode ? 'translate-x-7' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Logout Section */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-xl font-bold mb-6">Logout</h2>

          <p className="text-muted-foreground mb-4">
            You will be logged out from your trading account. You can sign in again anytime.
          </p>

          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 bg-destructive text-white font-medium rounded-lg hover:bg-destructive/90 focus:outline-none focus:ring-2 focus:ring-destructive focus:ring-offset-2 focus:ring-offset-card transition-all duration-200 flex items-center justify-center gap-2"
          >
            <LogOut size={20} />
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}
