import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator'

export class SubmitSecurityConfirmationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(512)
  address!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(32)
  citizenId!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  bankAccountNumber!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  bankName!: string

  /** Ngày tạo tài khoản ngân hàng (YYYY-MM-DD). */
  @IsDateString()
  bankAccountCreatedAt!: string
}
