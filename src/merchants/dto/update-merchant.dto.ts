import { PartialType } from '@nestjs/swagger';
import { CreateMerchantDto } from './create-merchant.dto';
import { IsEnum, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum MerchantStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export class UpdateMerchantDto extends PartialType(CreateMerchantDto) {
  @ApiPropertyOptional({ enum: MerchantStatus })
  @IsEnum(MerchantStatus)
  @IsOptional()
  status?: MerchantStatus;
}
