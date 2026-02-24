import { ConflictException, Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SecurityConfirmationEntity } from '../../database/entities/security-confirmation.entity'
import type { SubmitSecurityConfirmationDto } from './dto/security-confirmation.dto'

@Injectable()
export class SecurityConfirmationService {
  constructor(
    @InjectRepository(SecurityConfirmationEntity)
    private readonly repo: Repository<SecurityConfirmationEntity>,
  ) {}

  /** Kiểm tra user đã xác nhận bảo mật chưa. */
  async isConfirmed(userId: string): Promise<boolean> {
    const one = await this.repo.findOne({ where: { userId } })
    return !!one
  }

  /** Lấy trạng thái (chỉ có confirmed hay không; không trả về dữ liệu nhạy cảm). */
  async getStatus(userId: string): Promise<{ confirmed: boolean }> {
    const confirmed = await this.isConfirmed(userId)
    return { confirmed }
  }

  /**
   * Gửi xác nhận bảo mật.
   * Trùng citizenId hoặc bankAccountNumber với bản ghi khác thì từ chối.
   */
  async submit(userId: string, dto: SubmitSecurityConfirmationDto): Promise<{ ok: boolean }> {
    const existing = await this.repo.findOne({ where: { userId } })
    if (existing) {
      throw new ConflictException('Bạn đã xác nhận bảo mật trước đó.')
    }

    const normalizedCitizenId = dto.citizenId.replace(/\s/g, '')
    const normalizedBankAccount = dto.bankAccountNumber.replace(/\s/g, '')

    const duplicateCitizen = await this.repo.findOne({ where: { citizenId: normalizedCitizenId } })
    if (duplicateCitizen) {
      throw new ConflictException('Số căn cước công dân này đã được đăng ký xác nhận bảo mật.')
    }

    const duplicateBank = await this.repo.findOne({ where: { bankAccountNumber: normalizedBankAccount } })
    if (duplicateBank) {
      throw new ConflictException('Số tài khoản ngân hàng này đã được đăng ký xác nhận bảo mật.')
    }

    const bankDate = new Date(dto.bankAccountCreatedAt)
    if (Number.isNaN(bankDate.getTime())) {
      throw new ConflictException('Ngày tạo tài khoản ngân hàng không hợp lệ.')
    }

    await this.repo.save(
      this.repo.create({
        userId,
        address: dto.address.trim(),
        citizenId: normalizedCitizenId,
        bankAccountNumber: normalizedBankAccount,
        bankName: dto.bankName.trim(),
        bankAccountCreatedAt: bankDate,
      }),
    )
    return { ok: true }
  }
}
