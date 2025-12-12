// app/api/agendamentos/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

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

export async function POST(request: Request) {
  // 1. Segurança
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== N8N_API_KEY) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { userId, contatoLead, dataHoraISO, nome, email, resumo } = body;

    // --- VALIDAÇÃO DE DATA (Correção do Erro) ---
    // Tenta criar a data. Se o formato for inválido, o .getTime() retorna NaN
    const dataAgendamento = new Date(dataHoraISO);
    
    if (isNaN(dataAgendamento.getTime())) {
        console.error(`Data inválida recebida: ${dataHoraISO}`);
        return NextResponse.json({ 
            error: 'Formato de data inválido. Use ISO 8601 (ex: 2025-12-30T14:00:00)' 
        }, { status: 400 });
    }
    // --------------------------------------------

    const cleanPhone = standardizePhone(contatoLead);

    // 2. Busca o Lead
    const lead = await prisma.lead.findFirst({
      where: { 
        userId: userId,
        contato: cleanPhone
      }
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado.' }, { status: 404 });
    }

    // 3. Atualiza Lead
    const dynamicData = lead.dynamicData ? JSON.parse(JSON.stringify(lead.dynamicData)) : {};
    if (email) dynamicData.email = email;
    if (nome) dynamicData.nomeConfirmado = nome;

    await prisma.lead.update({
        where: { id: lead.id },
        data: { 
            dynamicData,
            status: 'AGENDADO_COTACAO',
            updatedAt: new Date()
        }
    });

    // 4. Cria Agendamento
    const agendamento = await prisma.agendamento.create({
      data: {
        userId,
        leadId: lead.id,
        dataHora: dataAgendamento, // Usa a data validada
        tipo: 'REUNIAO_VENDAS',
        status: 'CONFIRMADO',
        resumo: resumo || `Agendamento automático via Lucas.`
      }
    });

    return NextResponse.json({ success: true, id: agendamento.id }, { status: 201 });

  } catch (error) {
    console.error("Erro ao agendar:", error);
    return NextResponse.json({ error: 'Erro interno ao criar agendamento.' }, { status: 500 });
  }
}