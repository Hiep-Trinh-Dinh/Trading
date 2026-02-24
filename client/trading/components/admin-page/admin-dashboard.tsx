'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users,
  BarChart2,
  MessageSquare,
  Plus,
  Pencil,
  Lock,
  Unlock,
  Trash2,
  Download,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import {
  adminListUsers,
  adminCreateUser,
  adminUpdateUser,
  adminLockUser,
  adminUnlockUser,
  adminListTradeHistory,
  adminExportTradeHistory,
  adminListChatMessages,
  adminDeleteChatMessage,
  type AdminUser,
  type AdminTradeHistory,
  type AdminChatMessage,
} from '@/lib/api'

type TabId = 'users' | 'trades' | 'chat'

export default function AdminDashboard() {
  const [tab, setTab] = useState<TabId>('users')

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={20} />
            <span className="text-sm">Quay lại</span>
          </Link>
          <h1 className="text-xl font-bold">Quản trị hệ thống</h1>
        </div>
      </header>

      <nav className="border-b border-border px-6 flex gap-1">
        {[
          { id: 'users' as const, label: 'Quản lý User', icon: Users },
          { id: 'trades' as const, label: 'Lịch sử giao dịch', icon: BarChart2 },
          { id: 'chat' as const, label: 'Tin nhắn', icon: MessageSquare },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
              tab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Icon size={18} />
            {label}
          </button>
        ))}
      </nav>

      <main className="p-6">
        {tab === 'users' && <UsersTab />}
        {tab === 'trades' && <TradesTab />}
        {tab === 'chat' && <ChatTab />}
      </main>
    </div>
  )
}

