# Bendo API — Architecture Documentation

## Table of Contents

1. [Overview](#1-overview)
2. [What It Does NOT Do](#2-what-it-does-not-do)
3. [Architecture & Module Structure](#3-architecture--module-structure)
4. [API Endpoints Reference](#4-api-endpoints-reference)
5. [Data Model (PostgreSQL)](#5-data-model-postgresql)
6. [Formance Ledger — Deep Dive](#6-formance-ledger--deep-dive)
7. [Financial Flows](#7-financial-flows)
8. [Known Limitations & Design Decisions](#8-known-limitations--design-decisions)
9. [Environment & Configuration](#9-environment--configuration)

---

## 1. Overview

Bendo API is a **payment orchestration backend** for multi-merchant platforms. It allows merchants to receive payments, track their balances, and request withdrawals — while giving platform operators (Bendo) a centralized backoffice to monitor earnings, audit transactions, and manage the system.

The system is built on two storage backends with clearly separated responsibilities:

| Backend | Role | What lives there |
|---|---|---|
| **PostgreSQL** (via Prisma) | Business configuration | Merchant records, fee settings, feature flags |
| **Formance Ledger** | Financial state | Every transaction, every balance, every movement |

This separation is intentional and central to the architecture: financial data is immutable and lives in a purpose-built double-entry ledger, while mutable configuration data lives in a relational database optimized for that purpose.

### Why was this built this way?

Traditional payment backends store financial data in regular SQL tables (`transactions`, `balances`, etc.). This approach has well-known failure modes: balance drift from application bugs, no native audit trail, and the need to implement double-entry accounting manually. Bendo takes a different approach by delegating all financial state to a dedicated ledger engine (Formance), which enforces double-entry accounting at the storage layer — not the application layer.

---

## 2. What It Does NOT Do

These are explicit non-goals. Understanding them helps explain several architectural choices.

- **Does not store transaction data in PostgreSQL.** All financial state (balances, movements, fees) lives in Formance Ledger only. PostgreSQL holds zero financial rows.

- **Does not implement authentication or authorization.** This is a proof-of-concept. Every endpoint is publicly accessible. In production, an auth layer (JWT, API keys, OAuth) would be added before any module.

- **Does not handle currency conversion.** All amounts are in USD only, stored as integer cents (USD/2). There is no FX logic.

- **Does not connect to a real bank.** The `bank:settlements` account in the ledger represents funds queued for payout, but no actual bank API (Plaid, Stripe Payouts, ACH) is called. Settlement is a ledger entry, not a wire transfer.

- **Does not implement async withdrawal confirmation.** In production, Phase 2 of a withdrawal (confirm + settle) would be triggered by a bank callback after the batch processes. Here, both phases execute synchronously in the same HTTP request.

- **Does not implement disputes or chargebacks.** There is no mechanism to reverse a charge or initiate a refund flow.

- **Does not store PII.** No card numbers, bank account numbers, or personal identifiable information of any kind. Bendo is a ledger orchestrator, not a payment processor.

---

## 3. Architecture & Module Structure

### High-Level System Diagram

```
                    +------------------+
                    |   HTTP Clients   |
                    | (merchants, ops) |
                    +--------+---------+
                             |
                    +--------v---------+
                    |   Bendo API      |
                    |   NestJS :3001   |
                    +--+--+--+--+--+--+
                       |  |  |  |  |
          +------------+  |  |  |  +------------------+
          |               |  |  |                     |
    +-----v-----+   +-----v--v-----+   +--------------v------+
    | Merchants |   |   Checkout   |   |      Backoffice     |
    |  Module   |   |    Module    |   |       Module        |
    +-----+-----+   +------+-------+   +----------+----------+
          |                |                      |
    +-----v-----+   +------v---+        +---------v---------+
    |  Wallet   |   | Ledger   |        |    Prisma Module  |
    |  Module   +---> Module   <--------+   (PostgreSQL)    |
    +-----------+   | (Formance|        +-------------------+
                    |  Client) |
                    +-----+----+
                          |
              +-----------v-----------+
              |  Formance Ledger v2.4 |
              |  45.32.141.0:8080     |
              +-----------------------+
```

### Module Dependency Graph

```
AppModule
├── PrismaModule          (PostgreSQL — merchant config)
├── LedgerModule          (Formance HTTP client wrapper)
├── MerchantsModule    -> PrismaModule, LedgerModule
├── CheckoutModule     -> LedgerModule, MerchantsModule
├── WalletModule       -> LedgerModule, MerchantsModule
└── BackofficeModule   -> LedgerModule, MerchantsModule, PrismaModule
```

### Module Responsibilities

**PrismaModule** — Singleton service that wraps the Prisma client. Provides the database connection used by any module that needs PostgreSQL access.

**LedgerModule** — Thin HTTP client wrapper around the Formance Ledger API. Exposes methods like `createTransaction()`, `getAccount()`, `listTransactions()`, `getLogs()`, etc. All other modules interact with Formance exclusively through this module — no module calls Formance directly.

**MerchantsModule** — Manages merchant lifecycle (create, read, update). Reads from PostgreSQL. When a merchant is created, a corresponding ledger account (`merchants:{id}:available`) is initialized in Formance.

**CheckoutModule** — Handles payment ingestion. Receives charge requests, looks up the merchant's commission rate, and posts a double-entry transaction to the ledger splitting the payment between the merchant and the platform fee account.

**WalletModule** — Merchant-facing self-service. Guarded by `walletEnabled` flag on the merchant record. Lets merchants view their balance, browse their movement history, and request withdrawals.

**BackofficeModule** — Admin/operator tools. Provides earnings analytics, full ledger introspection, system statistics, and destructive operations (seed, reset).

---

## 4. API Endpoints Reference

All endpoints are prefixed with `/api`. Interactive documentation is available at `/docs` (Swagger UI) and `/api/openapi.json`.

### Merchants

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/merchants` | Create a new merchant |
| `GET` | `/api/merchants` | List all merchants |
| `GET` | `/api/merchants/:id` | Get a merchant by ID |
| `PATCH` | `/api/merchants/:id` | Update merchant fields |

### Checkout

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/checkout/:merchantId/charge` | Process a payment for a merchant |
| `GET` | `/api/checkout/:merchantId/transactions` | List transactions for a merchant |

### Wallet

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/wallet/merchants` | List all wallet-enabled merchants |
| `GET` | `/api/wallet/:id` | Get a merchant's current balance |
| `GET` | `/api/wallet/:id/movements` | List balance movements (credits/debits) |
| `POST` | `/api/wallet/:id/withdraw` | Request a withdrawal |

### Backoffice

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/backoffice/stats` | System-wide stats (merchants, volume, fees) |
| `GET` | `/api/backoffice/earnings` | Total platform earnings summary |
| `GET` | `/api/backoffice/earnings/merchants` | Earnings broken down by merchant |
| `GET` | `/api/backoffice/earnings/by-type` | Earnings grouped by merchant type |
| `GET` | `/api/backoffice/earnings/transactions` | All fee-generating transactions |
| `GET` | `/api/backoffice/transactions` | Full transaction list from ledger |
| `GET` | `/api/backoffice/transactions/:txId` | Single transaction detail |
| `GET` | `/api/backoffice/accounts` | All ledger accounts and balances |
| `GET` | `/api/backoffice/merchants/:id/ledger` | All ledger data for one merchant |
| `GET` | `/api/backoffice/logs` | Immutable ledger audit log |
| `POST` | `/api/backoffice/seed` | Seed demo data |
| `DELETE` | `/api/backoffice/reset` | Wipe DB and ledger (dev only) |

---

## 5. Data Model (PostgreSQL)

PostgreSQL stores only merchant configuration. There is no financial data here.

### Merchant Table

```
Merchant
├── id              String (UUID, PK)
├── name            String
├── type            Enum: SALUD | RETAIL | EDUCACION | OTRO
├── commissionPct   Float   -- % fee taken on each charge (e.g. 3.0 = 3%)
├── withdrawalFeePct Float  -- % fee taken on each withdrawal (e.g. 1.5 = 1.5%)
├── walletEnabled   Boolean -- gates access to wallet endpoints
├── status          Enum: ACTIVE | INACTIVE
├── createdAt       DateTime
└── updatedAt       DateTime
```

The `commissionPct` and `withdrawalFeePct` fields are read at transaction time to compute the split. They are embedded in Formance transaction metadata so the ledger record is self-contained and does not depend on the PostgreSQL record for historical accuracy.

---

## 6. Formance Ledger — Deep Dive

### What is Formance Ledger?

Formance Ledger is an **open-source, programmable financial ledger** built on double-entry accounting principles. It is self-hosted (deployed at `45.32.141.0:8080` for this project) and exposes a REST API for creating transactions, querying account balances, and reading audit logs.

Unlike a regular database table that stores transactions as rows, Formance treats the ledger as an **append-only accounting system** where:

- Every transaction has at least two entries (a debit and a credit).
- The sum of all movements in any transaction always equals zero — money is never created or destroyed, only moved between accounts.
- No transaction can be deleted or modified after creation.

### Account Structure

Bendo uses a single Formance ledger named `"bendo"`. All merchants share this ledger, with isolation enforced by account naming conventions:

```
world
  The universal source of funds. In ledger accounting, "world" is a
  virtual account that represents the external world. When a customer
  pays, the credit originates from `world`. This is standard
  double-entry practice — there must always be a source account.

merchants:{id}:available
  The merchant's spendable balance. This is what the merchant sees
  as their wallet balance. Example: merchants:abc123:available

merchants:{id}:withdrawals
  A hold account used during withdrawal processing. Funds move here
  from :available during Phase 1, then to bank:settlements during
  Phase 2. This enforces that funds in transit cannot be double-spent.

bendo:fees
  The platform's revenue accumulator. Every charge and every withdrawal
  contributes a fee amount to this account. This is Bendo's income.

bank:settlements
  Funds queued for actual bank payout. In a production system, a
  batch job would read this account and initiate real bank transfers.
  In this implementation it is a ledger account only.
```

### Amount Encoding

All amounts are stored as **integer cents** (USD/2):

```
$100.00  →  10000
$97.00   →   9700
$3.00    →    300
$1.46    →    146
```

This avoids floating-point precision errors entirely. The API accepts and returns cent integers. Display formatting is the responsibility of the client.

### Transaction Metadata

Each Formance transaction carries a `metadata` object. Bendo uses this to store context that enables analytics without a secondary database:

```json
{
  "type": "charge",
  "merchantId": "abc123",
  "totalAmount": "10000",
  "feeAmount": "300",
  "commissionPct": "3"
}
```

For withdrawals:
```json
{
  "type": "withdrawal_confirmed",
  "merchantId": "abc123",
  "totalAmount": "9700",
  "feeAmount": "146",
  "netAmount": "9554",
  "withdrawalFeePct": "1.5"
}
```

This metadata is queryable and is used by the Backoffice earnings endpoints to compute analytics.

### Why Formance Was Chosen

**1. Immutability as a correctness guarantee**
Transactions in Formance cannot be deleted or updated. The audit trail is permanent. This is a hard requirement for financial systems — it eliminates an entire class of bugs and fraud vectors that exist when financial data lives in mutable SQL tables.

**2. Double-entry enforcement at the storage layer**
Formance rejects any transaction where debits do not equal credits. This means balance drift is impossible — the ledger's mathematical integrity is enforced by the engine, not by application code. If Bendo's application code had a bug in the fee calculation, the transaction would still be balanced; the incorrect split would be visible in metadata for correction, but no money would be lost from the accounting system.

**3. Named accounts as a multi-tenant model**
The account naming scheme (`merchants:{id}:available`) provides natural namespace isolation without requiring separate ledger instances per merchant. All merchant balances can be listed by querying all accounts matching the pattern.

**4. Built-in volume tracking**
Formance accounts natively track `input` volume (total debits received) and `output` volume (total credits sent). The current balance is simply `input - output`. There is no need to sum transaction rows to compute a balance — it is a first-class field on the account object.

**5. Metadata-driven analytics**
Because every transaction carries structured metadata (type, merchantId, amounts, rates), the Backoffice module can compute earnings reports by filtering and aggregating the ledger's own data. No secondary analytics database is needed at this scale.

**6. Immutable audit log**
Formance exposes a `/logs` endpoint that records every API operation against the ledger in append-only fashion. This is a compliance requirement for financial systems and is available out of the box.

**7. Separation of concerns**
Financial state (immutable, append-only, mathematically enforced) is cleanly separated from business state (mutable, relational, query-optimized). Each database is used for what it is best at. This separation makes the system easier to reason about — a bug in merchant configuration does not risk corrupting financial balances, and vice versa.

**8. Open source and self-hosted**
Formance is MIT-licensed and runs as a Docker container. There are no per-transaction fees, no vendor lock-in, and the instance is fully controlled. For a payment platform that aims to avoid margin erosion, this is significant.

---

## 7. Financial Flows

### Charge Flow

A customer pays $100.00 to a merchant configured with 3% commission.

```
Input:
  totalAmount  = $100.00 = 10000 cents
  commissionPct = 3%
  feeAmount    = 300 cents  (10000 * 0.03)
  netAmount    = 9700 cents (10000 - 300)

Ledger transaction (single atomic entry):

  world  ──────────────────────────►  merchants:abc123:available   9700
  world  ──────────────────────────►  bendo:fees                    300
                                                              ──────────
                                                Total debited:     10000
                                                Total credited:    10000 ✓
```

After this transaction:
- `merchants:abc123:available` balance increases by $97.00
- `bendo:fees` balance increases by $3.00
- `world` is reduced by $100.00 (net outflow from external world)

Transaction metadata stored on this entry:
```
type          = "charge"
merchantId    = "abc123"
totalAmount   = "10000"
feeAmount     = "300"
commissionPct = "3"
```

### Withdrawal Flow (Two-Phase)

A merchant requests withdrawal of their full $97.00 balance. Their `withdrawalFeePct` is 1.5%.

```
Input:
  requestedAmount  = $97.00 = 9700 cents
  withdrawalFeePct = 1.5%
  feeAmount        = 146 cents  (floor(9700 * 0.015))
  netAmount        = 9554 cents (9700 - 146)
```

**Phase 1 — Hold**

Funds move from the spendable account to a hold account. This prevents double-spend if the withdrawal fails mid-flight.

```
  merchants:abc123:available  ──────►  merchants:abc123:withdrawals   9700
```

Metadata:
```
type       = "withdrawal"
merchantId = "abc123"
amount     = "9700"
```

**Phase 2 — Settle**

The held funds are split: net amount goes to bank settlements, fee goes to Bendo.

```
  merchants:abc123:withdrawals  ──────►  bank:settlements   9554
  merchants:abc123:withdrawals  ──────►  bendo:fees          146
                                                       ──────────
                               Total debited from hold:      9700
                               Total credited out:           9700 ✓
```

Metadata:
```
type             = "withdrawal_confirmed"
merchantId       = "abc123"
totalAmount      = "9700"
feeAmount        = "146"
netAmount        = "9554"
withdrawalFeePct = "1.5"
```

After both phases:
- `merchants:abc123:available` is reduced by $97.00 (to $0.00 in this example)
- `merchants:abc123:withdrawals` returns to $0.00 (fully drained)
- `bank:settlements` increases by $95.54 (awaiting real bank payout)
- `bendo:fees` increases by $1.46 (platform revenue from withdrawal)

### Account Balance Lifecycle

```
Customer pays $100  ──►  merchants:{id}:available  +$97.00
                          bendo:fees               +$3.00

Merchant withdraws $97  ──►  merchants:{id}:available  -$97.00
                               bank:settlements         +$95.54
                               bendo:fees               +$1.46

Net platform revenue on this $100 charge:
  Charge fee:     $3.00
  Withdrawal fee: $1.46
  Total:          $4.46
```

---

## 8. Known Limitations & Design Decisions

### 1. Client-Side Merchant Filtering

**Problem:** Formance Ledger v2.4.0's server-side metadata filters are not reliable in this version. Queries like "give me all transactions for merchantId=abc123" cannot be pushed to Formance.

**Current behavior:** When the API needs merchant-specific transactions (e.g., `GET /wallet/:id/movements`), it paginates through the entire ledger and filters client-side by `metadata.merchantId`.

**Impact:** This works correctly at POC scale. At high transaction volume (millions of records), this would create latency and memory pressure. The fix would be either a Formance upgrade (newer versions have working metadata indexes) or maintaining a secondary index in PostgreSQL.

### 2. Analytics Computed On-Demand

Earnings reports (`/backoffice/earnings/*`) scan and aggregate all transactions on every request. There are no pre-computed aggregation tables or caches.

**Acceptable at:** POC/demo scale.
**Requires change at:** Production scale with frequent dashboard queries. Solution: materialized views, event-driven aggregation, or a dedicated analytics store.

### 3. Synchronous Withdrawal

Phase 1 (hold) and Phase 2 (confirm) of a withdrawal execute in the same HTTP request. In production, Phase 2 would be triggered by an external event (bank batch callback, webhook from payment processor).

The two-phase data model is already correct for async — the `merchants:{id}:withdrawals` hold account is precisely the mechanism that would support async confirmation. Only the trigger mechanism needs to change.

### 4. No Authentication

Every endpoint is publicly accessible. This is a deliberate POC trade-off to reduce implementation complexity and focus on the financial logic.

### 5. Single Shared Ledger

All merchants share one Formance ledger named `"bendo"`. Isolation is by account naming convention. This is simpler to operate than one ledger per merchant, and Formance's account model handles it naturally.

A multi-ledger approach would only make sense if regulatory requirements demanded hard data isolation between merchants (e.g., separate audit trails per legal entity).

### 6. No Real Bank Connectivity

`bank:settlements` is a ledger concept. No ACH, wire, or payout API is integrated. The architecture is correct for production; the bank integration layer simply doesn't exist yet.

---

## 9. Environment & Configuration

### Runtime

| Variable | Value | Description |
|---|---|---|
| `PORT` | `3001` | HTTP server port |
| `DATABASE_URL` | PostgreSQL connection string | Prisma database URL |
| `LEDGER_URL` | `http://45.32.141.0:8080` | Formance Ledger base URL |
| `LEDGER_NAME` | `bendo` | Formance ledger name |

### Formance Ledger

The Formance instance is self-hosted on a VPS at `45.32.141.0:8080`. It runs Formance Ledger v2.4.0. No authentication is configured on the Formance instance (access is restricted at the network level).

### API Documentation

| URL | Description |
|---|---|
| `/docs` | Swagger UI (interactive) |
| `/api/openapi.json` | OpenAPI 3.0 JSON schema |

### Technology Versions

| Technology | Version | Role |
|---|---|---|
| NestJS | Latest stable | HTTP framework |
| Node.js | 18+ | Runtime |
| Prisma | Latest stable | PostgreSQL ORM |
| PostgreSQL | 14+ | Merchant configuration store |
| Formance Ledger | 2.4.0 | Financial ledger engine |
