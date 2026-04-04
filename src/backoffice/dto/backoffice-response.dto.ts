import { ApiProperty } from '@nestjs/swagger';

export class StatsResponseDto {
  @ApiProperty({ example: 10, description: 'Total de merchants registrados en la plataforma' })
  totalMerchants: number;

  @ApiProperty({ example: 9, description: 'Merchants con status ACTIVE' })
  activeMerchants: number;

  @ApiProperty({ example: 7, description: 'Merchants con walletEnabled = true' })
  walletsEnabled: number;

  @ApiProperty({ example: 74795, description: 'Total acumulado en la cuenta bendo:fees del ledger en centavos' })
  totalFeesCollected: number;
}

export class EarningsSummaryResponseDto {
  @ApiProperty({ example: 33, description: 'Número total de cobros procesados' })
  chargeCount: number;

  @ApiProperty({ example: 1860800, description: 'Volumen total procesado en centavos ($18,608.00)' })
  totalVolume: number;

  @ApiProperty({ example: 74495, description: 'Total de fees ganados por Bendo en centavos ($744.95)' })
  totalFeesEarned: number;

  @ApiProperty({ example: 74795, description: 'Saldo actual de la cuenta bendo:fees en el ledger (puede diferir por fees históricos)' })
  feesInAccount: number;

  @ApiProperty({ example: 4.44, description: 'Promedio ponderado del % de comisión aplicado' })
  avgCommissionPct: number;

  @ApiProperty({ example: 1786305, description: 'Total acreditado a merchants = totalVolume - totalFeesEarned' })
  totalMerchantPayout: number;
}

export class EarningsByMerchantResponseDto {
  @ApiProperty({ example: 'a2b1f078-bed1-44e5-86d5-63529326a730' })
  merchantId: string;

  @ApiProperty({ example: 'Clínica Santa Fe' })
  merchantName: string;

  @ApiProperty({ enum: ['SALUD', 'RETAIL', 'EDUCACION', 'OTRO'], example: 'SALUD' })
  merchantType: string;

  @ApiProperty({ example: 3, description: 'Porcentaje de comisión del merchant' })
  commissionPct: number;

  @ApiProperty({ example: 4 })
  chargeCount: number;

  @ApiProperty({ example: 276000, description: 'Suma de todos los totalAmount en centavos' })
  totalVolume: number;

  @ApiProperty({ example: 8280, description: 'Suma de fees cobrados por Bendo en centavos' })
  totalFees: number;

  @ApiProperty({ example: 267720, description: 'Suma de montos acreditados al merchant en centavos' })
  merchantPayout: number;
}

export class EarningsByTypeResponseDto {
  @ApiProperty({ enum: ['SALUD', 'RETAIL', 'EDUCACION', 'OTRO'], example: 'SALUD' })
  type: string;

  @ApiProperty({ example: 2, description: 'Cantidad de merchants de este tipo' })
  merchantCount: number;

  @ApiProperty({ example: 7, description: 'Total de cobros de merchants de este tipo' })
  chargeCount: number;

  @ApiProperty({ example: 441000, description: 'Volumen total procesado en centavos' })
  totalVolume: number;

  @ApiProperty({ example: 14880, description: 'Total de fees de Bendo en centavos' })
  totalFees: number;

  @ApiProperty({ example: 426120, description: 'Total acreditado a merchants de este tipo en centavos' })
  merchantPayout: number;

  @ApiProperty({ example: 3.5, description: 'Comisión promedio del tipo' })
  avgCommissionPct: number;
}

export class FeeTransactionResponseDto {
  @ApiProperty({ example: 8, description: 'ID numérico de la transacción en el ledger Formance' })
  txId: number;

  @ApiProperty({ example: '2026-04-04T20:37:15.303Z' })
  timestamp: string;

  @ApiProperty({ example: 'charge_a2b1f078_1775335035299' })
  reference: string;

  @ApiProperty({ example: 'a2b1f078-bed1-44e5-86d5-63529326a730' })
  merchantId: string;

  @ApiProperty({ example: 'Clínica Santa Fe' })
  merchantName: string;

  @ApiProperty({ enum: ['SALUD', 'RETAIL', 'EDUCACION', 'OTRO'], example: 'SALUD' })
  merchantType: string;

  @ApiProperty({ example: 45000, description: 'Monto total cobrado al cliente en centavos' })
  totalAmount: number;

  @ApiProperty({ example: 1350, description: 'Fee retenido por Bendo en centavos' })
  feeAmount: number;

  @ApiProperty({ example: 43650, description: 'Monto neto acreditado al merchant en centavos' })
  merchantAmount: number;

  @ApiProperty({ example: 3, description: 'Porcentaje de comisión aplicado' })
  commissionPct: number;
}

export class ResetResponseDto {
  @ApiProperty({ example: 'Database reset — merchants table truncated' })
  message: string;
}
