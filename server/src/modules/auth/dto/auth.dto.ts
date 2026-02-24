import { IsEmail, IsNotEmpty, IsString, MaxLength, MinLength } from 'class-validator'

export class RegisterDto {
  @IsEmail()
  @MaxLength(255)
  email!: string

  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string

  @IsString()
  @MinLength(6)
  @MaxLength(128)
  password!: string
}

export class LoginDto {
  @IsEmail()
  @MaxLength(255)
  email!: string

  @IsString()
  @IsNotEmpty()
  password!: string
}

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword!: string

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string
}

