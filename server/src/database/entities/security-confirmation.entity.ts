import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm'

@Entity('security_confirmations')
export class SecurityConfirmationEntity {
  @PrimaryColumn({ type: 'varchar', length: 64 })
  userId!: string

  @Column({ type: 'varchar', length: 512 })
  address!: string

  /** Số căn cước công dân – unique toàn hệ thống. */
  @Column({ type: 'varchar', length: 32, unique: true })
  citizenId!: string

  /** Số tài khoản ngân hàng – unique toàn hệ thống. */
  @Column({ type: 'varchar', length: 64, unique: true })
  bankAccountNumber!: string

  @Column({ type: 'varchar', length: 255 })
  bankName!: string

  @Column({ type: 'date' })
  bankAccountCreatedAt!: Date

  @CreateDateColumn()
  confirmedAt!: Date
}
