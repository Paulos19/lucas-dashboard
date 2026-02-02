import { auth } from "@/lib/auth";
import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();

export async function GET(req: Request) {
  // Verificação de API Key (Mesma lógica do seu arquivo middleware ou headers)
  const apiKey = req.headers.get("x-api-key");
  if (apiKey !== process.env.API_SECRET) { // Defina isso no .env
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 1. Buscar produto de Pós-Venda Ativo
  const postSalesProduct = await prisma.insuranceProduct.findFirst({
    where: { 
      isPostSales: true, 
      status: "ACTIVE" 
    }
  });

  if (!postSalesProduct) {
    return NextResponse.json({ message: "Nenhum produto de pós-venda configurado" }, { status: 404 });
  }

  // 2. Calcular data de corte (30 dias atrás)
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 30);

  // 3. Buscar Leads elegíveis
  // Critério: Atualizado antes de 30 dias E (Status != VENDA_REALIZADA ou PERDIDO)
  // Ajuste os status conforme sua regra de negócio
  const staleLeads = await prisma.lead.findMany({
    where: {
      updatedAt: {
        lte: cutoffDate // Menor ou igual a 30 dias atrás
      },
      status: {
        notIn: ["PERDIDO", "ARQUIVADO"] // Não perturbar leads perdidos/arquivados
      },
      // Evitar mandar mensagem se já enviamos pós-venda recentemente (opcional, requer novo campo no Lead)
    },
    take: 50 // Limite por execução para não bloquear WhatsApp
  });

  return NextResponse.json({
    product: postSalesProduct,
    leads: staleLeads
  });
}