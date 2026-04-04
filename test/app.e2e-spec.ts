import axios, { AxiosError } from 'axios';

const BASE_URL = 'http://localhost:3001/api';

const api = axios.create({
  baseURL: BASE_URL,
  validateStatus: () => true, // Never throw on HTTP errors, let tests assert
});

describe('Bendo API E2E Tests', () => {
  let merchantId: string;
  let walletMerchantId: string;

  // ──────────────────────────────────────────────────────────────────────
  // MERCHANTS
  // ──────────────────────────────────────────────────────────────────────
  describe('Merchants', () => {
    it('POST /merchants - crear merchant exitoso (RETAIL)', async () => {
      const res = await api.post('/merchants', {
        name: 'E2E Test Merchant RETAIL',
        type: 'RETAIL',
        commissionPct: 5,
        walletEnabled: false,
      });

      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('id');
      expect(res.data.name).toBe('E2E Test Merchant RETAIL');
      expect(res.data.type).toBe('RETAIL');
      expect(res.data.commissionPct).toBe(5);
      expect(res.data.walletEnabled).toBe(false);
      expect(res.data.status).toBe('ACTIVE');

      merchantId = res.data.id;
    });

    it('POST /merchants - crear merchant con wallet enabled (SALUD)', async () => {
      const res = await api.post('/merchants', {
        name: 'E2E Test Merchant SALUD',
        type: 'SALUD',
        commissionPct: 3,
        walletEnabled: true,
      });

      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('id');
      expect(res.data.name).toBe('E2E Test Merchant SALUD');
      expect(res.data.type).toBe('SALUD');
      expect(res.data.walletEnabled).toBe(true);

      walletMerchantId = res.data.id;
    });

    it('POST /merchants - validación: sin name retorna 400', async () => {
      const res = await api.post('/merchants', {
        type: 'RETAIL',
        commissionPct: 5,
      });

      expect(res.status).toBe(400);
    });

    it('POST /merchants - validación: type inválido retorna 400', async () => {
      const res = await api.post('/merchants', {
        name: 'Invalid Type Merchant',
        type: 'INVALIDO',
        commissionPct: 5,
      });

      expect(res.status).toBe(400);
    });

    it('GET /merchants - listar todos los merchants', async () => {
      const res = await api.get('/merchants');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);

      const ids = res.data.map((m: any) => m.id);
      expect(ids).toContain(merchantId);
      expect(ids).toContain(walletMerchantId);
    });

    it('GET /merchants?type=RETAIL - filtrar por tipo', async () => {
      const res = await api.get('/merchants', { params: { type: 'RETAIL' } });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      res.data.forEach((m: any) => expect(m.type).toBe('RETAIL'));

      const ids = res.data.map((m: any) => m.id);
      expect(ids).toContain(merchantId);
    });

    it('GET /merchants?walletEnabled=true - filtrar por walletEnabled', async () => {
      const res = await api.get('/merchants', { params: { walletEnabled: 'true' } });

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);
      res.data.forEach((m: any) => expect(m.walletEnabled).toBe(true));

      const ids = res.data.map((m: any) => m.id);
      expect(ids).toContain(walletMerchantId);
    });

    it('GET /merchants/:id - obtener merchant por ID con balance', async () => {
      const res = await api.get(`/merchants/${merchantId}`);

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('id', merchantId);
      expect(res.data).toHaveProperty('name');
      expect(res.data).toHaveProperty('type');
      expect(res.data).toHaveProperty('commissionPct');
      expect(res.data).toHaveProperty('walletEnabled');
      expect(res.data).toHaveProperty('status');
      expect(res.data).toHaveProperty('balance');
      expect(typeof res.data.balance).toBe('number');
    });

    it('GET /merchants/:id - merchant inexistente retorna 404', async () => {
      const res = await api.get('/merchants/non-existent-id-12345');

      expect(res.status).toBe(404);
    });

    it('PATCH /merchants/:id - actualizar commissionPct', async () => {
      const res = await api.patch(`/merchants/${merchantId}`, {
        commissionPct: 7,
      });

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('id', merchantId);
      expect(res.data.commissionPct).toBe(7);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // CHECKOUT
  // ──────────────────────────────────────────────────────────────────────
  describe('Checkout', () => {
    it('POST /checkout/:merchantId/charge - cobro exitoso', async () => {
      const res = await api.post(`/checkout/${merchantId}/charge`, {
        amount: 10000,
        description: 'Test charge E2E',
      });

      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('transactionId');
      expect(res.data).toHaveProperty('merchantId', merchantId);
      expect(res.data).toHaveProperty('totalAmount', 10000);
      expect(res.data).toHaveProperty('feeAmount');
      expect(res.data).toHaveProperty('merchantAmount');
      expect(res.data).toHaveProperty('commissionPct');
      expect(res.data).toHaveProperty('reference');
      expect(res.data).toHaveProperty('timestamp');
      expect(typeof res.data.feeAmount).toBe('number');
      expect(typeof res.data.merchantAmount).toBe('number');
      expect(res.data.feeAmount + res.data.merchantAmount).toBe(10000);
    });

    it('GET /checkout/:merchantId/transactions - historial de cobros', async () => {
      const res = await api.get(`/checkout/${merchantId}/transactions`);

      expect(res.status).toBe(200);
      // The ledger returns a paginated structure
      expect(res.data).toBeDefined();
      // Should have cursor or data property from Formance Ledger
      const txList = res.data?.cursor?.data ?? res.data?.data ?? res.data;
      expect(Array.isArray(txList)).toBe(true);
      expect(txList.length).toBeGreaterThan(0);
    });

    it('POST /checkout/:merchantId/charge - merchant inexistente retorna 404', async () => {
      const res = await api.post('/checkout/non-existent-id-12345/charge', {
        amount: 10000,
        description: 'Test',
      });

      expect(res.status).toBe(404);
    });

    it('POST /checkout/:merchantId/charge - monto 0 retorna 400', async () => {
      const res = await api.post(`/checkout/${merchantId}/charge`, {
        amount: 0,
        description: 'Zero amount test',
      });

      expect(res.status).toBe(400);
    });

    it('POST /checkout/:merchantId/charge - monto negativo retorna 400', async () => {
      const res = await api.post(`/checkout/${merchantId}/charge`, {
        amount: -500,
        description: 'Negative amount test',
      });

      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // WALLET
  // ──────────────────────────────────────────────────────────────────────
  describe('Wallet', () => {
    // First: charge the wallet merchant so it has balance
    beforeAll(async () => {
      await api.post(`/checkout/${walletMerchantId}/charge`, {
        amount: 20000,
        description: 'Funding wallet for E2E test',
      });
    });

    it('GET /wallet/merchants - listar merchants con wallet', async () => {
      const res = await api.get('/wallet/merchants');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.data)).toBe(true);

      const ids = res.data.map((m: any) => m.id);
      expect(ids).toContain(walletMerchantId);

      // Non-wallet merchant should NOT be in this list
      expect(ids).not.toContain(merchantId);
    });

    it('GET /wallet/:merchantId - balance del wallet merchant', async () => {
      const res = await api.get(`/wallet/${walletMerchantId}`);

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('merchantId', walletMerchantId);
      expect(res.data).toHaveProperty('merchantName');
      expect(res.data).toHaveProperty('available');
      expect(res.data).toHaveProperty('inWithdrawal');
      expect(res.data).toHaveProperty('total');
      expect(typeof res.data.available).toBe('number');
      expect(typeof res.data.inWithdrawal).toBe('number');
    });

    it('GET /wallet/:merchantId/movements - historial de movimientos', async () => {
      const res = await api.get(`/wallet/${walletMerchantId}/movements`);

      expect(res.status).toBe(200);
      expect(res.data).toBeDefined();
    });

    it('POST /wallet/:merchantId/withdraw - iniciar retiro', async () => {
      // Get available balance first
      const balanceRes = await api.get(`/wallet/${walletMerchantId}`);
      expect(balanceRes.status).toBe(200);

      const available = balanceRes.data.available;

      if (available <= 0) {
        // Skip if no balance
        console.warn('No balance available for withdrawal test, skipping withdrawal amount check');
        return;
      }

      const withdrawAmount = Math.floor(available / 2);
      if (withdrawAmount <= 0) return;

      const res = await api.post(`/wallet/${walletMerchantId}/withdraw`, {
        amount: withdrawAmount,
      });

      expect(res.status).toBe(201);
      expect(res.data).toHaveProperty('merchantId', walletMerchantId);
      expect(res.data).toHaveProperty('amount', withdrawAmount);
      expect(res.data).toHaveProperty('reference');
      expect(res.data).toHaveProperty('status', 'completed');
      expect(res.data).toHaveProperty('timestamp');
    });

    it('POST /wallet/:merchantId/withdraw - merchant sin wallet retorna 400', async () => {
      const res = await api.post(`/wallet/${merchantId}/withdraw`, {
        amount: 1000,
      });

      // merchantId does NOT have walletEnabled, so should return 400
      expect(res.status).toBe(400);
    });

    it('POST /wallet/:merchantId/withdraw - retiro mayor al saldo retorna 400', async () => {
      const res = await api.post(`/wallet/${walletMerchantId}/withdraw`, {
        amount: 999999999,
      });

      expect(res.status).toBe(400);
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // BACKOFFICE
  // ──────────────────────────────────────────────────────────────────────
  describe('Backoffice', () => {
    it('GET /backoffice/stats - estructura de respuesta', async () => {
      const res = await api.get('/backoffice/stats');

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('totalMerchants');
      expect(res.data).toHaveProperty('activeMerchants');
      expect(res.data).toHaveProperty('walletsEnabled');
      expect(res.data).toHaveProperty('totalFeesCollected');
      expect(typeof res.data.totalMerchants).toBe('number');
      expect(typeof res.data.activeMerchants).toBe('number');
      expect(res.data.totalMerchants).toBeGreaterThan(0);
    });

    it('GET /backoffice/transactions - lista de transacciones', async () => {
      const res = await api.get('/backoffice/transactions');

      expect(res.status).toBe(200);
      expect(res.data).toBeDefined();

      const txList = res.data?.cursor?.data ?? res.data?.data ?? res.data;
      expect(Array.isArray(txList)).toBe(true);
      expect(txList.length).toBeGreaterThan(0);
    });

    it('GET /backoffice/accounts - lista de cuentas', async () => {
      const res = await api.get('/backoffice/accounts');

      expect(res.status).toBe(200);
      expect(res.data).toBeDefined();

      const acctList = res.data?.cursor?.data ?? res.data?.data ?? res.data;
      expect(Array.isArray(acctList)).toBe(true);
      expect(acctList.length).toBeGreaterThan(0);
    });

    it('GET /backoffice/merchants/:id/ledger - detalle del merchant en el ledger', async () => {
      const res = await api.get(`/backoffice/merchants/${merchantId}/ledger`);

      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty('merchant');
      expect(res.data).toHaveProperty('accounts');
      expect(res.data).toHaveProperty('transactions');
      expect(res.data.merchant).toHaveProperty('id', merchantId);
    });

    it('GET /backoffice/logs - logs de auditoría', async () => {
      const res = await api.get('/backoffice/logs');

      expect(res.status).toBe(200);
      expect(res.data).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────────
  // CLEANUP
  // ──────────────────────────────────────────────────────────────────────
  afterAll(async () => {
    if (merchantId) {
      await api.patch(`/merchants/${merchantId}`, { status: 'INACTIVE' });
    }
    if (walletMerchantId) {
      await api.patch(`/merchants/${walletMerchantId}`, { status: 'INACTIVE' });
    }
  });
});
