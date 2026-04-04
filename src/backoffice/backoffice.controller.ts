import { Controller, Delete, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { BackofficeService } from './backoffice.service';

@ApiTags('Backoffice')
@Controller('backoffice')
export class BackofficeController {
  constructor(private service: BackofficeService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Stats generales del sistema' })
  getStats() {
    return this.service.getStats();
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Todas las transacciones del ledger' })
  @ApiQuery({ name: 'pageSize', required: false })
  @ApiQuery({ name: 'account', required: false })
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
  @ApiOperation({ summary: 'Detalle de transacción' })
  getTransaction(@Param('txId') txId: string) {
    return this.service.getTransaction(parseInt(txId));
  }

  @Get('accounts')
  @ApiOperation({ summary: 'Todas las cuentas del ledger' })
  getAccounts(@Query('pageSize') pageSize?: string) {
    return this.service.getAccounts({
      pageSize: pageSize ? parseInt(pageSize) : undefined,
    });
  }

  @Get('merchants/:merchantId/ledger')
  @ApiOperation({ summary: 'Detalle de cuentas y movimientos del merchant en el ledger' })
  getMerchantLedger(@Param('merchantId') merchantId: string) {
    return this.service.getMerchantLedgerDetail(merchantId);
  }

  @Get('logs')
  @ApiOperation({ summary: 'Logs del ledger (trazabilidad)' })
  @ApiQuery({ name: 'pageSize', required: false })
  getLogs(@Query('pageSize') pageSize?: string) {
    return this.service.getLogs({
      pageSize: pageSize ? parseInt(pageSize) : undefined,
    });
  }

  @Get('earnings')
  @ApiOperation({ summary: 'Resumen global de ganancias de Bendo (fees cobrados)' })
  getEarningsSummary() {
    return this.service.getEarningsSummary();
  }

  @Get('earnings/merchants')
  @ApiOperation({ summary: 'Fees desglosados por merchant — volumen, comisión y payout' })
  getEarningsByMerchant() {
    return this.service.getEarningsByMerchant();
  }

  @Get('earnings/by-type')
  @ApiOperation({ summary: 'Fees agrupados por tipo de merchant (SALUD, RETAIL, EDUCACION, OTRO)' })
  getEarningsByType() {
    return this.service.getEarningsByType();
  }

  @Get('earnings/transactions')
  @ApiOperation({ summary: 'Detalle de cada fee cobrado — one row per charge' })
  getFeeTransactions() {
    return this.service.getFeeTransactions();
  }

  @Delete('reset')
  @ApiOperation({ summary: 'Truncate DB — elimina todos los merchants (solo para testing)' })
  reset() {
    return this.service.resetDatabase();
  }
}
