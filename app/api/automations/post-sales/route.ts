import { PrismaClient } from "@prisma/client";
import { NextResponse } from "next/server";

const prisma = new PrismaClient();
// 1. Usamos a MESMA variável que já funciona nas outras rotas
const N8N_INTERNAL_API_KEY = process.env.N8N_INTERNAL_API_KEY;

export async function GET(req: Request) {
  const apiKey = req.headers.get("x-api-key");

  // 2. Verificação corrigida
  if (!N8N_INTERNAL_API_KEY || apiKey !== N8N_INTERNAL_API_KEY) {
      console.log("Falha de Auth - Recebido:", apiKey, "Esperado:", N8N_INTERNAL_API_KEY); // Log para debug na Vercel
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 3. Buscar produto de Pós-Venda Ativo
    const postSalesProduct = await prisma.insuranceProduct.findFirst({
      where: { 
        isPostSales: true, 
        status: "ACTIVE" 
      }
    });

    if (!postSalesProduct) {
      // Retorna 200 com array vazio ou aviso, para não quebrar o n8n com erro 404
      return NextResponse.json({ 
        message: "Nenhum produto de pós-venda ativo", 
        product: null, 
        leads: [] 
      });
    }

    // 4. Calcular data de corte (30 dias atrás)
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 30);

    // 5. Buscar Leads elegíveis
    const staleLeads = await prisma.lead.findMany({
      where: {
        updatedAt: {
          lte: cutoffDate // Menor ou igual a 30 dias atrás
        },
        status: {
          notIn: ["PERDIDO", "ARQUIVADO", "VENDA_REALIZADA"]
        },
        // Opcional: Filtra leads que NÃO receberam contato recente (firstContactSent)
        // firstContactSent: true 
      },
      take: 50
    });

    return NextResponse.json({
      product: postSalesProduct,
      leads: staleLeads
    });
    
  } catch (error) {
      console.error(error);
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}