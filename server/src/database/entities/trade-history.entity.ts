import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm'

@Entity('trade_history')
export class TradeHistoryEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @Index()
  @Column({ type: 'varchar', length: 64 })
  userId!: string

  @Index()
  @Column({ type: 'varchar', length: 64 })
  orderId!: string

  @Index()
  @Column({ type: 'varchar', length: 64 })
  positionId!: string

  @Column({ type: 'varchar', length: 32 })
  symbol!: string

  @Column({ type: 'varchar', length: 8 })
  side!: 'buy' | 'sell'

  @Column({ type: 'double' })
  lots!: number

  @Column({ type: 'double' })
  entryPrice!: number

  @Column({ type: 'double' })
  exitPrice!: number

  @Column({ type: 'double' })
  pnl!: number

  @CreateDateColumn()
  createdAt!: Date
}

