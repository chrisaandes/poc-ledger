import { Injectable } from '@nestjs/common';
import { LedgerService } from '../ledger/ledger.service';
import { MerchantsService } from '../merchants/merchants.service';

@Injectable()
export class BackofficeService {
  constructor(
    private ledger: LedgerService,
    private merchants: MerchantsService,
  ) {}

  /**
   * Todas las transacciones del ledger
   */
  async getTransactions(params?: { pageSize?: number; account?: string }) {
    return this.ledger.listTransactions(params);
  }

  /**
   * Detalle de una transacción específica
   */
  async getTransaction(txId: number) {
    return this.ledger.getTransaction(txId);
  }

  /**
   * Todas las cuentas del ledger
   */
  async getAccounts(params?: { pageSize?: number }) {
    return this.ledger.listAccounts(params);
  }

  /**
   * Detalle de cuenta + movimientos de un merchant en el ledger
   */
  async getMerchantLedgerDetail(merchantId: string) {
    const merchant = await this.merchants.findOne(merchantId);

    let available = null;
    let withdrawals = null;
    let transactions = null;

    try {
      available = await this.ledger.getAccount(`merchants:${merchantId}:available`, { expand: 'volumes' });
    } catch {}

    try {
      withdrawals = await this.ledger.getAccount(`merchants:${merchantId}:withdrawals`, { expand: 'volumes' });
    } catch {}

    try {
      transactions = await this.ledger.listTransactions({ merchantId, pageSize: 50 });
    } catch {}

    return {
      merchant,
      accounts: { available, withdrawals },
      transactions,
    };
  }

  /**
   * Logs del ledger (trazabilidad completa)
   */
  async getLogs(params?: { pageSize?: number }) {
    return this.ledger.listLogs(params);
  }

  /**
   * Stats generales
   */
  async getStats() {
    const merchants = await this.merchants.findAll();
    let feesAccount: any = null;

    try {
      feesAccount = await this.ledger.getAvailableBalance('bendo:fees');
    } catch {}

    const totalFees = feesAccount ?? 0;

    return {
      totalMerchants: merchants.length,
      activeMerchants: merchants.filter((m) => m.status === 'ACTIVE').length,
      walletsEnabled: merchants.filter((m) => m.walletEnabled).length,
      totalFeesCollected: totalFees,
    };
  }
}
