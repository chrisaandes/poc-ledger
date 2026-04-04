import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class MerchantResponseDto {
  @ApiProperty({ example: 'a2b1f078-bed1-44e5-86d5-63529326a730' })
  id: string;

  @ApiProperty({ example: 'Clínica Santa Fe' })
  name: string;

  @ApiProperty({ enum: ['SALUD', 'RETAIL', 'EDUCACION', 'OTRO'], example: 'SALUD' })
  type: string;

  @ApiProperty({ example: 3.0, description: 'Comisión Bendo (%)' })
  commissionPct: number;

  @ApiProperty({ example: true, description: 'Indica si el merchant tiene wallet habilitada' })
  walletEnabled: boolean;

  @ApiProperty({ enum: ['ACTIVE', 'INACTIVE'], example: 'ACTIVE' })
  status: string;

  @ApiPropertyOptional({ example: null, description: 'Metadata extra en formato JSON' })
  metadata: any;

  @ApiProperty({ example: '2026-04-04T18:00:00.000Z' })
  createdAt: string;

  @ApiProperty({ example: '2026-04-04T18:00:00.000Z' })
  updatedAt: string;
}

export class MerchantWithBalanceResponseDto extends MerchantResponseDto {
  @ApiProperty({
    example: 267720,
    description: 'Saldo disponible en el ledger en centavos (USD/2). $267.72 = 267720',
  })
  balance: number;
}
