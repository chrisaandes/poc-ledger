import { ApiProperty } from '@nestjs/swagger';

export class StatsResponseDto {
  @ApiProperty({ example: 10, description: 'Total de merchants registrados en la plataforma' })
  totalMerchants: number;

  @ApiProperty({ example: 9, description: 'Merchants con status ACTIVE' })
  activeMerchants: number;

  @ApiProperty({ example: 7, description: 'Merchants con walletEnabled = true' })
  walletsEnabled: number;

  @ApiProperty({ example: 74795, description: 'Saldo actual de la cuenta bendo:fees del ledger en centavos (cobros + fees de retiro)' })
  totalFeesCollected: number;
}

export class EarningsSummaryResponseDto {
  @ApiProperty({ example: 33, description: 'Número total de cobros procesados' })
  chargeCount: number;

  @ApiProperty({ example: 5, description: 'Retiros con fee cobrado por Bendo' })
  withdrawalFeeCount: number;

  @ApiProperty({ example: 1860800, description: 'Volumen total de cobros en centavos' })
  chargeVolume: number;

  @ApiProperty({ example: 350000, description: 'Volumen bruto de retiros con fee en centavos' })
  withdrawalVolume: number;

  @ApiProperty({ example: 2210800, description: 'Volumen total = chargeVolume + withdrawalVolume' })
  totalVolume: number;

  @ApiProperty({ example: 74495, description: 'Fees de cobros en centavos' })
  chargeFees: number;

  @ApiProperty({ example: 5250, description: 'Fees de retiro cobrados por Bendo en centavos' })
  withdrawalFees: number;

  @ApiProperty({ example: 79745, description: 'Total fees Bendo = chargeFees + withdrawalFees' })
  totalFeesEarned: number;

  @ApiProperty({ example: 79745, description: 'Saldo real actual de bendo:fees en el ledger' })
  feesInAccount: number;

  @ApiProperty({ example: 4.44, description: 'Promedio ponderado del % de comisión sobre cobros' })
  avgCommissionPct: number;

  @ApiProperty({ example: 1786305, description: 'chargeVolume - chargeFees (no incluye withdrawals para evitar doble conteo)' })
  totalMerchantPayout: number;
}

export class EarningsByMerchantResponseDto {
  @ApiProperty({ example: 'a2b1f078-bed1-44e5-86d5-63529326a730' })
  merchantId: string;

  @ApiProperty({ example: 'Clínica Santa Fe' })
  merchantName: string;

  @ApiProperty({ enum: ['SALUD', 'RETAIL', 'EDUCACION', 'OTRO'], example: 'SALUD' })
  merchantType: string;

  @ApiProperty({ example: 3, description: 'Porcentaje de comisión sobre cobros' })
  commissionPct: number;

  @ApiProperty({ example: 1.5, description: 'Porcentaje de fee sobre retiros' })
  withdrawalFeePct: number;

  @ApiProperty({ example: 4, description: 'Número de cobros' })
  chargeCount: number;

  @ApiProperty({ example: 276000, description: 'Volumen total de cobros en centavos' })
  chargeVolume: number;

  @ApiProperty({ example: 8280, description: 'Fees de Bendo sobre cobros en centavos' })
  chargeFees: number;

  @ApiProperty({ example: 2, description: 'Retiros con fee cobrado' })
  withdrawalFeeCount: number;

  @ApiProperty({ example: 133860, description: 'Volumen bruto de retiros con fee en centavos' })
  withdrawalVolume: number;

  @ApiProperty({ example: 2008, description: 'Fees de retiro cobrados por Bendo en centavos' })
  withdrawalFees: number;

  @ApiProperty({ example: 10288, description: 'chargeFees + withdrawalFees' })
  totalFees: number;

  @ApiProperty({ example: 267720, description: 'Monto neto acreditado al merchant por cobros en centavos' })
  merchantPayout: number;
}

export class EarningsByTypeResponseDto {
  @ApiProperty({ enum: ['SALUD', 'RETAIL', 'EDUCACION', 'OTRO'], example: 'SALUD' })
  type: string;

  @ApiProperty({ example: 2, description: 'Cantidad de merchants de este tipo' })
  merchantCount: number;

  @ApiProperty({ example: 7 })
  chargeCount: number;

  @ApiProperty({ example: 441000, description: 'Volumen de cobros en centavos' })
  chargeVolume: number;

  @ApiProperty({ example: 14880, description: 'Fees de cobro de Bendo en centavos' })
  chargeFees: number;

  @ApiProperty({ example: 3, description: 'Retiros con fee de este tipo' })
  withdrawalFeeCount: number;

  @ApiProperty({ example: 200000, description: 'Volumen bruto de retiros con fee en centavos' })
  withdrawalVolume: number;

  @ApiProperty({ example: 3000, description: 'Fees de retiro de Bendo en centavos' })
  withdrawalFees: number;

  @ApiProperty({ example: 641000, description: 'chargeVolume + withdrawalVolume' })
  totalVolume: number;

  @ApiProperty({ example: 17880, description: 'chargeFees + withdrawalFees' })
  totalFees: number;

  @ApiProperty({ example: 426120, description: 'Payout neto a merchants por cobros' })
  merchantPayout: number;

  @ApiProperty({ example: 3.5, description: 'Comisión promedio de cobro del tipo' })
  avgCommissionPct: number;
}

export class FeeTransactionResponseDto {
  @ApiProperty({ example: 8, description: 'ID numérico de la transacción en el ledger Formance' })
  txId: number;

  @ApiProperty({ example: '2026-04-04T20:37:15.303Z' })
  timestamp: string;

  @ApiProperty({ example: 'charge_a2b1f078_1775335035299' })
  reference: string;

  @ApiProperty({ enum: ['charge', 'withdrawal_confirmed'], example: 'charge', description: 'Tipo de TX que generó el fee' })
  txType: string;

  @ApiProperty({ example: 'a2b1f078-bed1-44e5-86d5-63529326a730' })
  merchantId: string;

  @ApiProperty({ example: 'Clínica Santa Fe' })
  merchantName: string;

  @ApiProperty({ enum: ['SALUD', 'RETAIL', 'EDUCACION', 'OTRO'], example: 'SALUD' })
  merchantType: string;

  @ApiProperty({ example: 45000, description: 'Monto total del cobro o bruto del retiro en centavos' })
  totalAmount: number;

  @ApiProperty({ example: 1350, description: 'Fee retenido por Bendo en centavos' })
  feeAmount: number;

  @ApiProperty({ example: 43650, description: 'Monto neto al merchant en centavos (totalAmount - feeAmount)' })
  merchantAmount: number;

  @ApiProperty({ example: 3, nullable: true, description: 'Comisión de cobro (%). null para withdrawal_confirmed.' })
  commissionPct: number | null;

  @ApiProperty({ example: 1.5, nullable: true, description: 'Fee de retiro (%). null para charges.' })
  withdrawalFeePct: number | null;
}

export class ResetResponseDto {
  @ApiProperty({ example: 'Database reset — merchants table truncated' })
  message: string;
}
