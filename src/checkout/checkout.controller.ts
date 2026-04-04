import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiParam,
  ApiResponse, ApiNotFoundResponse, ApiBadRequestResponse,
} from '@nestjs/swagger';
import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import { ChargeResponseDto } from './dto/checkout-response.dto';

class ChargeDto {
  @ApiProperty({
    example: 45000,
    description: 'Monto total a cobrar en centavos (USD/2). Ejemplo: $450.00 = 45000. Mínimo: 1.',
  })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ example: 'Consulta cardiología', description: 'Descripción libre del cobro (no se almacena en el ledger, solo en la respuesta)' })
  @IsString()
  @IsOptional()
  description?: string;
}

@ApiTags('Checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private service: CheckoutService) {}

  @Post(':merchantId/charge')
  @ApiOperation({
    summary: 'Procesar cobro para un merchant',
    description:
      'Registra un cobro en el ledger Formance con split automático de comisión. ' +
      'Crea dos postings: `world → merchants:{id}:available` (monto neto) y `world → bendo:fees` (comisión). ' +
      'El monto debe enviarse en centavos: $450.00 = 45000.',
  })
  @ApiParam({ name: 'merchantId', description: 'UUID del merchant a cobrar', example: 'a2b1f078-bed1-44e5-86d5-63529326a730' })
  @ApiResponse({ status: 201, description: 'Cobro procesado y registrado en el ledger', type: ChargeResponseDto })
  @ApiNotFoundResponse({ description: 'Merchant no encontrado' })
  @ApiBadRequestResponse({ description: 'Amount debe ser mayor a 0' })
  charge(@Param('merchantId') merchantId: string, @Body() dto: ChargeDto) {
    return this.service.charge(merchantId, dto.amount, dto.description);
  }

  @Get(':merchantId/transactions')
  @ApiOperation({
    summary: 'Historial de cobros del merchant',
    description:
      'Lista todas las transacciones de tipo `charge` asociadas al merchant. ' +
      'Pagina a través de todo el ledger con filtro client-side por `metadata.merchantId` (Formance v2.4.0 no soporta filtros server-side).',
  })
  @ApiParam({ name: 'merchantId', description: 'UUID del merchant', example: 'a2b1f078-bed1-44e5-86d5-63529326a730' })
  @ApiResponse({ status: 200, description: 'Cursor con array de transacciones del ledger Formance filtradas por merchant' })
  @ApiNotFoundResponse({ description: 'Merchant no encontrado' })
  getTransactions(@Param('merchantId') merchantId: string) {
    return this.service.getTransactions(merchantId);
  }
}
