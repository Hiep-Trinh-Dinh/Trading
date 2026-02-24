import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import type { ChatRoom } from '../../database/entities/chat-message.entity'
import { ChatMessageEntity } from '../../database/entities/chat-message.entity'

export type ChatMessageDto = {
  id: number
  room: ChatRoom
  userId: string
  userName: string
  content: string
  createdAt: string
}

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessageEntity)
    private readonly repo: Repository<ChatMessageEntity>,
  ) {}

  async saveMessage(room: ChatRoom, userId: string, userName: string, content: string): Promise<ChatMessageDto> {
    const msg = this.repo.create({ room, userId, userName, content })
    await this.repo.save(msg)
    return {
      id: msg.id,
      room: msg.room,
      userId: msg.userId,
      userName: msg.userName,
      content: msg.content,
      createdAt: msg.createdAt.toISOString(),
    }
  }

  async getHistory(room: ChatRoom, limit = 100): Promise<ChatMessageDto[]> {
    const list = await this.repo.find({
      where: { room },
      order: { createdAt: 'DESC' },
      take: limit,
    })
    return list
      .reverse()
      .map((m) => ({
        id: m.id,
        room: m.room,
        userId: m.userId,
        userName: m.userName,
        content: m.content,
        createdAt: m.createdAt.toISOString(),
      }))
  }
}
