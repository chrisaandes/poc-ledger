import { Controller, Delete, Get, Param, Post, Query } from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiQuery, ApiParam,
  ApiResponse, ApiNotFoundResponse,
} from '@nestjs/swagger';
import { BackofficeService } from './backoffice.service';
import {
  StatsResponseDto,
  EarningsSummaryResponseDto,
  EarningsByMerchantResponseDto,
  EarningsByTypeResponseDto,
  FeeTransactionResponseDto,
  ResetResponseDto,
} from './dto/backoffice-response.dto';

@ApiTags('Backoffice')
@Controller('backoffice')
export class BackofficeController {
  constructor(private service: BackofficeService) {}

  // ── Stats ────────────────────────────────────────────────────────────────

  @Get('stats')
  @ApiOperation({
    summary: 'Stats generales del sistema',
    description: 'Devuelve conteos de merchants y el saldo acumulado en la cuenta `bendo:fees` del ledger.',
  })
  @ApiResponse({ status: 200, description: 'Estadísticas globales', type: StatsResponseDto })
  getStats() {
    return this.service.getStats();
  }

  // ── Earnings ─────────────────────────────────────────────────────────────

  @Get('earnings')
  @ApiOperation({
    summary: 'Resumen global de ganancias de Bendo',
    description:
      'Agrega todas las transacciones de tipo `charge` del ledger para calcular: ' +
      'volumen total procesado, fees ganados, comisión promedio y payout total a merchants. ' +
      '`feesInAccount` refleja el saldo real de `bendo:fees` (puede diferir de `totalFeesEarned` por transacciones históricas).',
  })
  @ApiResponse({ status: 200, description: 'Resumen de ganancias de Bendo', type: EarningsSummaryResponseDto })
  getEarningsSummary() {
    return this.service.getEarningsSummary();
  }

  @Get('earnings/merchants')
  @ApiOperation({
    summary: 'Fees desglosados por merchant',
    description: 'Agrupa los cobros por merchant y calcula: volumen total, fees cobrados por Bendo y payout al merchant. Ordenado por `totalFees` descendente.',
  })
  @ApiResponse({ status: 200, description: 'Breakdown de fees por merchant, ordenado por revenue desc', type: [EarningsByMerchantResponseDto] })
  getEarningsByMerchant() {
    return this.service.getEarningsByMerchant();
  }

  @Get('earnings/by-type')
  @ApiOperation({
    summary: 'Fees agrupados por tipo de merchant',
    description: 'Agrupa el volumen y fees por tipo de negocio (SALUD, RETAIL, EDUCACION, OTRO). Útil para analizar qué verticales generan más revenue para Bendo.',
  })
  @ApiResponse({ status: 200, description: 'Breakdown de fees por tipo de merchant, ordenado por fees desc', type: [EarningsByTypeResponseDto] })
  getEarningsByType() {
    return this.service.getEarningsByType();
  }

  @Get('earnings/transactions')
  @ApiOperation({
    summary: 'Detalle de cada fee cobrado',
    description:
      'Una fila por cada transacción de tipo `charge`. Incluye el desglose: monto total, fee de Bendo y monto neto al merchant. ' +
      'Enriquecido con nombre y tipo del merchant desde PostgreSQL.',
  })
  @ApiResponse({ status: 200, description: 'Lista detallada de fees cobrados, ordenada por timestamp desc', type: [FeeTransactionResponseDto] })
  getFeeTransactions() {
    return this.service.getFeeTransactions();
  }

  // ── Ledger ───────────────────────────────────────────────────────────────

  @Get('transactions')
  @ApiOperation({
    summary: 'Todas las transacciones del ledger',
    description: 'Devuelve el cursor paginado de transacciones del ledger Formance, sin filtros. Incluye charges, withdrawals y withdrawal_confirmed.',
  })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Número de resultados por página (default: 15, max: 1000)', example: 50 })
  @ApiQuery({ name: 'account', required: false, description: 'Nota: Formance v2.4.0 ignora este filtro server-side' })
  @ApiResponse({ status: 200, description: 'Cursor con transacciones del ledger Formance' })
  getTransactions(
    @Query('pageSize') pageSize?: string,
    @Query('account') account?: string,
  ) {
    return this.service.getTransactions({
      pageSize: pageSize ? parseInt(pageSize) : undefined,
      account,
    });
  }

