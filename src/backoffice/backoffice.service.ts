import { Injectable } from '@nestjs/common';
import { LedgerService } from '../ledger/ledger.service';
import { MerchantsService } from '../merchants/merchants.service';
import { PrismaService } from '../prisma/prisma.service';
import { SEED_MERCHANTS } from './seed.data';

@Injectable()
export class BackofficeService {
  constructor(
    private ledger: LedgerService,
    private merchants: MerchantsService,
    private prisma: PrismaService,
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

  // ── Earnings ──────────────────────────────────────────────────────────────

  private async getChargeTxs() {
    const all = await this.ledger.getAllTransactions();
    return all.filter((tx) => tx.metadata?.type === 'charge');
  }

  private async getWithdrawalFeeTxs() {
    const all = await this.ledger.getAllTransactions();
    return all.filter(
      (tx) => tx.metadata?.type === 'withdrawal_confirmed' && Number(tx.metadata?.feeAmount) > 0,
    );
  }

  /**
   * Resumen global de ganancias de Bendo — cobros + fees de retiro
   */
  async getEarningsSummary() {
    const [charges, withdrawalFeeTxs, feesInAccount] = await Promise.all([
      this.getChargeTxs(),
      this.getWithdrawalFeeTxs(),
      this.ledger.getAvailableBalance('bendo:fees'),
    ]);

    const chargeVolume = charges.reduce((s, tx) => s + Number(tx.metadata.totalAmount), 0);
    const chargeFees = charges.reduce((s, tx) => s + Number(tx.metadata.feeAmount), 0);
    const avgCommission =
      charges.length > 0
        ? charges.reduce((s, tx) => s + Number(tx.metadata.commissionPct), 0) / charges.length
        : 0;

    const withdrawalVolume = withdrawalFeeTxs.reduce(
      (s, tx) => s + Number(tx.metadata.grossAmount ?? tx.metadata.totalAmount), 0,
    );
    const withdrawalFees = withdrawalFeeTxs.reduce(
      (s, tx) => s + Number(tx.metadata.feeAmount), 0,
    );

    return {
      chargeCount: charges.length,
      withdrawalFeeCount: withdrawalFeeTxs.length,
      chargeVolume,
      withdrawalVolume,
      totalVolume: chargeVolume + withdrawalVolume,
      chargeFees,
      withdrawalFees,
      totalFeesEarned: chargeFees + withdrawalFees,
      feesInAccount,
      avgCommissionPct: Math.round(avgCommission * 100) / 100,
      totalMerchantPayout: chargeVolume - chargeFees,
    };
  }

  /**
   * Fees desglosados por merchant — cobros y retiros separados
   */
  async getEarningsByMerchant() {
    const [charges, withdrawalFeeTxs, merchants] = await Promise.all([
      this.getChargeTxs(),
      this.getWithdrawalFeeTxs(),
      this.merchants.findAll(),
    ]);

    const merchantMap = new Map(merchants.map((m) => [m.id, m]));
    const grouped = new Map<string, any>();

    const ensureEntry = (mid: string) => {
      if (!grouped.has(mid)) {
        const m = merchantMap.get(mid);
        grouped.set(mid, {
          merchantId: mid,
          merchantName: m?.name ?? 'Unknown',
          merchantType: m?.type ?? 'UNKNOWN',
          commissionPct: m?.commissionPct ?? 0,
          withdrawalFeePct: m?.withdrawalFeePct ?? 0,
          chargeCount: 0,
          chargeVolume: 0,
          chargeFees: 0,
          withdrawalFeeCount: 0,
          withdrawalVolume: 0,
          withdrawalFees: 0,
          totalFees: 0,
          merchantPayout: 0,
        });
      }
      return grouped.get(mid);
    };

    for (const tx of charges) {
      const entry = ensureEntry(tx.metadata.merchantId);
      entry.chargeCount += 1;
      entry.chargeVolume += Number(tx.metadata.totalAmount);
      entry.chargeFees += Number(tx.metadata.feeAmount);
      entry.merchantPayout += Number(tx.metadata.totalAmount) - Number(tx.metadata.feeAmount);
    }

    for (const tx of withdrawalFeeTxs) {
      const entry = ensureEntry(tx.metadata.merchantId);
      const gross = Number(tx.metadata.grossAmount ?? tx.metadata.totalAmount);
      entry.withdrawalFeeCount += 1;
      entry.withdrawalVolume += gross;
      entry.withdrawalFees += Number(tx.metadata.feeAmount);
    }

    for (const entry of grouped.values()) {
      entry.totalFees = entry.chargeFees + entry.withdrawalFees;
    }

    return [...grouped.values()].sort((a, b) => b.totalFees - a.totalFees);
  }

  /**
   * Fees agrupados por tipo de merchant (SALUD, RETAIL, EDUCACION, OTRO)
   */
  async getEarningsByType() {
    const byMerchant = await this.getEarningsByMerchant();
    const grouped = new Map<string, any>();

    for (const m of byMerchant) {
      const type = m.merchantType;
      if (!grouped.has(type)) {
        grouped.set(type, {
          type,
          merchantCount: 0,
          chargeCount: 0,
          chargeVolume: 0,
          chargeFees: 0,
          withdrawalFeeCount: 0,
          withdrawalVolume: 0,
          withdrawalFees: 0,
          totalVolume: 0,
          totalFees: 0,
          merchantPayout: 0,
          _commissionSum: 0,
        });
      }
      const entry = grouped.get(type);
      entry.merchantCount += 1;
      entry.chargeCount += m.chargeCount;
      entry.chargeVolume += m.chargeVolume;
      entry.chargeFees += m.chargeFees;
      entry.withdrawalFeeCount += m.withdrawalFeeCount;
      entry.withdrawalVolume += m.withdrawalVolume;
      entry.withdrawalFees += m.withdrawalFees;
      entry.totalVolume += m.chargeVolume + m.withdrawalVolume;
      entry.totalFees += m.totalFees;
      entry.merchantPayout += m.merchantPayout;
      entry._commissionSum += m.commissionPct;
    }

    return [...grouped.values()]
      .map(({ _commissionSum, ...e }) => ({
        ...e,
        avgCommissionPct: Math.round((_commissionSum / e.merchantCount) * 100) / 100,
      }))
      .sort((a, b) => b.totalFees - a.totalFees);
  }

  /**
   * Detalle de cada fee cobrado — charges y withdrawal_confirmed mezclados
   */
  async getFeeTransactions() {
    const [charges, withdrawalFeeTxs, merchants] = await Promise.all([
      this.getChargeTxs(),
      this.getWithdrawalFeeTxs(),
      this.merchants.findAll(),
    ]);
    const merchantMap = new Map(merchants.map((m) => [m.id, m]));

    const chargeRows = charges.map((tx) => {
      const m = merchantMap.get(tx.metadata.merchantId);
      return {
        txId: tx.id,
        timestamp: tx.timestamp,
        reference: tx.reference,
        txType: 'charge' as const,
        merchantId: tx.metadata.merchantId,
        merchantName: m?.name ?? 'Unknown',
        merchantType: m?.type ?? 'UNKNOWN',
        totalAmount: Number(tx.metadata.totalAmount),
        feeAmount: Number(tx.metadata.feeAmount),
        merchantAmount: Number(tx.metadata.totalAmount) - Number(tx.metadata.feeAmount),
        commissionPct: Number(tx.metadata.commissionPct),
        withdrawalFeePct: null as number | null,
      };
    });

    const withdrawalRows = withdrawalFeeTxs.map((tx) => {
      const m = merchantMap.get(tx.metadata.merchantId);
      const gross = Number(tx.metadata.grossAmount ?? tx.metadata.totalAmount);
      const fee = Number(tx.metadata.feeAmount);
      return {
        txId: tx.id,
        timestamp: tx.timestamp,
        reference: tx.reference,
        txType: 'withdrawal_confirmed' as const,
        merchantId: tx.metadata.merchantId,
        merchantName: m?.name ?? 'Unknown',
        merchantType: m?.type ?? 'UNKNOWN',
        totalAmount: gross,
        feeAmount: fee,
        merchantAmount: gross - fee,
        commissionPct: null as number | null,
        withdrawalFeePct: m?.withdrawalFeePct ?? null,
      };
    });

    return [...chargeRows, ...withdrawalRows].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Truncate DB + reset ledger — borra todos los datos, preserva enums y schema
   */
  async resetDatabase() {
    await Promise.all([
      this.prisma.$executeRaw`TRUNCATE TABLE merchants RESTART IDENTITY CASCADE`,
      this.ledger.resetLedger(),
    ]);
    return { message: 'Database and ledger reset — all data deleted' };
  }

  /**
   * Crea los merchants semilla definidos en seed.data.ts
   */
  async seedDatabase() {
    const created = await Promise.all(
      SEED_MERCHANTS.map((data) => this.merchants.create(data)),
    );
    return created.map((m) => ({ id: m.id, name: m.name, type: m.type }));
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
