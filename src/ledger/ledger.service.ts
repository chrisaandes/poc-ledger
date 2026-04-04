import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';

export interface Posting {
  source: string;
  destination: string;
  amount: number;
  asset: string;
}

export interface CreateTransactionDto {
  postings: Posting[];
  metadata?: Record<string, string>;
  reference?: string;
}

@Injectable()
export class LedgerService implements OnModuleInit {
  private client: AxiosInstance;
  private ledgerName: string;
  private readonly logger = new Logger(LedgerService.name);

  constructor() {
    const baseURL = process.env.LEDGER_URL || 'http://localhost:8080/api/ledger/v2';
    this.ledgerName = process.env.LEDGER_NAME || 'bendo';
    this.client = axios.create({ baseURL, headers: { 'Content-Type': 'application/json' } });
  }

  async onModuleInit() {
    try {
      await this.client.post(`/${this.ledgerName}`);
      this.logger.log(`Ledger "${this.ledgerName}" created`);
    } catch (e) {
      // 409 = already exists, fine
      if (e.response?.status !== 409) {
        this.logger.warn(`Ledger init: ${e.message}`);
      }
      this.logger.log(`Ledger "${this.ledgerName}" already exists`);
    }
  }

  // --- Transactions ---

  async createTransaction(data: CreateTransactionDto) {
    const res = await this.client.post(`/${this.ledgerName}/transactions`, data);
    return res.data;
  }

  async getTransaction(txId: number) {
    const res = await this.client.get(`/${this.ledgerName}/transactions/${txId}`);
    return res.data;
  }

  async listTransactions(params?: {
    pageSize?: number;
    after?: string;
    account?: string;
    destination?: string;
    source?: string;
    reference?: string;
    merchantId?: string; // client-side filter — Formance v2.4.0 ignores server-side filters
  }) {
    const { merchantId, ...queryParams } = params ?? {};

    if (!merchantId) {
      const res = await this.client.get(`/${this.ledgerName}/transactions`, { params: queryParams });
      return res.data;
    }

    // Paginate through ALL pages to filter by merchantId client-side
    // (Formance v2.4.0 ignores account/destination/metadata query params)
    const allTxs: any[] = [];
    let cursor: string | undefined;

    do {
      const res = await this.client.get(`/${this.ledgerName}/transactions`, {
        params: { pageSize: 100, ...(cursor ? { after: cursor } : {}) },
      });
      const page = res.data.cursor;
      allTxs.push(...page.data);
      cursor = page.hasMore ? page.next : undefined;
    } while (cursor);

    const filtered = allTxs.filter((tx: any) =>
      tx.metadata?.merchantId === merchantId ||
      tx.postings?.some((p: any) =>
        p.destination?.startsWith(`merchants:${merchantId}:`) ||
        p.source?.startsWith(`merchants:${merchantId}:`),
      ),
    );

    return { cursor: { pageSize: filtered.length, hasMore: false, data: filtered } };
  }

  async getAllTransactions(): Promise<any[]> {
    const all: any[] = [];
    let cursor: string | undefined;
    try {
      do {
        const res = await this.client.get(`/${this.ledgerName}/transactions`, {
          params: { pageSize: 100, ...(cursor ? { after: cursor } : {}) },
        });
        const page = res.data.cursor;
        all.push(...page.data);
        cursor = page.hasMore ? page.next : undefined;
      } while (cursor);
    } catch (e) {
      if (e.response?.status === 404) return [];
      throw e;
    }
    return all;
  }

  // --- Accounts ---

  async getAccount(address: string, params?: Record<string, string>) {
    const res = await this.client.get(`/${this.ledgerName}/accounts/${address}`, { params });
    return res.data;
  }

  async listAccounts(params?: {
    pageSize?: number;
    after?: string;
    address?: string;
  }) {
    const res = await this.client.get(`/${this.ledgerName}/accounts`, { params });
    return res.data;
  }

  async getBalance(address: string): Promise<Record<string, { input: number; output: number }>> {
    try {
      const account = await this.getAccount(address, { expand: 'volumes' });
      return account?.data?.volumes || {};
    } catch (e) {
      if (e.response?.status === 404) return {};
      throw e;
    }
  }

