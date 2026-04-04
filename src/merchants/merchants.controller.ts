import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import {
  ApiTags, ApiOperation, ApiQuery, ApiParam,
  ApiResponse, ApiNotFoundResponse, ApiBadRequestResponse,
} from '@nestjs/swagger';
import { MerchantsService } from './merchants.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';
import { MerchantResponseDto, MerchantWithBalanceResponseDto } from './dto/merchant-response.dto';

@ApiTags('Merchants')
@Controller('merchants')
export class MerchantsController {
  constructor(private service: MerchantsService) {}

  @Post()
  @ApiOperation({
    summary: 'Crear merchant',
    description:
      'Registra un nuevo merchant en la plataforma Bendo. ' +
      'Crea la cuenta `merchants:{id}:available` en el ledger Formance y almacena metadatos en PostgreSQL.',
  })
  @ApiResponse({ status: 201, description: 'Merchant creado exitosamente', type: MerchantResponseDto })
  @ApiBadRequestResponse({ description: 'Validación fallida — nombre requerido, commissionPct fuera de rango (0-100) o type inválido' })
  create(@Body() dto: CreateMerchantDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Listar merchants',
    description: 'Devuelve todos los merchants registrados, ordenados por fecha de creación descendente. Soporta filtros por tipo de negocio, wallet habilitada y estado.',
  })
  @ApiQuery({ name: 'type', required: false, enum: ['SALUD', 'RETAIL', 'EDUCACION', 'OTRO'], description: 'Filtrar por tipo de negocio' })
  @ApiQuery({ name: 'walletEnabled', required: false, enum: ['true', 'false'], description: 'Filtrar por wallet habilitada' })
  @ApiQuery({ name: 'status', required: false, enum: ['ACTIVE', 'INACTIVE'], description: 'Filtrar por estado del merchant' })
  @ApiResponse({ status: 200, description: 'Lista de merchants', type: [MerchantResponseDto] })
  findAll(
    @Query('type') type?: string,
    @Query('walletEnabled') walletEnabled?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll({
      type,
      walletEnabled: walletEnabled !== undefined ? walletEnabled === 'true' : undefined,
      status,
    });
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Detalle de merchant con balance del ledger',
    description:
      'Devuelve los datos del merchant enriquecidos con el saldo disponible en su cuenta `merchants:{id}:available` del ledger Formance. ' +
      'El campo `balance` está en centavos (USD/2): $267.72 = 267720.',
  })
  @ApiParam({ name: 'id', description: 'UUID del merchant', example: 'a2b1f078-bed1-44e5-86d5-63529326a730' })
  @ApiResponse({ status: 200, description: 'Merchant con balance del ledger', type: MerchantWithBalanceResponseDto })
  @ApiNotFoundResponse({ description: 'Merchant no encontrado' })
  findOne(@Param('id') id: string) {
    return this.service.findOneWithBalance(id);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Editar merchant',
    description: 'Actualiza parcialmente los datos del merchant. Usa `status: INACTIVE` para deshabilitar sin eliminar.',
  })
  @ApiParam({ name: 'id', description: 'UUID del merchant', example: 'a2b1f078-bed1-44e5-86d5-63529326a730' })
  @ApiResponse({ status: 200, description: 'Merchant actualizado', type: MerchantResponseDto })
  @ApiNotFoundResponse({ description: 'Merchant no encontrado' })
  @ApiBadRequestResponse({ description: 'Validación fallida' })
  update(@Param('id') id: string, @Body() dto: UpdateMerchantDto) {
    return this.service.update(id, dto);
  }
}
