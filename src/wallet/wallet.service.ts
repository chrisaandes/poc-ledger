import { Injectable, BadRequestException } from '@nestjs/common';
import { LedgerService } from '../ledger/ledger.service';
import { MerchantsService } from '../merchants/merchants.service';

@Injectable()
export class WalletService {
  constructor(
    private ledger: LedgerService,
    private merchants: MerchantsService,
  ) {}

  /**
   * Lista merchants con wallet habilitada
   */
  async listWalletMerchants() {
    const merchants = await this.merchants.findAll({ walletEnabled: true, status: 'ACTIVE' });

    const results = await Promise.all(
      merchants.map(async (m) => {
        let balance = 0;
        try {
          balance = await this.ledger.getAvailableBalance(`merchants:${m.id}:available`);
        } catch {}
        return { ...m, balance };
      }),
    );

    return results;
  }

  /**
   * Balance y detalle de wallet de un merchant
   */
  async getWallet(merchantId: string) {
    const merchant = await this.merchants.findOne(merchantId);
    if (!merchant.walletEnabled) {
      throw new BadRequestException('Wallet not enabled for this merchant');
    }

    let available = 0;
    let inWithdrawal = 0;

    try {
      available = await this.ledger.getAvailableBalance(`merchants:${merchantId}:available`);
    } catch {}

    try {
      inWithdrawal = await this.ledger.getAvailableBalance(`merchants:${merchantId}:withdrawals`);
    } catch {}

    return {
      merchantId,
      merchantName: merchant.name,
      available,
      inWithdrawal,
      total: available + inWithdrawal,
    };
  }

  /**
   * Historial de movimientos del merchant en el ledger
   */
  async getMovements(merchantId: string) {
    const merchant = await this.merchants.findOne(merchantId);
    if (!merchant.walletEnabled) {
      throw new BadRequestException('Wallet not enabled for this merchant');
    }

    return this.ledger.listTransactions({ merchantId });
  }

  /**
   * Solicitar retiro
   */
  async withdraw(merchantId: string, amount: number) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const merchant = await this.merchants.findOne(merchantId);
    if (!merchant.walletEnabled) {
      throw new BadRequestException('Wallet not enabled for this merchant');
    }

    const available = await this.ledger.getAvailableBalance(`merchants:${merchantId}:available`);
    if (available < amount) {
      throw new BadRequestException(`Insufficient funds. Available: ${available}, Requested: ${amount}`);
    }

    const withdrawalFeePct = merchant.withdrawalFeePct ?? 0;
    const feeAmount = Math.round(amount * (withdrawalFeePct / 100));
    const netAmount = amount - feeAmount;
    const reference = `withdrawal_${merchantId}_${Date.now()}`;

    // Hold: available → withdrawals (monto bruto)
    await this.ledger.createWithdrawal(merchantId, amount, reference);

    // Confirm: withdrawals → bank:settlements (neto) + bendo:fees (fee)
    await this.ledger.confirmWithdrawal(merchantId, amount, feeAmount, `${reference}_confirmed`);

    return {
      merchantId,
      requestedAmount: amount,
      withdrawalFeePct,
      feeAmount,
      netAmount,
      reference,
      status: 'completed',
      timestamp: new Date().toISOString(),
    };
  }
}
