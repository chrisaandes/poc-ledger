import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

class WithdrawDto {
  @ApiProperty({ example: 5000, description: 'Monto a retirar en centavos. $50.00 = 5000' })
  @IsNumber()
  @Min(1)
  amount: number;
}

@ApiTags('Wallet')
@Controller('wallet')
export class WalletController {
  constructor(private service: WalletService) {}

  @Get('merchants')
  @ApiOperation({ summary: 'Listar merchants con wallet activa' })
  listMerchants() {
    return this.service.listWalletMerchants();
  }

  @Get(':merchantId')
  @ApiOperation({ summary: 'Balance de wallet del merchant' })
  getWallet(@Param('merchantId') merchantId: string) {
    return this.service.getWallet(merchantId);
  }

  @Get(':merchantId/movements')
  @ApiOperation({ summary: 'Historial de movimientos' })
  getMovements(@Param('merchantId') merchantId: string) {
    return this.service.getMovements(merchantId);
  }

  @Post(':merchantId/withdraw')
  @ApiOperation({ summary: 'Solicitar retiro' })
  withdraw(@Param('merchantId') merchantId: string, @Body() dto: WithdrawDto) {
    return this.service.withdraw(merchantId, dto.amount);
  }
}
