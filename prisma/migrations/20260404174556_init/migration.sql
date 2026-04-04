-- CreateEnum
CREATE TYPE "MerchantType" AS ENUM ('SALUD', 'RETAIL', 'EDUCACION', 'OTRO');

-- CreateEnum
CREATE TYPE "MerchantStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateTable
CREATE TABLE "merchants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "MerchantType" NOT NULL DEFAULT 'OTRO',
    "commission_pct" DOUBLE PRECISION NOT NULL DEFAULT 3.0,
    "wallet_enabled" BOOLEAN NOT NULL DEFAULT false,
    "status" "MerchantStatus" NOT NULL DEFAULT 'ACTIVE',
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "merchants_pkey" PRIMARY KEY ("id")
);
