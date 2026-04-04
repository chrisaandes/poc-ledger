import { Module } from '@nestjs/common';
import { BackofficeController } from './backoffice.controller';
import { BackofficeService } from './backoffice.service';
import { MerchantsModule } from '../merchants/merchants.module';

@Module({
  imports: [MerchantsModule],
  controllers: [BackofficeController],
  providers: [BackofficeService],
})
export class BackofficeModule {}
