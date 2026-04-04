# Bendo API - Formance Ledger Wrapper

API TypeScript (NestJS) que wrapea el Formance Ledger para el POC de Bendo Wallet.

## Setup en el VPS

```bash
# 1. Instalar Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# 2. Copiar este proyecto al VPS
cd ~/bendo-api

# 3. Levantar PostgreSQL para la API (separado del ledger)
docker compose up -d

# 4. Instalar dependencias
npm install

# 5. Generar Prisma client y correr migraciones
npx prisma generate
npx prisma migrate dev --name init

# 6. Arrancar en dev
npm run start:dev

# 7. Para producción
npm run build
npm run start:prod
```

## URLs

- API: `http://TU_IP:3001/api`
- Swagger: `http://TU_IP:3001/docs`
- Ledger Console: `http://TU_IP:3000`

## Endpoints

### Merchants
- `POST /api/merchants` — Crear merchant
- `GET /api/merchants` — Listar (filtros: type, walletEnabled, status)
- `GET /api/merchants/:id` — Detalle + balance
- `PATCH /api/merchants/:id` — Editar

### Checkout
- `POST /api/checkout/:merchantId/charge` — Cobrar
- `GET /api/checkout/:merchantId/transactions` — Historial

### Wallet
- `GET /api/wallet/merchants` — Merchants con wallet activa
- `GET /api/wallet/:merchantId` — Balance
- `GET /api/wallet/:merchantId/movements` — Movimientos
- `POST /api/wallet/:merchantId/withdraw` — Retirar

### Backoffice
- `GET /api/backoffice/stats` — Stats generales
- `GET /api/backoffice/transactions` — Todas las transacciones
- `GET /api/backoffice/transactions/:txId` — Detalle tx
- `GET /api/backoffice/accounts` — Todas las cuentas
- `GET /api/backoffice/merchants/:merchantId/ledger` — Detalle ledger del merchant
- `GET /api/backoffice/logs` — Logs de trazabilidad

## Modelo de cuentas en el Ledger

```
@world                              → entrada de dinero
@bendo:fees                         → comisiones Bendo
@merchants:{id}:available           → saldo disponible
@merchants:{id}:withdrawals         → retiros en proceso
@bank:settlements                   → salida a banco
```
