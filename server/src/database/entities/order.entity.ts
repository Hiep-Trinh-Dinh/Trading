import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryColumn } from 'typeorm'
import { UserEntity } from './user.entity'

export type OrderSide = 'buy' | 'sell'
export type OrderType = 'market' | 'limit'
export type OrderStatus = 'filled' | 'pending' | 'cancelled'

@Entity('orders')
export class OrderEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string

  @Index()
  @Column({ type: 'varchar', length: 64 })
  userId!: string

  @ManyToOne(() => UserEntity, (u) => u.orders, { onDelete: 'CASCADE' })
  user!: UserEntity

  @Index()
  @Column({ type: 'varchar', length: 32 })
  symbol!: string

  @Column({ type: 'varchar', length: 8 })
  side!: OrderSide

  @Column({ type: 'varchar', length: 8 })
  type!: OrderType

  @Column({ type: 'double' })
  lots!: number

  @Column({ type: 'double' })
  entryPrice!: number

  @Column({ type: 'double', nullable: true })
  stopLoss!: number | null

  @Column({ type: 'double', nullable: true })
  takeProfit!: number | null

  @Column({ type: 'varchar', length: 16 })
  status!: OrderStatus

  @CreateDateColumn()
  createdAt!: Date
}

