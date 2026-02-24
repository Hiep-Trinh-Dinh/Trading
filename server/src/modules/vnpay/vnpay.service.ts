import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import {
  VNPay,
  ProductCode,
  VnpLocale,
  HashAlgorithm,
  IpnSuccess,
  IpnFailChecksum,
  IpnOrderNotFound,
  IpnInvalidAmount,
  InpOrderAlreadyConfirmed,
  IpnUnknownError,
} from 'vnpay'
import { DepositEntity } from '../../database/entities/deposit.entity'
import { WalletService } from '../wallet/wallet.service'
import { SecurityConfirmationService } from '../security-confirmation/security-confirmation.service'

const VND_TO_USD_RATE = 24_000

@Injectable()
export class VnpayService {
  private readonly vnpay: InstanceType<typeof VNPay>
  private readonly returnUrl: string

  constructor(
    @InjectRepository(DepositEntity) private readonly deposits: Repository<DepositEntity>,
    private readonly wallet: WalletService,
    private readonly securityConfirmation: SecurityConfirmationService,
  ) {
    const tmnCode = (process.env.VNPAY_TMN_CODE ?? process.env.tanCode ?? '').trim()
    const secureSecret = (process.env.VNPAY_SECURE_SECRET ?? process.env.secureSecret ?? '').trim()
    const vnpayHost = process.env.VNPAY_HOST ?? process.env.vnpayHost ?? 'https://sandbox.vnpayment.vn'
    const testMode = process.env.VNPAY_TEST_MODE === 'true' || process.env.testMode === 'true'
    const hashAlgEnv = process.env.VNPAY_HASH_ALGORITHM ?? process.env.hashAlgorithm ?? 'SHA512'
    const hashAlg =
      hashAlgEnv === 'SHA256' ? HashAlgorithm.SHA256
      : hashAlgEnv === 'MD5' ? HashAlgorithm.MD5
      : HashAlgorithm.SHA512

    this.vnpay = new VNPay({
      tmnCode,
      secureSecret,
      vnpayHost,
      testMode,
      hashAlgorithm: hashAlg,
      loggerFn: () => {},
    })

    const appUrl = process.env.APP_URL ?? 'http://localhost:3000'
    this.returnUrl = process.env.VNPAY_RETURN_URL ?? `${appUrl}/wallet?vnpay=return`
  }

  isConfigured(): boolean {
    const tmnCode = process.env.VNPAY_TMN_CODE ?? process.env.tanCode ?? ''
    const secret = process.env.VNPAY_SECURE_SECRET ?? process.env.secureSecret ?? ''
    return Boolean(tmnCode && secret)
  }

