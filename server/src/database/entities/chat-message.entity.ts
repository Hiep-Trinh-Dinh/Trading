import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

export type ChatRoom = 'general' | 'support'

@Entity('chat_messages')
@Index(['room', 'createdAt'])
export class ChatMessageEntity {
  @PrimaryGeneratedColumn()
  id!: number

  @Column({ type: 'varchar', length: 32 })
  room!: ChatRoom

  @Column({ type: 'varchar', length: 64 })
  userId!: string

  @Column({ type: 'varchar', length: 255 })
  userName!: string

  @Column({ type: 'text' })
  content!: string

  @CreateDateColumn()
  createdAt!: Date
}
