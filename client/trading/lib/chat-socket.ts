'use client'

import { io, type Socket } from 'socket.io-client'
import { useEffect, useRef, useState, useCallback } from 'react'
import { getAccessToken } from './auth-session'

export type ChatRoom = 'general' | 'support'

export type ChatMessage = {
  id: number
  room: ChatRoom
  userId: string
  userName: string
  content: string
  createdAt: string
}

const WS_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'

export function useChatSocket(room: ChatRoom | null) {
  const socketRef = useRef<Socket | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const sendMessage = useCallback(
    (content: string) => {
      if (!room || !socketRef.current?.connected) return
      socketRef.current.emit('send-message', { room, content })
    },
    [room],
  )

  useEffect(() => {
    const token = getAccessToken()
    if (!token) {
      setError('Bạn cần đăng nhập để sử dụng chat')
      return
    }

    const s = io(`${WS_URL}/chat`, {
      auth: { token },
      path: '/socket.io',
    })

    socketRef.current = s

    s.on('connect', () => {
      setConnected(true)
      setError(null)
      if (room) {
        s.emit('join-room', room)
      }
    })

    s.on('disconnect', (reason) => {
      setConnected(false)
      if (reason === 'io server disconnect') {
        setError('Phiên chat đã kết thúc')
      }
    })

    s.on('connect_error', (err) => {
      setConnected(false)
      setError(err.message || 'Không thể kết nối chat')
    })

    s.on('history', (list: ChatMessage[]) => {
      setMessages(list)
    })

    s.on('new-message', (msg: ChatMessage) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev
        return [...prev, msg]
      })
    })

    return () => {
      if (room) s.emit('leave-room', room)
      s.disconnect()
      socketRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!room) return
    setMessages([])
    const s = socketRef.current
    if (!s?.connected) return
    s.emit('join-room', room)
    return () => {
      s.emit('leave-room', room)
    }
  }, [room])

  return { messages, connected, error, sendMessage }
}
