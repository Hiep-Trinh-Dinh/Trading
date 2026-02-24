import { Column, CreateDateColumn, Entity, Index, ManyToOne, PrimaryColumn } from 'typeorm'
import { UserEntity } from './user.entity'

export type PositionSide = 'buy' | 'sell'
export type PositionStatus = 'open' | 'closed'
export type CloseReason = 'manual' | 'tp' | 'sl'
export type PositionAccountType = 'demo' | 'real'

@Entity('positions')
export class PositionEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string

  @Index()
  @Column({ type: 'varchar', length: 64 })
  orderId!: string

  @Index()
  @Column({ type: 'varchar', length: 64 })
  userId!: string

  @ManyToOne(() => UserEntity, (u) => u.positions, { onDelete: 'CASCADE' })
  user!: UserEntity

  @Index()
  @Column({ type: 'varchar', length: 32 })
  symbol!: string

  @Column({ type: 'varchar', length: 8 })
  side!: PositionSide

  @Column({ type: 'double' })
  lots!: number

  @Column({ type: 'double' })
  entryPrice!: number

  @Column({ type: 'double', nullable: true })
  stopLoss!: number | null

  @Column({ type: 'double', nullable: true })
  takeProfit!: number | null

  @Column({ type: 'varchar', length: 16, default: 'open' })
  status!: PositionStatus

  @Column({ type: 'double', nullable: true })
  closePrice!: number | null

  @Column({ type: 'varchar', length: 16, nullable: true })
  closeReason!: CloseReason | null

  @Column({ type: 'datetime', nullable: true })
  closedAt!: Date | null

  /** USD margin locked when position was opened (returned to wallet on close) */
  @Column({ type: 'double', default: 0 })
  marginReserved!: number

  /** Wallet to settle on close: demo (set by user) or real (VNPay). */
  @Column({ type: 'varchar', length: 8, default: 'demo' })
  accountType!: PositionAccountType

  @CreateDateColumn()
  openedAt!: Date
}

