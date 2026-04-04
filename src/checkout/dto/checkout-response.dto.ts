import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChargeResponseDto {
  @ApiProperty({ example: 42, description: 'ID numérico de la transacción en el ledger Formance' })
  transactionId: number;

  @ApiProperty({ example: 'a2b1f078-bed1-44e5-86d5-63529326a730' })
  merchantId: string;

  @ApiProperty({ example: 'Clínica Santa Fe' })
  merchantName: string;

  @ApiProperty({ example: 45000, description: 'Monto total cobrado en centavos. $450.00 = 45000' })
  totalAmount: number;

  @ApiProperty({ example: 1350, description: 'Fee de Bendo en centavos (totalAmount × commissionPct%)' })
  feeAmount: number;

  @ApiProperty({ example: 43650, description: 'Monto acreditado al merchant en centavos (totalAmount - feeAmount)' })
  merchantAmount: number;

  @ApiProperty({ example: 3, description: 'Porcentaje de comisión aplicado' })
  commissionPct: number;

  @ApiProperty({ example: 'charge_a2b1f078_1775335035299', description: 'Referencia única en el ledger' })
  reference: string;

  @ApiPropertyOptional({ example: 'Consulta cardiología', description: 'Descripción libre del cobro' })
  description?: string;

  @ApiProperty({ example: '2026-04-04T20:37:15.303Z' })
  timestamp: string;
}
