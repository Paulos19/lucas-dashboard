/*
  Warnings:

  - The values [NOVO,PENDENTE_FOLLOWUP,EM_ATENDIMENTO,FECHADO] on the enum `LeadStatus` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `conversationHistory` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `lastInteraction` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `phone` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `summary` on the `Lead` table. All the data in the column will be lost.
  - You are about to drop the column `ragKnowledgeBase` on the `User` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[contato]` on the table `Lead` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `contato` to the `Lead` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "LeadStatus_new" AS ENUM ('ENTRANTE', 'QUALIFICADO', 'ATENDIDO', 'AGENDADO_COTACAO', 'PROPOSTA_ENVIADA', 'VENDA_REALIZADA', 'PERDIDO', 'ARQUIVADO');
ALTER TABLE "public"."Lead" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Lead" ALTER COLUMN "status" TYPE "LeadStatus_new" USING ("status"::text::"LeadStatus_new");
ALTER TYPE "LeadStatus" RENAME TO "LeadStatus_old";
ALTER TYPE "LeadStatus_new" RENAME TO "LeadStatus";
DROP TYPE "public"."LeadStatus_old";
ALTER TABLE "Lead" ALTER COLUMN "status" SET DEFAULT 'ENTRANTE';
COMMIT;

-- DropIndex
DROP INDEX "Lead_userId_phone_key";

-- AlterTable
ALTER TABLE "Lead" DROP COLUMN "conversationHistory",
DROP COLUMN "lastInteraction",
DROP COLUMN "phone",
DROP COLUMN "summary",
ADD COLUMN     "atividadePrincipal" TEXT,
ADD COLUMN     "classificacao" TEXT,
ADD COLUMN     "contato" TEXT NOT NULL,
ADD COLUMN     "dynamicData" JSONB,
ADD COLUMN     "faturamentoEstimado" TEXT,
ADD COLUMN     "historicoCompleto" JSONB,
ADD COLUMN     "resumoDaConversa" TEXT,
ADD COLUMN     "segmentacao" TEXT,
ADD COLUMN     "valorVenda" DOUBLE PRECISION,
ADD COLUMN     "vendaRealizada" BOOLEAN NOT NULL DEFAULT false,
ALTER COLUMN "status" SET DEFAULT 'ENTRANTE';

-- AlterTable
ALTER TABLE "User" DROP COLUMN "ragKnowledgeBase",
ADD COLUMN     "classificationConfig" JSONB,
ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "qualificationConfig" JSONB,
ADD COLUMN     "ragKnowledgeBaseCondensed" JSONB,
ADD COLUMN     "ragKnowledgeBaseRaw" JSONB;

-- CreateTable
CREATE TABLE "Agendamento" (
    "id" TEXT NOT NULL,
    "dataHora" TIMESTAMP(3) NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "resumo" TEXT,
    "leadId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Agendamento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AvailabilitySlot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "isBooked" BOOLEAN NOT NULL DEFAULT false,
    "leadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvailabilitySlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Agendamento_leadId_key" ON "Agendamento"("leadId");

-- CreateIndex
CREATE INDEX "AvailabilitySlot_userId_startTime_idx" ON "AvailabilitySlot"("userId", "startTime");

-- CreateIndex
CREATE UNIQUE INDEX "Lead_contato_key" ON "Lead"("contato");

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Agendamento" ADD CONSTRAINT "Agendamento_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvailabilitySlot" ADD CONSTRAINT "AvailabilitySlot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