function UsersTab() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<'add' | 'edit' | null>(null)
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [form, setForm] = useState({ email: '', name: '', password: '', role: 'user' as 'admin' | 'user' })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await adminListUsers()
      setUsers(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tải danh sách thất bại')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const openAdd = () => {
    setEditUser(null)
    setForm({ email: '', name: '', password: '', role: 'user' })
    setError('')
    setModal('add')
  }

  const openEdit = (u: AdminUser) => {
    setEditUser(u)
    setForm({ email: u.email, name: u.name, password: '', role: u.role })
    setError('')
    setModal('edit')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      if (modal === 'add') {
        await adminCreateUser({
          email: form.email.trim(),
          name: form.name.trim(),
          password: form.password,
          role: form.role,
        })
      } else if (editUser) {
        await adminUpdateUser(editUser.id, {
          email: form.email.trim(),
          name: form.name.trim(),
          password: form.password || undefined,
          role: form.role,
        })
      }
      setModal(null)
      load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Thao tác thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  const handleLock = async (id: string) => {
    try {
      await adminLockUser(id)
      load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Khóa thất bại')
    }
  }

  const handleUnlock = async (id: string) => {
    try {
      await adminUnlockUser(id)
      load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Mở khóa thất bại')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold">Danh sách người dùng</h2>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90"
        >
          <Plus size={18} />
          Thêm user
        </button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Đang tải...</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Email</th>
                <th className="text-left p-3">Tên</th>
                <th className="text-left p-3">Loại tài khoản</th>
                <th className="text-left p-3">Vai trò</th>
                <th className="text-left p-3">Trạng thái</th>
                <th className="text-left p-3">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-border">
                  <td className="p-3">{u.email}</td>
                  <td className="p-3">{u.name}</td>
                  <td className="p-3">{u.accountType}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        u.role === 'admin' ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {u.role}
                    </span>
                  </td>
                  <td className="p-3">
                    {u.isLocked ? (
                      <span className="text-chart-5 font-medium">Đã khóa</span>
                    ) : (
                      <span className="text-chart-1">Hoạt động</span>
                    )}
                  </td>
                  <td className="p-3 flex gap-2">
                    <button
                      onClick={() => openEdit(u)}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground"
                      title="Sửa"
                    >
                      <Pencil size={16} />
                    </button>
                    {u.isLocked ? (
                      <button
                        onClick={() => handleUnlock(u.id)}
                        className="p-1.5 rounded hover:bg-muted text-chart-1"
                        title="Mở khóa"
                      >
                        <Unlock size={16} />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleLock(u.id)}
                        className="p-1.5 rounded hover:bg-muted text-chart-5"
                        title="Khóa"
                      >
                        <Lock size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-bold mb-4">
              {modal === 'add' ? 'Thêm user' : 'Sửa user'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-input border border-border"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tên</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-input border border-border"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Mật khẩu {modal === 'edit' && '(để trống nếu không đổi)'}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg bg-input border border-border"
                  required={modal === 'add'}
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Vai trò</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as 'admin' | 'user' }))}
                  className="w-full px-3 py-2 rounded-lg bg-input border border-border"
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                </select>
              </div>
              {error && <p className="text-chart-5 text-sm">{error}</p>}
              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setModal(null)}
                  className="px-4 py-2 rounded-lg border border-border hover:bg-muted"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium disabled:opacity-50"
                >
                  {submitting ? 'Đang lưu...' : 'Lưu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function TradesTab() {
  const [trades, setTrades] = useState<AdminTradeHistory[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [t, u] = await Promise.all([
        adminListTradeHistory(userId || undefined, 500),
        adminListUsers(),
      ])
      setTrades(t)
      setUsers(u)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tải thất bại')
    } finally {
      setLoading(false)
    }
  }, [userId])

  useEffect(() => {
    load()
  }, [load])

  const handleExport = async () => {
    try {
      const { csv } = await adminExportTradeHistory(userId || undefined)
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `trade-history-${userId || 'all'}-${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(a.href)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Xuất file thất bại')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h2 className="text-lg font-bold">Lịch sử giao dịch</h2>
        <div className="flex items-center gap-2">
          <select
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            className="px-3 py-2 rounded-lg bg-input border border-border text-sm"
          >
            <option value="">Tất cả user</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.email}
              </option>
            ))}
          </select>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90"
          >
            <Download size={18} />
            Xuất CSV
          </button>
        </div>
      </div>

      {error && <p className="text-chart-5 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-muted-foreground">Đang tải...</p>
      ) : (
        <div className="rounded-lg border border-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Thời gian</th>
                <th className="text-left p-3">User ID</th>
                <th className="text-left p-3">Symbol</th>
                <th className="text-left p-3">Side</th>
                <th className="text-right p-3">Lots</th>
                <th className="text-right p-3">Entry</th>
                <th className="text-right p-3">Exit</th>
                <th className="text-right p-3">PnL</th>
              </tr>
            </thead>
            <tbody>
              {trades.map((t) => (
                <tr key={t.id} className="border-t border-border">
                  <td className="p-3 whitespace-nowrap">{new Date(t.createdAt).toLocaleString()}</td>
                  <td className="p-3 font-mono text-xs">{t.userId.slice(0, 8)}...</td>
                  <td className="p-3">{t.symbol}</td>
                  <td className="p-3">
                    <span className={t.side === 'buy' ? 'text-chart-1' : 'text-chart-5'}>
                      {t.side}
                    </span>
                  </td>
                  <td className="p-3 text-right">{t.lots}</td>
                  <td className="p-3 text-right">{t.entryPrice.toFixed(2)}</td>
                  <td className="p-3 text-right">{t.exitPrice.toFixed(2)}</td>
                  <td
                    className={`p-3 text-right font-medium ${
                      t.pnl >= 0 ? 'text-chart-1' : 'text-chart-5'
                    }`}
                  >
                    {t.pnl >= 0 ? '+' : ''}
                    {t.pnl.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {trades.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">Chưa có giao dịch nào</div>
          )}
        </div>
      )}
    </div>
  )
}

function ChatTab() {
  const [messages, setMessages] = useState<AdminChatMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [room, setRoom] = useState<'general' | 'support' | ''>('')
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const list = await adminListChatMessages(
        room === 'general' || room === 'support' ? room : undefined,
        300,
      )
      setMessages(list)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Tải thất bại')
    } finally {
      setLoading(false)
    }
  }, [room])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async (id: number) => {
    if (!confirm('Xóa tin nhắn này?')) return
    try {
      await adminDeleteChatMessage(id)
      load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Xóa thất bại')
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
        <h2 className="text-lg font-bold">Quản lý tin nhắn</h2>
        <select
          value={room}
          onChange={(e) => setRoom(e.target.value as 'general' | 'support' | '')}
          className="px-3 py-2 rounded-lg bg-input border border-border text-sm"
        >
          <option value="">Tất cả phòng</option>
          <option value="general">general</option>
          <option value="support">support</option>
        </select>
      </div>

      {error && <p className="text-chart-5 text-sm mb-4">{error}</p>}

      {loading ? (
        <p className="text-muted-foreground">Đang tải...</p>
      ) : (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left p-3">Thời gian</th>
                <th className="text-left p-3">Phòng</th>
                <th className="text-left p-3">User</th>
                <th className="text-left p-3">Nội dung</th>
                <th className="text-left p-3 w-16">Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {messages.map((m) => (
                <tr key={m.id} className="border-t border-border">
                  <td className="p-3 whitespace-nowrap">{new Date(m.createdAt).toLocaleString()}</td>
                  <td className="p-3">{m.room}</td>
                  <td className="p-3">
                    <span className="font-medium">{m.userName}</span>
                    <span className="text-muted-foreground text-xs ml-1">({m.userId.slice(0, 8)}...)</span>
                  </td>
                  <td className="p-3 max-w-xs truncate">{m.content}</td>
                  <td className="p-3">
                    <button
                      onClick={() => handleDelete(m.id)}
                      className="p-1.5 rounded hover:bg-muted text-chart-5"
                      title="Xóa"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {messages.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">Chưa có tin nhắn nào</div>
          )}
        </div>
      )}
    </div>
  )
}
