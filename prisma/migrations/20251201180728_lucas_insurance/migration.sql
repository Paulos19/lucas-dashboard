/*
  Warnings:

  - The values [AGENDADO_VISITA,VENDIDO] on the enum `LeadStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `interestedInPropertyId` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the `Property` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "LeadStatus_new" AS ENUM ('NOVO', 'PENDENTE_FOLLOWUP', 'EM_ATENDIMENTO', 'AGENDADO_COTACAO', 'PROPOSTA_ENVIADA', 'FECHADO', 'ARQUIVADO');
ALTER TABLE "public"."Lead" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Lead" ALTER COLUMN "status" TYPE "LeadStatus_new" USING ("status"::text::"LeadStatus_new");
ALTER TYPE "LeadStatus" RENAME TO "LeadStatus_old";
ALTER TYPE "LeadStatus_new" RENAME TO "LeadStatus";
DROP TYPE "public"."LeadStatus_old";
ALTER TABLE "Lead" ALTER COLUMN "status" SET DEFAULT 'NOVO';
COMMIT;

-- DropForeignKey
ALTER TABLE "Lead" DROP CONSTRAINT "Lead_interestedInPropertyId_fkey";

-- DropForeignKey
ALTER TABLE "Property" DROP CONSTRAINT "Property_userId_fkey";

-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "interestedInPropertyId",
ADD COLUMN     "interestedInProductId" TEXT;

-- DropTable
DROP TABLE "Property";

-- CreateTable
CREATE TABLE "InsuranceProduct" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "monthlyPremium" DOUBLE PRECISION NOT NULL,
    "coverages" JSONB,
    "assistances" JSONB,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InsuranceProduct_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "InsuranceProduct" ADD CONSTRAINT "InsuranceProduct_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lead" ADD CONSTRAINT "Lead_interestedInProductId_fkey" FOREIGN KEY ("interestedInProductId") REFERENCES "InsuranceProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
