// app/api/agendamentos/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

const N8N_API_KEY = process.env.N8N_INTERNAL_API_KEY || process.env.API_SECRET_KEY || process.env.N8N_API_KEY;

function cleanDigits(phone: string): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

// GET: Retorna agendamentos do corretor logado
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
          select: { id: true, name: true, contato: true, status: true, ramo: true, numeroApolice: true, dataRenovacao: true }
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

// POST: Cria agendamento (suporta tanto Dashboard do Corretor quanto IA via N8N)
export async function POST(request: Request) {
  const session = await auth();
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');

  const isN8N = N8N_API_KEY && apiKey === N8N_API_KEY;
  const isDashboard = !!session?.user?.id;

  if (!isN8N && !isDashboard) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();

    // ─────────────────────────────────────────────────────────────
    // CASO A: AGENDAMENTO MANUAL PELO DASHBOARD (Corretor Logado)
    // ─────────────────────────────────────────────────────────────
    if (isDashboard && !isN8N) {
      const { leadId, dataHoraISO, tipo, resumo, status } = body;

      if (!leadId) {
        return NextResponse.json({ error: 'leadId é obrigatório' }, { status: 400 });
      }

      const dataAgendamento = new Date(dataHoraISO);
      if (isNaN(dataAgendamento.getTime())) {
        return NextResponse.json({ error: 'Data/Hora inválida' }, { status: 400 });
      }

      // 1. Busca o Lead
      const lead = await prisma.lead.findUnique({
        where: { id: leadId }
      });

      if (!lead) {
        return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
      }

      const userId = session?.user?.id;
      if (!userId) {
        return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
      }
      const finalTipo = tipo || 'COTACAO_RESIDENCIAL';
      const finalStatus = status || 'CONFIRMADO';

      // 2. Transação Atômica
      const result = await prisma.$transaction(async (tx) => {
        // Busca se existe slot correspondente
        const existingSlot = await tx.availabilitySlot.findFirst({
          where: {
            userId: userId,
            startTime: {
              gte: new Date(dataAgendamento.getTime() - 60000),
              lte: new Date(dataAgendamento.getTime() + 60000)
            }
          }
        });

        if (existingSlot) {
          // Ocupa o slot
          await tx.availabilitySlot.update({
            where: { id: existingSlot.id },
            data: { isBooked: true, leadId: lead.id }
          });
        } else {
          // Cria o slot já ocupado para manter o histórico íntegro
          const slotEnd = new Date(dataAgendamento.getTime() + 60 * 60 * 1000);
          await tx.availabilitySlot.create({
            data: {
              userId: userId,
              startTime: dataAgendamento,
              endTime: slotEnd,
              isBooked: true,
              leadId: lead.id
            }
          });
        }

        // Atualiza o Lead para status AGENDADO_COTACAO
        await tx.lead.update({
          where: { id: lead.id },
          data: {
            userId: userId,
            status: 'AGENDADO_COTACAO',
            resumoDaConversa: resumo ? `${lead.resumoDaConversa ? lead.resumoDaConversa + '\n' : ''}[Agendamento]: ${resumo}` : lead.resumoDaConversa,
            updatedAt: new Date()
          }
        });

        // Upsert no Agendamento
        return await tx.agendamento.upsert({
          where: { leadId: lead.id },
          update: {
            userId: userId,
            dataHora: dataAgendamento,
            tipo: finalTipo,
            status: finalStatus,
            resumo: resumo || 'Agendamento cadastrado manualmente pelo corretor.',
            updatedAt: new Date()
          },
          create: {
            userId: userId,
            leadId: lead.id,
            dataHora: dataAgendamento,
            tipo: finalTipo,
            status: finalStatus,
            resumo: resumo || 'Agendamento cadastrado manualmente pelo corretor.'
          }
        });
      });

      return NextResponse.json({ success: true, agendamento: result }, { status: 201 });
    }

    // ─────────────────────────────────────────────────────────────
    // CASO B: AGENDAMENTO AUTOMÁTICO VIA N8N / LUCAS AI
    // ─────────────────────────────────────────────────────────────
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

    const finalUserId: string = (userId || lead.userId || 'cmt1n79xv0000rxt40uffgwug') as string;
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
          resumoDaConversa: resumo || 'Agendamento confirmado via WhatsApp pelo Lucas AI.',
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

      // Upsert no Agendamento
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