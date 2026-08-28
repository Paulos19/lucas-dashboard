// app/api/leads/[id]/messages/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

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

// GET: Retorna as mensagens do lead
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  const authRes = checkAuthorization(session, apiKey);

  if (!authRes.authorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const whereClause: any = { id };
    if (!authRes.isAdmin && authRes.userId) {
      whereClause.userId = authRes.userId;
    }

    const lead = await prisma.lead.findFirst({
      where: whereClause,
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

    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    const messages = Array.isArray(lead.historicoCompleto) 
      ? lead.historicoCompleto 
      : (typeof lead.historicoCompleto === 'string' ? JSON.parse(lead.historicoCompleto || '[]') : []);

    return NextResponse.json({
      lead,
      messages
    });
  } catch (error) {
    console.error('Erro ao buscar histórico de mensagens:', error);
    return NextResponse.json({ error: 'Erro interno ao buscar mensagens.' }, { status: 500 });
  }
}

// POST: Acrescenta mensagem ao histórico do lead
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  const authRes = checkAuthorization(session, apiKey);

  if (!authRes.authorized) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const { id } = await params;
    const whereClause: any = { id };
    if (!authRes.isAdmin && authRes.userId) {
      whereClause.userId = authRes.userId;
    }

    const lead = await prisma.lead.findFirst({
      where: whereClause
    });

    if (!lead) {
      return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const { role, content, senderName, timestamp, mediaUrl, messageType, resumoDaConversa, status } = body;

    if (!content && !mediaUrl) {
      return NextResponse.json({ error: 'Conteúdo da mensagem é obrigatório.' }, { status: 400 });
    }

    let existingHistory: any[] = [];
    if (Array.isArray(lead.historicoCompleto)) {
      existingHistory = lead.historicoCompleto as any[];
    } else if (typeof lead.historicoCompleto === 'string') {
      try {
        existingHistory = JSON.parse(lead.historicoCompleto);
      } catch {
        existingHistory = [];
      }
    }

    const normalizedRole = role || (session?.user?.id ? 'assistant' : 'user');
    const newItems: any[] = [];

    if (typeof content === 'string' && content.includes('|||')) {
      const parts = content.split('|||').map(p => p.trim()).filter(Boolean);
      const baseTime = timestamp ? new Date(timestamp).getTime() : Date.now();
      parts.forEach((part, idx) => {
        newItems.push({
          id: `msg_${Date.now()}_${idx}_${Math.random().toString(36).substr(2, 6)}`,
          role: normalizedRole,
          content: part,
          timestamp: new Date(baseTime + idx * 1000).toISOString(),
          senderName: senderName || (normalizedRole === 'assistant' ? 'Lucas (IA)' : lead.name),
          status: 'read',
          mediaUrl: mediaUrl || null,
          messageType: messageType || 'text'
        });
      });
    } else {
      newItems.push({
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

    const updatedHistory = [...existingHistory, ...newItems];

    const updatedLead = await prisma.lead.update({
      where: { id: lead.id },
      data: {
        historicoCompleto: updatedHistory as any,
        ...(resumoDaConversa !== undefined && { resumoDaConversa }),
        ...(status !== undefined && { status }),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      messages: updatedHistory,
      resumoDaConversa: updatedLead.resumoDaConversa
    }, { status: 200 });

  } catch (error) {
    console.error('Erro ao adicionar mensagem:', error);
    return NextResponse.json({ error: 'Erro ao adicionar mensagem.' }, { status: 500 });
  }
}
