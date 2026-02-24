import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets'
import { JwtService } from '@nestjs/jwt'
import { Server } from 'socket.io'
import type { Socket } from 'socket.io'
import { ChatService } from './chat.service'
import type { ChatRoom } from '../../database/entities/chat-message.entity'
import { UserService } from '../user/user.service'

type AuthenticatedSocket = Socket & { userId?: string; userName?: string }

@WebSocketGateway({
  cors: { origin: true },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly userService: UserService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth?.token ?? client.handshake.query?.token
      if (!token || typeof token !== 'string') {
        client.disconnect()
        return
      }
      const payload = this.jwtService.verify(token, {
        secret: process.env.JWT_ACCESS_SECRET ?? 'dev-access-secret',
      })
      const user = await this.userService.getById(payload.sub)
      client.userId = user.id
      client.userName = user.name
    } catch {
      client.disconnect()
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    // cleanup if needed
  }

  @SubscribeMessage('join-room')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() room: ChatRoom,
  ) {
    if (!client.userId || (room !== 'general' && room !== 'support')) return
    await client.join(`room:${room}`)
    const history = await this.chatService.getHistory(room)
    client.emit('history', history)
  }

  @SubscribeMessage('leave-room')
  handleLeaveRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() room: ChatRoom,
  ) {
    client.leave(`room:${room}`)
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: { room: ChatRoom; content: string },
  ) {
    if (!client.userId || !client.userName) return
    const { room, content } = payload
    if (room !== 'general' && room !== 'support') return
    const text = typeof content === 'string' ? content.trim().slice(0, 2000) : ''
    if (!text) return

    const msg = await this.chatService.saveMessage(room, client.userId, client.userName, text)
    this.server.to(`room:${room}`).emit('new-message', msg)
  }
}
