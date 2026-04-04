import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LedgerService } from '../ledger/ledger.service';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { UpdateMerchantDto } from './dto/update-merchant.dto';

@Injectable()
export class MerchantsService {
  constructor(
    private prisma: PrismaService,
    private ledger: LedgerService,
  ) {}

  async create(dto: CreateMerchantDto) {
    const merchant = await this.prisma.merchant.create({ data: dto });

    // Registrar metadata en el ledger para la cuenta del merchant
    try {
      await this.ledger.setAccountMetadata(`merchants:${merchant.id}:available`, {
        merchantName: merchant.name,
        merchantType: merchant.type,
      });
    } catch (e) {
      // No falla si el ledger no puede setear metadata aún
    }

    return merchant;
  }

  async findAll(filters?: { type?: string; walletEnabled?: boolean; status?: string }) {
    const where: any = {};
    if (filters?.type) where.type = filters.type;
    if (filters?.walletEnabled !== undefined) where.walletEnabled = filters.walletEnabled;
    if (filters?.status) where.status = filters.status;

    return this.prisma.merchant.findMany({ where, orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const merchant = await this.prisma.merchant.findUnique({ where: { id } });
    if (!merchant) throw new NotFoundException(`Merchant ${id} not found`);
    return merchant;
  }

  async findOneWithBalance(id: string) {
    const merchant = await this.findOne(id);
    let balance = 0;

    try {
      balance = await this.ledger.getAvailableBalance(`merchants:${id}:available`);
    } catch (e) {
      // Cuenta no existe aún en el ledger
    }

    return { ...merchant, balance };
  }

  async update(id: string, dto: UpdateMerchantDto) {
    await this.findOne(id);
    return this.prisma.merchant.update({ where: { id }, data: dto });
  }
}
