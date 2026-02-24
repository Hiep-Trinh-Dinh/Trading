import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm'

export type DepositStatus = 'pending' | 'success' | 'failed'

@Entity('deposits')
export class DepositEntity {
  @PrimaryColumn({ type: 'varchar', length: 200 })
  orderId!: string

  @Index()
  @Column({ type: 'varchar', length: 64 })
  userId!: string

  @Column({ type: 'bigint' })
  amount!: number // VND

  @Column({ type: 'double', default: 0 })
  amountUsd!: number // USD credited after conversion

  @Column({ type: 'varchar', length: 32, default: 'pending' })
  status!: DepositStatus

  @Column({ type: 'varchar', length: 100, nullable: true })
  vnpTransactionNo!: string | null

  @Column({ type: 'varchar', length: 20, nullable: true })
  vnpResponseCode!: string | null

  @Column({ type: 'json', nullable: true })
  ipnPayload!: object | null

  /**
   * Thời điểm giao dịch đã được cộng tiền vào ví (idempotency guard).
   * Dùng để tránh việc IPN/return bị gọi nhiều lần sẽ cộng tiền lặp.
   */
  @Column({ type: 'datetime', nullable: true })
  creditedAt!: Date | null

  @CreateDateColumn()
  createdAt!: Date

  @UpdateDateColumn()
  updatedAt!: Date
}
