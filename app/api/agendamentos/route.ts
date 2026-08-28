// app/api/agendamentos/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

const N8N_API_KEY = process.env.N8N_INTERNAL_API_KEY || process.env.API_SECRET_KEY || process.env.N8N_API_KEY;

function cleanDigits(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const agendamentos = await prisma.agendamento.findMany({
      where: { userId: session.user.id },
      include: {
        lead: {
          select: { name: true, contato: true, status: true }
        }
      },
      orderBy: { dataHora: 'asc' }
    });

    return NextResponse.json(agendamentos);
  } catch (error) {
    console.error('Erro ao buscar agendamentos:', error);
    return NextResponse.json({ error: 'Erro ao buscar agendamentos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  if (!N8N_API_KEY || apiKey !== N8N_API_KEY) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, leadId, contatoLead, dataHoraISO, nome, email, resumo } = body;

    const dataAgendamento = new Date(dataHoraISO);
    if (isNaN(dataAgendamento.getTime())) {
      return NextResponse.json({ error: 'Data inválida.' }, { status: 400 });
    }

    const rawPhone = cleanDigits(contatoLead);
    const last8Digits = rawPhone.slice(-8);

    // 1. Busca prioritária por ID, depois por aproximação de telefone
    let lead = null;
    if (leadId) {
      lead = await prisma.lead.findUnique({ where: { id: leadId } });
    }

    if (!lead && last8Digits) {
      lead = await prisma.lead.findFirst({
        where: {
          OR: [
            { contato: { contains: last8Digits } },
            { telefoneFixo: { contains: last8Digits } }
          ]
        }
      });
    }

    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 });
    }

    // 2. Define o corretor responsável
    const finalUserId = userId || lead.userId || 'cmt1n79xv0000rxt40uffgwug';

    // 3. Verificação de Slot de Disponibilidade
    const slot = await prisma.availabilitySlot.findFirst({
      where: {
        userId: finalUserId,
        isBooked: false,
        startTime: {
          gte: new Date(dataAgendamento.getTime() - 60000),
          lte: new Date(dataAgendamento.getTime() + 60000)
        }
      }
    });

    if (!slot) {
      return NextResponse.json({
        error: 'Horário indisponível ou inválido. Por favor, escolha outro slot.'
      }, { status: 409 });
    }

    // 4. Transação Atômica
    const result = await prisma.$transaction(async (tx) => {
      const dynamicData = lead.dynamicData ? JSON.parse(JSON.stringify(lead.dynamicData)) : {};
      if (email) dynamicData.email = email;
      if (nome) dynamicData.nomeConfirmado = nome;

      await tx.lead.update({
        where: { id: lead.id },
        data: {
          userId: finalUserId,
          dynamicData,
          status: 'AGENDADO_COTACAO',
          resumoDaConversa: resumo || 'Agendamento confirmado via WhatsApp.',
          updatedAt: new Date()
        }
      });

      await tx.availabilitySlot.update({
        where: { id: slot.id },
        data: { isBooked: true, leadId: lead.id }
      });

      return await tx.agendamento.create({
        data: {
          userId: finalUserId,
          leadId: lead.id,
          dataHora: dataAgendamento,
          tipo: 'REUNIAO_VENDAS',
          status: 'CONFIRMADO',
          resumo: resumo || `Agendamento automático via Lucas.`
        }
      });
    });

    return NextResponse.json({ success: true, id: result.id, agendamento: result }, { status: 201 });

  } catch (error) {
    console.error('Erro ao agendar:', error);
    return NextResponse.json({ error: 'Erro interno ao processar agendamento.' }, { status: 500 });
  }
}