// app/api/leads/messages/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { normalizePhoneNumber } from '@/lib/phoneUtils';
import { parseAndFormatChatHistory, StandardChatMessage } from '@/lib/chatParser';

const N8N_INTERNAL_API_KEY = process.env.N8N_INTERNAL_API_KEY || process.env.API_SECRET_KEY || process.env.N8N_API_KEY;

function checkAuthorization(session: any, apiKey?: string | null) {
  if (session?.user?.id) {
    return { authorized: true, isAdmin: session.user.role === 'ADMIN', userId: session.user.id };
  }
  if (N8N_INTERNAL_API_KEY && apiKey === N8N_INTERNAL_API_KEY) {
    return { authorized: true, isAdmin: true, userId: null };
  }
  return { authorized: false, isAdmin: false, userId: null };
}

// POST: Registra ou sincroniza mensagens (LangChain, Redis Chat Memory, ChatML ou texto simples)
export async function POST(request: Request) {
  const session = await auth();
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  const authRes = checkAuthorization(session, apiKey);

  if (!authRes.authorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { 
      leadId, 
      phone, 
      contato, 
      role, 
      content, 
      messages,
      chatHistory,
      redisChatMemory,
      historicoCompleto,
      senderName, 
      timestamp, 
      mediaUrl, 
      messageType, 
      resumoDaConversa, 
      status,
      firstContactSent,
      nome
    } = body;

    // Localizar o Lead por ID ou Telefone
    let lead = null;
    if (leadId) {
      lead = await prisma.lead.findUnique({ where: { id: leadId } });
    }

    const phoneToSearch = phone || contato;
    if (!lead && phoneToSearch) {
      const normalized = normalizePhoneNumber(phoneToSearch);
      const rawDigits = phoneToSearch.replace(/\D/g, '');
      const last8 = rawDigits.slice(-8);

      lead = await prisma.lead.findFirst({
        where: {
          OR: [
            { contato: normalized },
            { contato: phoneToSearch },
            { contato: { contains: last8 } },
            { telefoneFixo: { contains: last8 } }
          ]
        }
      });
    }

    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado para registrar a mensagem.' }, { status: 404 });
    }

    const leadDisplayName = nome || (lead.name !== 'Lead Novo' ? lead.name : 'Cliente');

    // Reunir qualquer formato de mensagens enviado
    const incomingData = messages || chatHistory || redisChatMemory || historicoCompleto;
    let newItemsToParse: any[] = [];

    if (incomingData) {
      newItemsToParse = Array.isArray(incomingData) ? incomingData : [incomingData];
    } else if (content !== undefined || mediaUrl) {
      newItemsToParse = [{
        role: role || 'assistant',
        content: content || '',
        timestamp: timestamp || new Date().toISOString(),
        senderName: senderName || (role === 'user' ? leadDisplayName : 'Lucas (IA)'),
        mediaUrl,
        messageType
      }];
    }

    // Obter histórico existente no banco
    const existing = lead.historicoCompleto || [];
    const combined = [
      ...(Array.isArray(existing) ? existing : [existing]),
      ...newItemsToParse
    ];

    // Parser universal (formata LangChain Core, Redis Memory, ||| splits, etc)
    const formattedHistory = parseAndFormatChatHistory(combined, leadDisplayName);

    // Atualizar o Lead no Banco
    const updatedLead = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        historicoCompleto: formattedHistory as any,
        ...(nome && { name: nome }),
        ...(resumoDaConversa !== undefined && { resumoDaConversa }),
        ...(status !== undefined && { status }),
        ...(firstContactSent !== undefined && { firstContactSent }),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      leadId: updatedLead.id,
      totalMessages: formattedHistory.length,
      messages: formattedHistory,
      resumoDaConversa: updatedLead.resumoDaConversa
    }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao salvar mensagens do chat:', error);
    return NextResponse.json({ error: 'Erro interno ao registrar mensagens.' }, { status: 500 });
  }
}

// GET: Retorna mensagens formatadas de um lead por ID ou telefone
export async function GET(request: Request) {
  const session = await auth();
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  const authRes = checkAuthorization(session, apiKey);

  if (!authRes.authorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const leadId = searchParams.get('leadId') || searchParams.get('id');
  const phone = searchParams.get('phone') || searchParams.get('contato');

  if (!leadId && !phone) {
    return NextResponse.json({ error: 'Informe leadId ou phone' }, { status: 400 });
  }

  try {
    let lead = null;
    if (leadId) {
      lead = await prisma.lead.findUnique({
        where: { id: leadId },
        select: {
          id: true,
          name: true,
          contato: true,
          status: true,
          resumoDaConversa: true,
          historicoCompleto: true,
          dataRenovacao: true,
          ramo: true,
          campanha: true,
          prioridade: true,
          firstContactSent: true,
          updatedAt: true
        }
      });
    }

    if (!lead && phone) {
      const normalized = normalizePhoneNumber(phone);
      const last8 = phone.replace(/\D/g, '').slice(-8);

      lead = await prisma.lead.findFirst({
        where: {
          OR: [
            { contato: normalized },
            { contato: phone },
            { contato: { contains: last8 } }
          ]
        },
        select: {
          id: true,
          name: true,
          contato: true,
          status: true,
          resumoDaConversa: true,
          historicoCompleto: true,
          dataRenovacao: true,
          ramo: true,
          campanha: true,
          prioridade: true,
          firstContactSent: true,
          updatedAt: true
        }
      });
    }

    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    const messages = parseAndFormatChatHistory(lead.historicoCompleto, lead.name);

    return NextResponse.json({
      lead: {
        id: lead.id,
        name: lead.name,
        contato: lead.contato,
        status: lead.status,
        resumoDaConversa: lead.resumoDaConversa,
        dataRenovacao: lead.dataRenovacao,
        ramo: lead.ramo,
        campanha: lead.campanha,
        prioridade: lead.prioridade,
        firstContactSent: lead.firstContactSent,
        updatedAt: lead.updatedAt
      },
      messages
    });
  } catch (error) {
    console.error('Erro ao buscar mensagens do chat:', error);
    return NextResponse.json({ error: 'Erro ao buscar mensagens' }, { status: 500 });
  }
}
