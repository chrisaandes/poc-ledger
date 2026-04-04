import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MerchantsService } from './merchants.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';

@ApiTags('Merchants')
@Controller('merchants')
export class MerchantsController {
  constructor(private service: MerchantsService) {}

  @Post()
  @ApiOperation({ summary: 'Crear merchant' })
  create(@Body() dto: CreateMerchantDto) {
    return this.service.create(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar merchants' })
  @ApiQuery({ name: 'type', required: false })
  @ApiQuery({ name: 'walletEnabled', required: false })
  @ApiQuery({ name: 'status', required: false })
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
  @ApiOperation({ summary: 'Detalle de merchant con balance del ledger' })
  findOne(@Param('id') id: string) {
    return this.service.findOneWithBalance(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar merchant' })
  update(@Param('id') id: string, @Body() dto: UpdateMerchantDto) {
    return this.service.update(id, dto);
  }
}
