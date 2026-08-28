// app/api/leads/messages/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { normalizePhoneNumber } from '@/lib/phoneUtils';

const N8N_INTERNAL_API_KEY = process.env.N8N_INTERNAL_API_KEY || process.env.API_SECRET_KEY || process.env.N8N_API_KEY;

export interface ChatMessageItem {
  id: string;
  role: 'assistant' | 'user' | 'system' | 'agent' | 'lead';
  content: string;
  timestamp: string;
  senderName?: string;
  status?: 'sent' | 'delivered' | 'read';
  mediaUrl?: string | null;
  messageType?: 'text' | 'image' | 'audio' | 'document';
}

function checkAuthorization(session: any, apiKey?: string | null) {
  if (session?.user?.id) {
    return { authorized: true, isAdmin: session.user.role === 'ADMIN', userId: session.user.id };
  }
  if (N8N_INTERNAL_API_KEY && apiKey === N8N_INTERNAL_API_KEY) {
    return { authorized: true, isAdmin: true, userId: null };
  }
  return { authorized: false, isAdmin: false, userId: null };
}

// POST: Registra uma nova mensagem (enviada pelo Lucas ou recebida do Lead)
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
      senderName, 
      timestamp, 
      mediaUrl, 
      messageType, 
      resumoDaConversa, 
      status,
      firstContactSent
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

    // Obter histórico existente
    let existingHistory: ChatMessageItem[] = [];
    if (Array.isArray(lead.historicoCompleto)) {
      existingHistory = lead.historicoCompleto as any[];
    } else if (typeof lead.historicoCompleto === 'string') {
      try {
        existingHistory = JSON.parse(lead.historicoCompleto);
      } catch {
        existingHistory = [];
      }
    }

    const newMessagesToAdd: ChatMessageItem[] = [];

    // Se foi passado um lote de mensagens
    if (Array.isArray(messages) && messages.length > 0) {
      for (const m of messages) {
        if (!m.content && !m.mediaUrl) continue;
        newMessagesToAdd.push({
          id: m.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          role: m.role || 'user',
          content: m.content || '',
          timestamp: m.timestamp || new Date().toISOString(),
          senderName: m.senderName || (m.role === 'assistant' ? 'Lucas (IA)' : lead.name),
          status: m.status || 'read',
          mediaUrl: m.mediaUrl || null,
          messageType: m.messageType || 'text'
        });
      }
    } 
    // Se foi passada uma mensagem individual
    else if (content !== undefined || mediaUrl) {
      const normalizedRole = role || 'user';
      
      // Se a mensagem contiver quebra por ||| (micro-mensagens do Lucas)
      if (typeof content === 'string' && content.includes('|||')) {
        const parts = content.split('|||').map(p => p.trim()).filter(Boolean);
        const baseTime = timestamp ? new Date(timestamp).getTime() : Date.now();
        
        parts.forEach((part, index) => {
          newMessagesToAdd.push({
            id: `msg_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 6)}`,
            role: normalizedRole,
            content: part,
            timestamp: new Date(baseTime + index * 1000).toISOString(),
            senderName: senderName || (normalizedRole === 'assistant' ? 'Lucas (IA)' : lead.name),
            status: 'read',
            mediaUrl: mediaUrl || null,
            messageType: messageType || 'text'
          });
        });
      } else {
        newMessagesToAdd.push({
          id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          role: normalizedRole,
          content: content || '',
          timestamp: timestamp || new Date().toISOString(),
          senderName: senderName || (normalizedRole === 'assistant' ? 'Lucas (IA)' : lead.name),
          status: 'read',
          mediaUrl: mediaUrl || null,
          messageType: messageType || 'text'
        });
      }
    }

    if (newMessagesToAdd.length === 0 && !resumoDaConversa && !status) {
      return NextResponse.json({ error: 'Nenhuma mensagem ou alteração fornecida.' }, { status: 400 });
    }

    // Mesclar histórico evitando duplicatas de id ou conteúdo idêntico em timestamp próximo
    const updatedHistory = [...existingHistory];
    for (const newMsg of newMessagesToAdd) {
      const isDuplicate = updatedHistory.some(
        h => h.id === newMsg.id || 
        (h.role === newMsg.role && h.content === newMsg.content && Math.abs(new Date(h.timestamp).getTime() - new Date(newMsg.timestamp).getTime()) < 3000)
      );
      if (!isDuplicate) {
        updatedHistory.push(newMsg);
      }
    }

    // Ordenar cronologicamente
    updatedHistory.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    // Atualizar o Lead no Banco
    const updatedLead = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        historicoCompleto: updatedHistory as any,
        ...(resumoDaConversa !== undefined && { resumoDaConversa }),
        ...(status !== undefined && { status }),
        ...(firstContactSent !== undefined && { firstContactSent }),
        updatedAt: new Date()
      },
      include: {
        interestedInProduct: true,
        agendamento: true
      }
    });

    return NextResponse.json({
      success: true,
      leadId: updatedLead.id,
      totalMessages: updatedHistory.length,
      messages: updatedHistory,
      resumoDaConversa: updatedLead.resumoDaConversa
    }, { status: 200 });

  } catch (error: any) {
    console.error('Erro ao salvar mensagens do chat:', error);
    return NextResponse.json({ error: 'Erro interno ao registrar mensagens.' }, { status: 500 });
  }
}

// GET: Retorna mensagens de um lead por ID ou telefone
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

    const messages = Array.isArray(lead.historicoCompleto) 
      ? lead.historicoCompleto 
      : (typeof lead.historicoCompleto === 'string' ? JSON.parse(lead.historicoCompleto || '[]') : []);

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
