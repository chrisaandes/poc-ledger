import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiParam,
  ApiResponse, ApiNotFoundResponse, ApiBadRequestResponse,
} from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import {
  WalletBalanceResponseDto,
  WalletMerchantResponseDto,
  WithdrawResponseDto,
} from './dto/wallet-response.dto';

class WithdrawDto {
  @ApiProperty({
    example: 66930,
    description: 'Monto a retirar en centavos (USD/2). Ejemplo: $669.30 = 66930. Debe ser ≤ saldo disponible.',
  })
  @IsNumber()
  @Min(1)
  amount: number;
}

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  constructor(private service: WalletService) {}

  @Get('merchants')
  @ApiOperation({
    summary: 'Listar merchants con wallet activa',
    description: 'Devuelve los merchants con `walletEnabled = true` y `status = ACTIVE`, enriquecidos con su saldo disponible en el ledger.',
  })
  @ApiResponse({ status: 200, description: 'Lista de merchants wallet-enabled con balance', type: [WalletMerchantResponseDto] })
  listMerchants() {
    return this.service.listWalletMerchants();
  }

  @Get(':merchantId')
  @ApiOperation({
    summary: 'Balance de wallet del merchant',
    description:
      'Devuelve el balance desglosado del merchant: `available` (listo para retirar), `inWithdrawal` (en tránsito a banco) y `total`. ' +
      'Todos los valores en centavos (USD/2).',
  })
  @ApiParam({ name: 'merchantId', description: 'UUID del merchant', example: 'a2b1f078-bed1-44e5-86d5-63529326a730' })
  @ApiResponse({ status: 200, description: 'Balance de wallet', type: WalletBalanceResponseDto })
  @ApiNotFoundResponse({ description: 'Merchant no encontrado' })
  @ApiBadRequestResponse({ description: 'El merchant no tiene wallet habilitada (walletEnabled = false)' })
  getWallet(@Param('merchantId') merchantId: string) {
    return this.service.getWallet(merchantId);
  }

  @Get(':merchantId/movements')
  @ApiOperation({
    summary: 'Historial de movimientos de wallet',
    description:
      'Lista todas las transacciones del merchant en el ledger (cobros, retiros y confirmaciones). ' +
      'Incluye cargos entrantes y salidas por retiro.',
  })
  @ApiParam({ name: 'merchantId', description: 'UUID del merchant', example: 'a2b1f078-bed1-44e5-86d5-63529326a730' })
  @ApiResponse({ status: 200, description: 'Cursor con array de transacciones del ledger filtradas por merchant' })
  @ApiNotFoundResponse({ description: 'Merchant no encontrado' })
  @ApiBadRequestResponse({ description: 'El merchant no tiene wallet habilitada' })
  getMovements(@Param('merchantId') merchantId: string) {
    return this.service.getMovements(merchantId);
  }

  @Post(':merchantId/withdraw')
  @ApiOperation({
    summary: 'Solicitar retiro de fondos',
    description:
      'Inicia y confirma un retiro de forma sincrónica. Ejecuta dos transacciones en el ledger: ' +
      '`merchants:{id}:available → merchants:{id}:withdrawals` (hold) y ' +
      '`merchants:{id}:withdrawals → bank:settlements` (liquidación). ' +
      'El monto debe ser ≤ saldo disponible.',
  })
  @ApiParam({ name: 'merchantId', description: 'UUID del merchant', example: 'a2b1f078-bed1-44e5-86d5-63529326a730' })
  @ApiResponse({ status: 201, description: 'Retiro procesado y liquidado', type: WithdrawResponseDto })
  @ApiNotFoundResponse({ description: 'Merchant no encontrado' })
  @ApiBadRequestResponse({ description: 'Fondos insuficientes, amount ≤ 0, o wallet no habilitada' })
  withdraw(@Param('merchantId') merchantId: string, @Body() dto: WithdrawDto) {
    return this.service.withdraw(merchantId, dto.amount);
  }
}
