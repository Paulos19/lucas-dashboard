import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { leads } = await request.json();

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: 'Nenhum lead fornecido' }, { status: 400 });
    }

    // Criamos uma transação para garantir que ou salva tudo ou não salva nada (opcional, mas recomendado)
    // Para performance em massa, createMany é o ideal.
    
    // Filtra leads sem contato (obrigatório pelo Schema)
    const validLeads = leads.filter((l: any) => l.contato && l.contato.length >= 8);

    const count = await prisma.lead.createMany({
      data: validLeads.map((lead: any) => ({
        userId: session.user?.id!,
        name: lead.name,
        contato: lead.contato,
        status: lead.status || 'ENTRANTE',
        numeroApolice: lead.numeroApolice,
        faturamentoEstimado: lead.faturamentoEstimado,
        origemLead: 'IMPORTACAO_XLSX',
        dynamicData: lead.dynamicData || {}, // Salva o resto dos dados aqui
        updatedAt: new Date(),
      })),
      skipDuplicates: true, // Pula telefones que já existem (evita erro 500)
    });

    return NextResponse.json({ 
      success: true, 
      count: count.count, 
      totalReceived: leads.length,
      ignored: leads.length - validLeads.length 
    });

  } catch (error) {
    console.error("Erro na importação:", error);
    return NextResponse.json({ error: 'Erro interno ao importar leads' }, { status: 500 });
  }
}