  /** Create VNPay payment URL for deposit. Returns paymentUrl and orderId. Chỉ cho phép khi đã xác nhận bảo mật. */
  async createPayment(userId: string, amountVnd: number): Promise<{ paymentUrl: string; orderId: string }> {
    if (!this.isConfigured()) {
      throw new Error('VNPay chưa được cấu hình. Kiểm tra VNPAY_TMN_CODE, VNPAY_SECURE_SECRET.')
    }
    const confirmed = await this.securityConfirmation.isConfirmed(userId)
    if (!confirmed) {
      throw new Error('Bạn cần hoàn thành Xác nhận bảo mật tại Hồ sơ cá nhân trước khi nạp tiền vào tài khoản real.')
    }
    if (!Number.isFinite(amountVnd) || amountVnd < 1000) {
      throw new Error('Số tiền VND không hợp lệ (tối thiểu 1.000 VND).')
    }

    const orderId = `deposit_${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    const amountUsd = amountVnd / VND_TO_USD_RATE

    const deposit = this.deposits.create({
      orderId,
      userId,
      amount: amountVnd,
      amountUsd,
      status: 'pending',
    })
    await this.deposits.save(deposit)

    const paymentUrl = this.vnpay.buildPaymentUrl({
      vnp_Amount: amountVnd,
      vnp_IpAddr: '127.0.0.1',
      vnp_TxnRef: orderId,
      vnp_OrderInfo: `Nap tien VND ${amountVnd} quy doi sang USD`,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: this.returnUrl,
      vnp_Locale: VnpLocale.VN,
    })

    return { paymentUrl, orderId }
  }

  /** Verify return callback (user redirect). For UI only; business logic in IPN. */
  verifyReturnUrl(query: Record<string, string>) {
    return this.vnpay.verifyReturnUrl(this.pickVnpParams(query) as never)
  }

  /**
   * VNPay signs only `vnp_*` params. Any extra params (e.g. `vnpay=return`) will break signature verification.
   */
  private pickVnpParams(query: Record<string, string>): Record<string, string> {
    const picked: Record<string, string> = {}
    for (const [k, v] of Object.entries(query ?? {})) {
      if (k.startsWith('vnp_')) picked[k] = v
    }
    return picked
  }

  private async creditDepositSuccess(
    orderId: string,
    ipnPayload: Record<string, string>,
    meta: { vnpTransactionNo: string | null; vnpResponseCode: string | null },
  ): Promise<{ ok: boolean; status: string; amountUsd?: number }> {
    try {
      return await this.deposits.manager.transaction(async (manager) => {
        const deposit = await manager.findOne(DepositEntity, { where: { orderId } })
        if (!deposit) return { ok: false, status: 'order_not_found' }
        if (deposit.creditedAt) return { ok: true, status: 'success', amountUsd: deposit.amountUsd }

        deposit.status = 'success'
        deposit.vnpTransactionNo = meta.vnpTransactionNo
        deposit.vnpResponseCode = meta.vnpResponseCode
        deposit.ipnPayload = ipnPayload as unknown as object
        deposit.creditedAt = new Date()
        await manager.save(DepositEntity, deposit)

        await this.wallet.addUsd(deposit.userId, deposit.amountUsd, 'real')

        return { ok: true, status: 'success', amountUsd: deposit.amountUsd }
      })
    } catch {
      return { ok: false, status: 'internal_error' }
    }
  }

  /**
   * Confirm payment from return URL (user redirect).
   * Dùng khi IPN chưa kịp gọi hoặc không gọi được (vd: không có ngrok cho backend).
   * Verify chữ ký VNPay rồi cập nhật deposit + cộng ví (idempotent).
   */
  async confirmFromReturnUrl(userId: string, query: Record<string, string>): Promise<{ ok: boolean; status: string; amountUsd?: number }> {
    const vnpQuery = this.pickVnpParams(query)
    const verify = this.vnpay.verifyReturnUrl(vnpQuery as never)
    if (!verify.isVerified) {
      return { ok: false, status: 'invalid_signature' }
    }
    if (!verify.isSuccess) {
      return { ok: false, status: 'failed' }
    }

    const orderId = (verify as { vnp_TxnRef?: string }).vnp_TxnRef
    if (!orderId) return { ok: false, status: 'missing_order' }

    const deposit = await this.deposits.findOne({ where: { orderId, userId } })
    if (!deposit) return { ok: false, status: 'order_not_found' }
    if (deposit.creditedAt) return { ok: true, status: 'success', amountUsd: deposit.amountUsd }

    const amountFromVnp = (verify as { vnp_Amount?: number }).vnp_Amount
    const depositAmount = Number(deposit.amount)
    const amountMatch =
      amountFromVnp == null ||
      amountFromVnp === depositAmount ||
      amountFromVnp === depositAmount * 100
    if (!amountMatch) {
      return { ok: false, status: 'amount_mismatch' }
    }

    const vnpTransactionNo = (verify as { vnp_TransactionNo?: string }).vnp_TransactionNo ?? null
    const vnpResponseCode = (verify as { vnp_ResponseCode?: string }).vnp_ResponseCode ?? null

    return this.creditDepositSuccess(orderId, vnpQuery, { vnpTransactionNo, vnpResponseCode })
  }

  /**
   * Public confirm from return URL (no JWT).
   * Still verifies signature; uses orderId to locate deposit and credit correct user.
   */
  async confirmFromReturnUrlPublic(query: Record<string, string>): Promise<{ ok: boolean; status: string; amountUsd?: number }> {
    const vnpQuery = this.pickVnpParams(query)
    const verify = this.vnpay.verifyReturnUrl(vnpQuery as never)
    if (!verify.isVerified) return { ok: false, status: 'invalid_signature' }
    if (!verify.isSuccess) return { ok: false, status: 'failed' }

    const orderId = (verify as { vnp_TxnRef?: string }).vnp_TxnRef
    if (!orderId) return { ok: false, status: 'missing_order' }

    const deposit = await this.deposits.findOne({ where: { orderId } })
    if (!deposit) return { ok: false, status: 'order_not_found' }
    if (deposit.creditedAt) return { ok: true, status: 'success', amountUsd: deposit.amountUsd }

    const amountFromVnp = (verify as { vnp_Amount?: number }).vnp_Amount
    const amountMatch =
      amountFromVnp == null ||
      amountFromVnp === deposit.amount ||
      amountFromVnp === deposit.amount * 100
    if (!amountMatch) return { ok: false, status: 'amount_mismatch' }

    const vnpTransactionNo = (verify as { vnp_TransactionNo?: string }).vnp_TransactionNo ?? null
    const vnpResponseCode = (verify as { vnp_ResponseCode?: string }).vnp_ResponseCode ?? null

    return this.creditDepositSuccess(orderId, vnpQuery, { vnpTransactionNo, vnpResponseCode })
  }

  /** Process IPN from VNPay (GET with query). Must return JSON response per VNPay docs. */
  async handleIpn(query: Record<string, string>): Promise<{ RspCode: string; Message: string }> {
    const verify = this.vnpay.verifyIpnCall(query as never)
    if (!verify.isVerified) {
      return IpnFailChecksum
    }

    const orderId = (verify as { vnp_TxnRef?: string }).vnp_TxnRef
    if (orderId) {
      const deposit = await this.deposits.findOne({ where: { orderId } })
      if (deposit && deposit.status === 'pending' && !verify.isSuccess) {
        await this.deposits.update(
          { orderId },
          {
            status: 'failed',
            vnpResponseCode: (verify as { vnp_ResponseCode?: string }).vnp_ResponseCode ?? null,
            ipnPayload: query as unknown as object,
          },
        )
      }
    }
    if (!verify.isSuccess) {
      return IpnUnknownError
    }
    if (!orderId) {
      return IpnOrderNotFound
    }

    const deposit = await this.deposits.findOne({ where: { orderId } })
    if (!deposit) {
      return IpnOrderNotFound
    }
    if (deposit.creditedAt) return InpOrderAlreadyConfirmed

    const amountFromVnp = (verify as { vnp_Amount?: number }).vnp_Amount
    const depositAmount = Number(deposit.amount)
    const amountMatch =
      amountFromVnp == null ||
      amountFromVnp === depositAmount ||
      amountFromVnp === depositAmount * 100
    if (!amountMatch) {
      return IpnInvalidAmount
    }

    const vnpTransactionNo = (verify as { vnp_TransactionNo?: string }).vnp_TransactionNo ?? null
    const vnpResponseCode = (verify as { vnp_ResponseCode?: string }).vnp_ResponseCode ?? null

    const credited = await this.creditDepositSuccess(orderId, query, { vnpTransactionNo, vnpResponseCode })
    if (!credited.ok) return IpnUnknownError

    return IpnSuccess
  }

  getDepositStatus(orderId: string, userId: string): Promise<{ status: string; amountUsd?: number } | null> {
    return this.deposits
      .findOne({ where: { orderId, userId } })
      .then((d) => (d ? { status: d.status, amountUsd: d.amountUsd } : null))
  }

  getConfiguredReturnUrl(): string {
    return this.returnUrl
  }
}
