import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { leads } = await request.json();

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: 'Nenhum lead fornecido' }, { status: 400 });
    }

    const userRole = session.user.role;
    const currentUserName = (session.user.name || '').trim().toLowerCase();

    // Regra: Se NÃO for admin, não pode conter nome de outros corretores
    if (userRole !== 'ADMIN') {
      const foreignBrokers = new Set<string>();

      for (const l of leads) {
        const cNome = String(l.corretorNome || '').trim();
        if (cNome && cNome.toLowerCase() !== currentUserName) {
          foreignBrokers.add(cNome);
        }
      }

      if (foreignBrokers.size > 0) {
        const brokerList = Array.from(foreignBrokers).slice(0, 3).join(', ');
        return NextResponse.json({
          error: `Você não tem permissão para importar planilhas com nomes de outros corretores (${brokerList}). Como corretor, você só pode adicionar leads próprios ou sem identificação de terceiros.`
        }, { status: 403 });
      }
    }

    // Filtra leads com telefone válido
    const validLeads = leads.filter((l: any) => l.contato && String(l.contato).length >= 8);

    const count = await prisma.lead.createMany({
      data: validLeads.map((lead: any) => ({
        userId: session.user?.id!,
        name: lead.name,
        contato: lead.contato,
        status: lead.status || 'ENTRANTE',
        numeroApolice: lead.numeroApolice || null,
        faturamentoEstimado: lead.faturamentoEstimado || null,
        prioridade: lead.prioridade ? String(lead.prioridade) : null,
        ramo: lead.ramo || null,
        campanha: lead.campanha || null,
        fase: lead.fase || null,
        telefoneFixo: lead.telefoneFixo || null,
        agencia: lead.agencia || null,
        corretorNome: session.user?.name || lead.corretorNome || null,
        dataRenovacao: lead.dataRenovacao ? new Date(lead.dataRenovacao) : null,
        origemLead: lead.origemLead || 'IMPORTACAO_XLSX',
        dynamicData: lead.dynamicData || {},
        updatedAt: new Date(),
      })),
      skipDuplicates: true, // Pula telefones que já existem
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