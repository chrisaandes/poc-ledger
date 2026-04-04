import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { LedgerModule } from './ledger/ledger.module';
import { MerchantsModule } from './merchants/merchants.module';
import { CheckoutModule } from './checkout/checkout.module';
import { WalletModule } from './wallet/wallet.module';
import { BackofficeModule } from './backoffice/backoffice.module';

@Module({
  imports: [
    PrismaModule,
    LedgerModule,
    MerchantsModule,
    CheckoutModule,
    WalletModule,
    BackofficeModule,
  ],
})
export class AppModule {}
