import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

const N8N_API_KEY = process.env.N8N_INTERNAL_API_KEY;

export async function GET(request: Request) {
  // 1. Validação de Segurança
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== N8N_API_KEY) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    // 2. Busca leads não contatados (limite de 10 por execução para evitar bloqueios de WhatsApp)
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
      orderBy: { createdAt: 'asc' }
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

    // 4. Formata o retorno para o n8n
    const responseData = leads.map(lead => ({
      leadId: lead.id,
      phone: lead.contato, // Número do cliente
      leadName: lead.name,
      instancePhone: lead.user?.phone || process.env.ADMIN_PHONE || '', // Número do corretor (instância)
      // Mensagem padrão se o corretor não configurou uma
      welcomeMessage: lead.user?.welcomeMessage || `Olá ${lead.name}, tudo bem? Aqui é o Lucas, assistente virtual da CSB Seguros. Vi que você tem interesse no ${lead.ramo || lead.interestedInProduct?.name || 'seguro'}. Podemos conversar rapidinho?`
    }));

    return NextResponse.json(responseData, { status: 200 });

  } catch (error) {
    console.error("Erro no Scheduler:", error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}