// app/api/agendamentos/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const N8N_API_KEY = process.env.N8N_INTERNAL_API_KEY;

// Função auxiliar para padronizar telefones (Mesma lógica da rota de Leads)
function standardizePhone(phone: string): string {
  if (!phone) return '';
  
  // 1. Remove tudo que não é número (tira o @s.whatsapp.net, +, -, etc)
  let clean = phone.replace(/\D/g, '');

  // 2. Lógica para Brasil (DDI 55)
  // Se tem 10 ou 11 dígitos (ex: 11999998888), assume que é BR e adiciona 55
  if (clean.length >= 10 && clean.length <= 11) {
    clean = '55' + clean;
  }
  
  return clean;
}

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

    // --- CORREÇÃO: Limpa o telefone antes de buscar ---
    const cleanPhone = standardizePhone(contatoLead);
    // --------------------------------------------------

    // 2. Busca o Lead pelo telefone limpo
    const lead = await prisma.lead.findFirst({
      where: { 
        userId: userId,
        contato: cleanPhone // Agora bate com o banco
      }
    });

    if (!lead) {
      console.log(`Lead não encontrado. Buscado por: ${cleanPhone} para User: ${userId}`);
      return NextResponse.json({ error: 'Lead não encontrado para este corretor.' }, { status: 404 });
    }

    // 3. Atualiza dados do Lead (Email capturado)
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

    // 4. Cria o Agendamento
    const agendamento = await prisma.agendamento.create({
      data: {
        userId,
        leadId: lead.id,
        dataHora: new Date(dataHoraISO),
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