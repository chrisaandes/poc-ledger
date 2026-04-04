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

  /**
   * Resumen global de ganancias de Bendo
   */
  async getEarningsSummary() {
    const [charges, totalFeesBalance] = await Promise.all([
      this.getChargeTxs(),
      this.ledger.getAvailableBalance('bendo:fees'),
    ]);

    const totalVolume = charges.reduce((s, tx) => s + Number(tx.metadata.totalAmount), 0);
    const totalFees = charges.reduce((s, tx) => s + Number(tx.metadata.feeAmount), 0);
    const avgCommission =
      charges.length > 0
        ? charges.reduce((s, tx) => s + Number(tx.metadata.commissionPct), 0) / charges.length
        : 0;

    return {
      chargeCount: charges.length,
      totalVolume,
      totalFeesEarned: totalFees,
      feesInAccount: totalFeesBalance,
      avgCommissionPct: Math.round(avgCommission * 100) / 100,
      totalMerchantPayout: totalVolume - totalFees,
    };
  }

  /**
   * Fees desglosados por merchant
   */
  async getEarningsByMerchant() {
    const [charges, merchants] = await Promise.all([
      this.getChargeTxs(),
      this.merchants.findAll(),
    ]);

    const merchantMap = new Map(merchants.map((m) => [m.id, m]));
    const grouped = new Map<string, any>();

    for (const tx of charges) {
      const mid = tx.metadata.merchantId;
      if (!grouped.has(mid)) {
        const m = merchantMap.get(mid);
        grouped.set(mid, {
          merchantId: mid,
          merchantName: m?.name ?? 'Unknown',
          merchantType: m?.type ?? 'UNKNOWN',
          commissionPct: Number(tx.metadata.commissionPct),
          chargeCount: 0,
          totalVolume: 0,
          totalFees: 0,
          merchantPayout: 0,
        });
      }
      const entry = grouped.get(mid);
      entry.chargeCount += 1;
      entry.totalVolume += Number(tx.metadata.totalAmount);
      entry.totalFees += Number(tx.metadata.feeAmount);
      entry.merchantPayout += Number(tx.metadata.totalAmount) - Number(tx.metadata.feeAmount);
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
          totalVolume: 0,
          totalFees: 0,
          merchantPayout: 0,
          avgCommissionPct: 0,
          _commissionSum: 0,
        });
      }
      const entry = grouped.get(type);
      entry.merchantCount += 1;
      entry.chargeCount += m.chargeCount;
      entry.totalVolume += m.totalVolume;
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
   * Lista detallada de cada fee cobrado
   */
  async getFeeTransactions() {
    const [charges, merchants] = await Promise.all([
      this.getChargeTxs(),
      this.merchants.findAll(),
    ]);
    const merchantMap = new Map(merchants.map((m) => [m.id, m]));

    return charges.map((tx) => {
      const m = merchantMap.get(tx.metadata.merchantId);
      return {
        txId: tx.id,
        timestamp: tx.timestamp,
        reference: tx.reference,
        merchantId: tx.metadata.merchantId,
        merchantName: m?.name ?? 'Unknown',
        merchantType: m?.type ?? 'UNKNOWN',
        totalAmount: Number(tx.metadata.totalAmount),
        feeAmount: Number(tx.metadata.feeAmount),
        merchantAmount: Number(tx.metadata.totalAmount) - Number(tx.metadata.feeAmount),
        commissionPct: Number(tx.metadata.commissionPct),
      };
    });
  }

  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Truncate DB y re-siembra merchants semilla
   */
  async resetDatabase() {
    await this.prisma.$executeRaw`TRUNCATE TABLE merchants RESTART IDENTITY CASCADE`;
    const seeded = await this.seedDatabase();
    return { message: 'Database reset — merchants table truncated and reseeded', seeded };
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