  @Get('transactions/:txId')
  @ApiOperation({
    summary: 'Detalle de una transacción del ledger',
    description: 'Obtiene una transacción específica por su ID numérico del ledger Formance.',
  })
  @ApiParam({ name: 'txId', description: 'ID numérico de la transacción en el ledger', example: 8 })
  @ApiResponse({ status: 200, description: 'Transacción del ledger con postings y metadata' })
  @ApiNotFoundResponse({ description: 'Transacción no encontrada' })
  getTransaction(@Param('txId') txId: string) {
    return this.service.getTransaction(parseInt(txId));
  }

  @Get('accounts')
  @ApiOperation({
    summary: 'Todas las cuentas del ledger',
    description:
      'Lista las cuentas del ledger Formance. Incluye: `world`, `bendo:fees`, `bank:settlements`, ' +
      '`merchants:{id}:available` y `merchants:{id}:withdrawals` por cada merchant.',
  })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Número de resultados por página (default: 15)', example: 50 })
  @ApiResponse({ status: 200, description: 'Cursor con cuentas del ledger Formance' })
  getAccounts(@Query('pageSize') pageSize?: string) {
    return this.service.getAccounts({
      pageSize: pageSize ? parseInt(pageSize) : undefined,
    });
  }

  @Get('merchants/:merchantId/ledger')
  @ApiOperation({
    summary: 'Detalle de cuentas y movimientos del merchant en el ledger',
    description:
      'Devuelve el detalle completo del merchant en el ledger: datos del merchant, ' +
      'balance de sus cuentas `available` y `withdrawals` (con volumes), y sus últimas 50 transacciones.',
  })
  @ApiParam({ name: 'merchantId', description: 'UUID del merchant', example: 'a2b1f078-bed1-44e5-86d5-63529326a730' })
  @ApiResponse({ status: 200, description: 'Merchant + cuentas del ledger (con volumes) + transacciones' })
  @ApiNotFoundResponse({ description: 'Merchant no encontrado' })
  getMerchantLedger(@Param('merchantId') merchantId: string) {
    return this.service.getMerchantLedgerDetail(merchantId);
  }

  @Get('logs')
  @ApiOperation({
    summary: 'Logs de auditoría del ledger',
    description: 'Devuelve el log inmutable de operaciones del ledger Formance. Cada entrada corresponde a una transacción creada.',
  })
  @ApiQuery({ name: 'pageSize', required: false, description: 'Número de logs por página (default: 15)', example: 20 })
  @ApiResponse({ status: 200, description: 'Cursor con logs del ledger Formance' })
  getLogs(@Query('pageSize') pageSize?: string) {
    return this.service.getLogs({
      pageSize: pageSize ? parseInt(pageSize) : undefined,
    });
  }

  // ── Admin ─────────────────────────────────────────────────────────────────

  @Post('seed')
  @ApiOperation({
    summary: 'Sembrar merchants base (demo)',
    description: 'Crea los merchants semilla definidos en `seed.data.ts` — uno por cada tipo de vertical (SALUD, RETAIL, EDUCACION, OTRO). Idempotente si no hay merchants previos.',
  })
  @ApiResponse({ status: 201, description: 'Merchants semilla creados' })
  seed() {
    return this.service.seedDatabase();
  }

  @Delete('reset')
  @ApiOperation({
    summary: 'Reset de base de datos (solo para testing)',
    description:
      '⚠️ **DESTRUCTIVO** — Ejecuta `TRUNCATE TABLE merchants RESTART IDENTITY CASCADE` y re-siembra los merchants semilla automáticamente. ' +
      '**No afecta al ledger Formance** (las transacciones históricas persisten en el servidor externo).',
  })
  @ApiResponse({ status: 200, description: 'Base de datos reseteada y re-sembrada', type: ResetResponseDto })
  reset() {
    return this.service.resetDatabase();
  }
}
