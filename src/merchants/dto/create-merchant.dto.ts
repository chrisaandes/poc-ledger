import { IsString, IsEnum, IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum MerchantType {
  SALUD = 'SALUD',
  RETAIL = 'RETAIL',
  EDUCACION = 'EDUCACION',
  OTRO = 'OTRO',
}

export class CreateMerchantDto {
  @ApiProperty({ example: 'Dr. María García' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ enum: MerchantType, default: MerchantType.OTRO })
  @IsEnum(MerchantType)
  @IsOptional()
  type?: MerchantType;

  @ApiPropertyOptional({ example: 3.0, description: 'Comisión Bendo (%)' })
  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  commissionPct?: number;

  @ApiPropertyOptional({ default: false })
  @IsBoolean()
  @IsOptional()
  walletEnabled?: boolean;
}
