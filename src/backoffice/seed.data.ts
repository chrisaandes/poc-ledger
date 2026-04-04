import { MerchantType } from '../merchants/dto/create-merchant.dto';
import { CreateMerchantDto } from '../merchants/dto/create-merchant.dto';

/**
 * Merchants semilla — se recrean al hacer reset de la DB.
 * Representan un merchant base por cada vertical de la plataforma.
 */
export const SEED_MERCHANTS: CreateMerchantDto[] = [
  {
    name: 'Demo Clínica General',
    type: MerchantType.SALUD,
    commissionPct: 3,
    withdrawalFeePct: 1,
    walletEnabled: true,
  },
  {
    name: 'Demo Retail Express',
    type: MerchantType.RETAIL,
    commissionPct: 5,
    withdrawalFeePct: 1.5,
    walletEnabled: true,
  },
  {
    name: 'Demo Instituto Educativo',
    type: MerchantType.EDUCACION,
    commissionPct: 2,
    withdrawalFeePct: 0.5,
    walletEnabled: true,
  },
  {
    name: 'Demo Servicios Generales',
    type: MerchantType.OTRO,
    commissionPct: 4,
    withdrawalFeePct: 0,
    walletEnabled: false,
  },
];
