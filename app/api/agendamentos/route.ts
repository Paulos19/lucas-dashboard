import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const N8N_API_KEY = process.env.N8N_INTERNAL_API_KEY;

// POST: Cria um agendamento via n8n
export async function POST(request: Request) {
  // 1. Segurança
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== N8N_API_KEY) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, contatoLead, dataHoraISO, nome, email, resumo } = body;

    // 2. Busca o Lead pelo telefone para conectar
    const lead = await prisma.lead.findFirst({
      where: { 
        userId: userId,
        contato: contatoLead 
      }
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado para este corretor.' }, { status: 404 });
    }

    // 3. Atualiza dados do Lead (Email capturado)
    // Salvamos o email no dynamicData para não precisar migrar o banco agora
    const dynamicData = lead.dynamicData ? JSON.parse(JSON.stringify(lead.dynamicData)) : {};
    if (email) dynamicData.email = email;
    if (nome) dynamicData.nomeConfirmado = nome;

    await prisma.lead.update({
        where: { id: lead.id },
        data: { 
            dynamicData,
            status: 'AGENDADO_COTACAO', // Atualiza status do funil
            updatedAt: new Date()
        }
    });

    // 4. Cria o Agendamento
    const agendamento = await prisma.agendamento.create({
      data: {
        userId,
        leadId: lead.id,
        dataHora: new Date(dataHoraISO), // Formato esperado: 2023-12-25T14:30:00.000Z
        tipo: 'REUNIAO_VENDAS',
        status: 'CONFIRMADO',
        resumo: resumo || `Agendamento automático via Lucas. Cliente: ${nome}, Email: ${email}`
      }
    });

    return NextResponse.json({ success: true, id: agendamento.id }, { status: 201 });

  } catch (error) {
    console.error("Erro ao agendar:", error);
    return NextResponse.json({ error: 'Erro interno ao criar agendamento.' }, { status: 500 });
  }
}