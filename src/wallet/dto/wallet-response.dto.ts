import { ApiProperty } from '@nestjs/swagger';

export class WalletBalanceResponseDto {
  @ApiProperty({ example: 'a2b1f078-bed1-44e5-86d5-63529326a730' })
  merchantId: string;

  @ApiProperty({ example: 'Clínica Santa Fe' })
  merchantName: string;

  @ApiProperty({ example: 133860, description: 'Saldo disponible para retiro en centavos' })
  available: number;

  @ApiProperty({ example: 0, description: 'Fondos actualmente en proceso de retiro en centavos' })
  inWithdrawal: number;

  @ApiProperty({ example: 133860, description: 'Saldo total = available + inWithdrawal' })
  total: number;
}

export class WithdrawResponseDto {
  @ApiProperty({ example: 'a2b1f078-bed1-44e5-86d5-63529326a730' })
  merchantId: string;

  @ApiProperty({ example: 66930, description: 'Monto retirado en centavos' })
  amount: number;

  @ApiProperty({ example: 'withdrawal_a2b1f078_1775335035299', description: 'Referencia única del retiro en el ledger' })
  reference: string;

  @ApiProperty({ example: 'completed', description: 'Estado del retiro. El flujo available→withdrawals→bank:settlements es síncrono.' })
  status: string;

  @ApiProperty({ example: '2026-04-04T21:00:00.000Z' })
  timestamp: string;
}

export class WalletMerchantResponseDto {
  @ApiProperty({ example: 'a2b1f078-bed1-44e5-86d5-63529326a730' })
  id: string;

  @ApiProperty({ example: 'Clínica Santa Fe' })
  name: string;

  @ApiProperty({ enum: ['SALUD', 'RETAIL', 'EDUCACION', 'OTRO'] })
  type: string;

  @ApiProperty({ example: 133860, description: 'Saldo disponible en el ledger en centavos' })
  balance: number;
}
