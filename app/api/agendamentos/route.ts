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
    const { userId, leadId, contatoLead, dataHoraISO, nome, email, resumo, tipo } = body;

    const dataAgendamento = new Date(dataHoraISO);
    if (isNaN(dataAgendamento.getTime())) {
      return NextResponse.json({ error: 'Data inválida.' }, { status: 400 });
    }

    const rawPhone = cleanDigits(contatoLead);
    const last8Digits = rawPhone.slice(-8);

    // 1. Localiza o Lead por ID ou telefone
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

    const finalUserId = userId || lead.userId || 'cmt1n79xv0000rxt40uffgwug';
    const finalNome = nome || lead.name;
    const finalTipo = tipo || 'COTACAO_RESIDENCIAL';

    // 2. Busca do Slot de Disponibilidade
    const slot = await prisma.availabilitySlot.findFirst({
      where: {
        userId: finalUserId,
        isBooked: false,
        startTime: {
          gte: new Date(dataAgendamento.getTime() - 60000), // -1 min
          lte: new Date(dataAgendamento.getTime() + 60000)  // +1 min
        }
      }
    });

    if (!slot) {
      return NextResponse.json({
        error: 'Horário indisponível ou inválido. Por favor, escolha outro slot.'
      }, { status: 409 });
    }

    // 3. Transação Atômica: Atualiza Lead + Ocupa Slot + Upsert no Agendamento
    const result = await prisma.$transaction(async (tx) => {
      // Atualiza Lead
      const dynamicDataObj: any = lead.dynamicData ? JSON.parse(JSON.stringify(lead.dynamicData)) : {};
      if (email) dynamicDataObj.email = email;
      if (finalNome) dynamicDataObj.nomeConfirmado = finalNome;

      await tx.lead.update({
        where: { id: lead.id },
        data: {
          userId: finalUserId,
          dynamicData: dynamicDataObj,
          status: 'AGENDADO_COTACAO',
          resumoDaConversa: resumo || 'Agendamento confirmado via WhatsApp.',
          updatedAt: new Date()
        }
      });

      // Ocupa o Slot
      await tx.availabilitySlot.update({
        where: { id: slot.id },
        data: {
          isBooked: true,
          leadId: lead.id
        }
      });

      // Upsert no Agendamento (Atualiza se já existir agendamento para este lead, ou cria novo)
      return await tx.agendamento.upsert({
        where: {
          leadId: lead.id
        },
        update: {
          userId: finalUserId,
          dataHora: dataAgendamento,
          tipo: finalTipo,
          status: 'PENDENTE',
          resumo: resumo || 'Reagendamento automático via Lucas.',
          updatedAt: new Date()
        },
        create: {
          userId: finalUserId,
          leadId: lead.id,
          dataHora: dataAgendamento,
          tipo: finalTipo,
          status: 'PENDENTE',
          resumo: resumo || 'Agendamento automático via Lucas.'
        }
      });
    });

    return NextResponse.json({ success: true, id: result.id, agendamento: result }, { status: 201 });

  } catch (error: any) {
    console.error('Erro detalhado ao agendar:', error);
    return NextResponse.json({
      error: 'Erro interno ao processar agendamento.',
      details: error?.message || String(error)
    }, { status: 500 });
  }
}