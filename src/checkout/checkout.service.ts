import { Injectable, BadRequestException } from '@nestjs/common';
import { LedgerService } from '../ledger/ledger.service';
import { MerchantsService } from '../merchants/merchants.service';

@Injectable()
export class CheckoutService {
  constructor(
    private ledger: LedgerService,
    private merchants: MerchantsService,
  ) {}

  /**
   * Procesar un cobro para un merchant.
   * @param merchantId ID del merchant
   * @param amount Monto en centavos (USD/2): $100.00 = 10000
   * @param description Descripción del cobro
   */
  async charge(merchantId: string, amount: number, description?: string) {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');

    const merchant = await this.merchants.findOne(merchantId);
    const reference = `charge_${merchantId}_${Date.now()}`;

    const result = await this.ledger.createCharge(
      merchantId,
      amount,
      merchant.commissionPct,
      reference,
    );

    const feeAmount = Math.round(amount * (merchant.commissionPct / 100));

    return {
      transactionId: result.data?.[0]?.id ?? result.data?.id,
      merchantId,
      merchantName: merchant.name,
      totalAmount: amount,
      feeAmount,
      merchantAmount: amount - feeAmount,
      commissionPct: merchant.commissionPct,
      reference,
      description,
      timestamp: new Date().toISOString(),
    };
  }

  async getTransactions(merchantId: string) {
    await this.merchants.findOne(merchantId); // valida que existe
    return this.ledger.listTransactions({ merchantId });
  }
}
