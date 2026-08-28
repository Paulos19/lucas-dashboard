import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { differenceInDays } from 'date-fns';

const N8N_API_KEY = process.env.N8N_INTERNAL_API_KEY;

export async function GET(request: Request) {
  // 1. Validação de Segurança
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== N8N_API_KEY) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    // 2. Busca leads não contatados priorizando as renovações que vencerão primeiro (ordem do mais próximo ao mais longe)
    const leads = await prisma.lead.findMany({
      where: {
        firstContactSent: false,
        status: 'ENTRANTE',
        contato: { not: '' }
      },
      include: {
        user: true,
        interestedInProduct: true
      },
      take: 10,
      orderBy: [
        { dataRenovacao: { sort: 'asc', nulls: 'last' } },
        { prioridade: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    if (leads.length === 0) {
      return NextResponse.json([], { status: 200 });
    }

    // 3. Atualiza "firstContactSent" para TRUE imediatamente
    // Isso evita que o scheduler pegue o mesmo lead na próxima execução (10 min depois)
    await prisma.lead.updateMany({
      where: {
        id: { in: leads.map(l => l.id) }
      },
      data: {
        firstContactSent: true
      }
    });

    // 4. Formata o retorno para o n8n com dados completos de renovação e urgência
    const today = new Date();
    const responseData = leads.map(lead => {
      const diasAteVencimento = lead.dataRenovacao 
        ? differenceInDays(new Date(lead.dataRenovacao), today) 
        : null;

      return {
        leadId: lead.id,
        phone: lead.contato, // Número do cliente
        leadName: lead.name,
        instancePhone: lead.user?.phone || process.env.ADMIN_PHONE || '', // Número do corretor (instância)
        instanceName: lead.user?.phone || process.env.ADMIN_PHONE || 'default',
        ramo: lead.ramo || lead.interestedInProduct?.name || 'Seguro Residencial',
        campanha: lead.campanha || lead.origemLead || 'Campanha de Renovação',
        prioridade: lead.prioridade || 'Normal',
        agencia: lead.agencia || 'Agência Bancária',
        dataRenovacao: lead.dataRenovacao ? lead.dataRenovacao.toISOString() : null,
        diasAteVencimento: diasAteVencimento,
        corretorNome: lead.corretorNome || lead.user?.name || 'CSB Seguros',
        welcomeMessage: lead.user?.welcomeMessage || `Olá ${lead.name}, tudo bem? Aqui é o Lucas da CSB Seguros. Notei que a renovação do seu ${lead.ramo || lead.interestedInProduct?.name || 'seguro'} está próxima. Podemos conversar rapidinho sobre as condições exclusivas deste ano?`
      };
    });

    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    console.error("Erro no Scheduler de Disparos:", error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}