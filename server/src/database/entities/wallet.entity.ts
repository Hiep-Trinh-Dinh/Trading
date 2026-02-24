import { Column, Entity, Index, ManyToOne, PrimaryGeneratedColumn, Unique } from 'typeorm'
import { UserEntity } from './user.entity'

@Entity('wallets')
@Unique(['userId', 'symbol'])
export class WalletEntity {
  @PrimaryGeneratedColumn('increment')
  id!: number

  @Index()
  @Column({ type: 'varchar', length: 64 })
  userId!: string

  @ManyToOne(() => UserEntity, (u) => u.wallets, { onDelete: 'CASCADE' })
  user!: UserEntity

  @Column({ type: 'varchar', length: 32 })
  symbol!: string // e.g. USD, BTC, ETH

  @Column({ type: 'double', default: 0 })
  amount!: number

  @Column({ type: 'double', default: 0 })
  lastPrice!: number // last known price (for UI valuation)
}

