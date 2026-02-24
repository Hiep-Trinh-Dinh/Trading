import { Column, CreateDateColumn, Entity, OneToMany, PrimaryColumn, UpdateDateColumn } from 'typeorm'
import { WalletEntity } from './wallet.entity'
import { OrderEntity } from './order.entity'
import { PositionEntity } from './position.entity'

@Entity('users')
export class UserEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  id!: string

  @Column({ type: 'varchar', length: 255, unique: true })
  email!: string

  @Column({ type: 'varchar', length: 255 })
  name!: string

  /**
   * Bcrypt hash (null for legacy/demo users).
   * Real users created via /auth/register must have this set.
   */
  @Column({ type: 'varchar', length: 255, nullable: true })
  passwordHash!: string | null

  @Column({ type: 'varchar', length: 16, default: 'Demo' })
  accountType!: 'Demo' | 'Live'

  /** admin | user. Default user. */
  @Column({ type: 'varchar', length: 16, default: 'user' })
  role!: 'admin' | 'user'

  /** Khóa tài khoản – không cho login. */
  @Column({ type: 'tinyint', width: 1, default: 0 })
  isLocked!: boolean

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date

  @OneToMany(() => WalletEntity, (w) => w.user)
  wallets!: WalletEntity[]

  @OneToMany(() => OrderEntity, (o) => o.user)
  orders!: OrderEntity[]

  @OneToMany(() => PositionEntity, (p) => p.user)
  positions!: PositionEntity[]
}