  async getAvailableBalance(address: string, asset = 'USD/2'): Promise<number> {
    const volumes = await this.getBalance(address);
    const vol = volumes[asset];
    if (!vol) return 0;
    return (vol.input || 0) - (vol.output || 0);
  }

  // --- Logs ---

  async listLogs(params?: { pageSize?: number; after?: string }) {
    const res = await this.client.get(`/${this.ledgerName}/logs`, { params });
    return res.data;
  }

  // --- Admin ---

  /**
   * Elimina y recrea el ledger — borra todas las transacciones, cuentas y logs
   */
  async resetLedger() {
    try {
      await this.client.delete(`/${this.ledgerName}`);
      this.logger.log(`Ledger "${this.ledgerName}" deleted`);
    } catch (e) {
      this.logger.warn(`Ledger delete: ${e.response?.status} ${e.message}`);
    }

    try {
      await this.client.post(`/${this.ledgerName}`);
      this.logger.log(`Ledger "${this.ledgerName}" recreated`);
    } catch (e) {
      this.logger.warn(`Ledger recreate: ${e.response?.status} ${e.message}`);
    }
  }

  // --- Metadata ---

  async setAccountMetadata(address: string, metadata: Record<string, string>) {
    const res = await this.client.post(`/${this.ledgerName}/accounts/${address}/metadata`, metadata);
    return res.data;
  }

  // --- Helpers ---

  /**
   * Crea un cobro con split de comisión.
   * amount en centavos (USD/2): $100 = 10000
   */
  async createCharge(merchantId: string, amount: number, commissionPct: number, reference?: string) {
    const feeAmount = Math.round(amount * (commissionPct / 100));
    const merchantAmount = amount - feeAmount;

    const postings: Posting[] = [
      {
        source: 'world',
        destination: `merchants:${merchantId}:available`,
        amount: merchantAmount,
        asset: 'USD/2',
      },
    ];

    if (feeAmount > 0) {
      postings.push({
        source: 'world',
        destination: `bendo:fees`,
        amount: feeAmount,
        asset: 'USD/2',
      });
    }

    return this.createTransaction({
      postings,
      reference,
      metadata: {
        type: 'charge',
        merchantId,
        totalAmount: String(amount),
        feeAmount: String(feeAmount),
        commissionPct: String(commissionPct),
      },
    });
  }

  /**
   * Mueve fondos de available a withdrawals (hold para retiro)
   */
  async createWithdrawal(merchantId: string, amount: number, reference?: string) {
    return this.createTransaction({
      postings: [
        {
          source: `merchants:${merchantId}:available`,
          destination: `merchants:${merchantId}:withdrawals`,
          amount,
          asset: 'USD/2',
        },
      ],
      reference,
      metadata: {
        type: 'withdrawal',
        merchantId,
        amount: String(amount),
      },
    });
  }

  /**
   * Confirma retiro: de withdrawals a banco, con split de fee a bendo:fees si aplica.
   * netAmount = amount - feeAmount
   */
  async confirmWithdrawal(
    merchantId: string,
    amount: number,
    feeAmount: number,
    reference?: string,
  ) {
    const netAmount = amount - feeAmount;
    const postings: Posting[] = [
      {
        source: `merchants:${merchantId}:withdrawals`,
        destination: 'bank:settlements',
        amount: netAmount,
        asset: 'USD/2',
      },
    ];

    if (feeAmount > 0) {
      postings.push({
        source: `merchants:${merchantId}:withdrawals`,
        destination: 'bendo:fees',
        amount: feeAmount,
        asset: 'USD/2',
      });
    }

    return this.createTransaction({
      postings,
      reference,
      metadata: {
        type: 'withdrawal_confirmed',
        merchantId,
        totalAmount: String(amount),   // alias uniforme para earnings
        grossAmount: String(amount),   // retrocompatibilidad con TXs históricas
        feeAmount: String(feeAmount),
        netAmount: String(netAmount),
      },
    });
  }
}
