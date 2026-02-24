'use client'

import React, { useState, useRef, useEffect } from 'react'
import { MessageCircle, Users, Headphones } from 'lucide-react'
import { useChatSocket, type ChatRoom, type ChatMessage } from '@/lib/chat-socket'

type TabId = 'general' | 'support'

const TABS: { id: TabId; label: string; room: ChatRoom; icon: React.ReactNode }[] = [
  { id: 'general', label: 'Chat tổng', room: 'general', icon: <Users size={18} /> },
  { id: 'support', label: 'Chat hỗ trợ', room: 'support', icon: <Headphones size={18} /> },
]

function formatTime(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const sameDay = d.toDateString() === now.toDateString()
  if (sameDay) return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' }) + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
}

function MessageItem({ msg }: { msg: ChatMessage }) {
  return (
    <div className="flex flex-col gap-0.5 py-2 px-3 rounded-lg hover:bg-muted/50 transition-colors">
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className="font-semibold text-primary">{msg.userName}</span>
        <span className="text-xs text-muted-foreground">{formatTime(msg.createdAt)}</span>
      </div>
      <p className="text-foreground break-words">{msg.content}</p>
    </div>
  )
}

export default function ProfileChat() {
  const [activeTab, setActiveTab] = useState<TabId>('general')
  const room = TABS.find((t) => t.id === activeTab)?.room ?? 'general'
  const { messages, connected, error, sendMessage } = useChatSocket(room)
  const [input, setInput] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const text = input.trim()
    if (!text) return
    sendMessage(text)
    setInput('')
  }

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="border-b border-border px-4 py-3 flex items-center gap-2">
        <MessageCircle size={20} className="text-primary" />
        <h2 className="text-xl font-bold">Chat</h2>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'text-primary border-b-2 border-primary bg-primary/5'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Status & Error */}
      <div className="px-4 py-2 flex items-center gap-2 text-sm">
        <span
          className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-muted-foreground'}`}
          aria-hidden
        />
        {connected ? (
          <span className="text-muted-foreground">
            {room === 'general' ? 'Đang kết nối chat tổng' : 'Đang kết nối chat hỗ trợ'}
          </span>
        ) : error ? (
          <span className="text-destructive">{error}</span>
        ) : (
          <span className="text-muted-foreground">Đang kết nối...</span>
        )}
      </div>

      {/* Messages */}
      <div
        ref={listRef}
        className="h-64 overflow-y-auto px-4 space-y-0"
        style={{ minHeight: 256 }}
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm py-8">
            <MessageCircle size={32} className="mb-2 opacity-50" />
            <p>
              {room === 'general'
                ? 'Chưa có tin nhắn. Hãy gửi tin nhắn đầu tiên!'
                : 'Gửi tin nhắn để được hỗ trợ'}
            </p>
          </div>
        )}
        {messages.map((msg) => (
          <MessageItem key={msg.id} msg={msg} />
        ))}
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-border">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              room === 'general' ? 'Nhập tin nhắn...' : 'Mô tả vấn đề cần hỗ trợ...'
            }
            maxLength={2000}
            disabled={!connected}
            className="flex-1 px-4 py-2.5 bg-background border border-border rounded-lg text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!connected || !input.trim()}
            className="px-6 py-2.5 bg-primary text-primary-foreground font-medium rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Gửi
          </button>
        </div>
      </form>
    </div>
  )
}
