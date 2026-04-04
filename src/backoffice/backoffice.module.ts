import { Module } from '@nestjs/common';
import { BackofficeController } from './backoffice.controller';
import { BackofficeService } from './backoffice.service';
import { MerchantsModule } from '../merchants/merchants.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [MerchantsModule, PrismaModule],
  controllers: [BackofficeController],
  providers: [BackofficeService],
})
export class BackofficeModule {}
