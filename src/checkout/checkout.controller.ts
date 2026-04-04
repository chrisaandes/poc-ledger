import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ChargeDto {
  @ApiProperty({ example: 10000, description: 'Monto en centavos. $100.00 = 10000' })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiPropertyOptional({ example: 'Consulta médica general' })
  @IsString()
  @IsOptional()
  description?: string;
}

@ApiTags('Checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private service: CheckoutService) {}

  @Post(':merchantId/charge')
  @ApiOperation({ summary: 'Procesar cobro para un merchant' })
  charge(@Param('merchantId') merchantId: string, @Body() dto: ChargeDto) {
    return this.service.charge(merchantId, dto.amount, dto.description);
  }

  @Get(':merchantId/transactions')
  @ApiOperation({ summary: 'Historial de cobros del merchant' })
  getTransactions(@Param('merchantId') merchantId: string) {
    return this.service.getTransactions(merchantId);
  }
}
