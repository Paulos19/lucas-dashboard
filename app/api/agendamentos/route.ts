// app/api/agendamentos/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth';

const prisma = new PrismaClient();
const N8N_API_KEY = process.env.N8N_INTERNAL_API_KEY;

function standardizePhone(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');
  if (clean.length >= 10 && clean.length <= 11) {
    clean = '55' + clean;
  }
  return clean;
}

// NOVO: GET para listar agendamentos do corretor
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

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
    return NextResponse.json({ error: 'Erro ao buscar agendamentos' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== N8N_API_KEY) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, contatoLead, dataHoraISO, nome, email, resumo } = body;

    // 1. Tratamento de Data e Fuso Horário (GMT-3)
    // O n8n vai mandar ISO (ex: 2025-12-12T14:00:00.000Z ou com offset -03:00)
    const dataAgendamento = new Date(dataHoraISO);
    
    if (isNaN(dataAgendamento.getTime())) {
        return NextResponse.json({ error: 'Data inválida.' }, { status: 400 });
    }

    const cleanPhone = standardizePhone(contatoLead);

    // 2. Busca o Lead
    const lead = await prisma.lead.findFirst({
      where: { userId, contato: cleanPhone }
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 });
    }

    // 3. VERIFICAÇÃO DE SLOT (NOVA LÓGICA)
    // Procura um slot do usuário que bata com o horário solicitado e não esteja ocupado
    // Usamos uma margem de tolerância de 1 minuto para evitar problemas de milissegundos
    const slot = await prisma.availabilitySlot.findFirst({
        where: {
            userId,
            isBooked: false,
            startTime: {
                gte: new Date(dataAgendamento.getTime() - 60000), // -1 min
                lte: new Date(dataAgendamento.getTime() + 60000)  // +1 min
            }
        }
    });

    if (!slot) {
        // Se não achar slot, o horário não está disponível ou já foi pego
        return NextResponse.json({ 
            error: 'Horário indisponível ou inválido. Por favor, escolha outro slot.' 
        }, { status: 409 }); // 409 Conflict
    }

    // 4. Transação Atômica: Cria Agendamento + Atualiza Lead + Ocupa Slot
    const result = await prisma.$transaction(async (tx) => {
        // Atualiza Lead
        const dynamicData = lead.dynamicData ? JSON.parse(JSON.stringify(lead.dynamicData)) : {};
        if (email) dynamicData.email = email;
        if (nome) dynamicData.nomeConfirmado = nome;

        await tx.lead.update({
            where: { id: lead.id },
            data: { 
                dynamicData,
                status: 'AGENDADO_COTACAO',
                updatedAt: new Date()
            }
        });

        // Marca Slot como Ocupado
        await tx.availabilitySlot.update({
            where: { id: slot.id },
            data: { isBooked: true, leadId: lead.id }
        });

        // Cria Agendamento
        return await tx.agendamento.create({
            data: {
                userId,
                leadId: lead.id,
                dataHora: dataAgendamento,
                tipo: 'REUNIAO_VENDAS',
                status: 'CONFIRMADO',
                resumo: resumo || `Agendamento automático via Lucas.`
            }
        });
    });

    return NextResponse.json({ success: true, id: result.id }, { status: 201 });

  } catch (error) {
    console.error("Erro ao agendar:", error);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}