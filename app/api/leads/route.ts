// app/api/leads/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { parseAndFormatChatHistory } from '@/lib/chatParser';

const N8N_INTERNAL_API_KEY = process.env.N8N_INTERNAL_API_KEY || process.env.API_SECRET_KEY || process.env.N8N_API_KEY;

// Função auxiliar para padronizar telefones BR
function standardizePhone(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');
  if (clean.length >= 10 && clean.length <= 11) {
    clean = '55' + clean;
  }
  return clean;
}

// GET: Lista ou busca leads (Suporta Sessão do Dashboard e API Key do n8n)
export async function GET(request: Request) {
  const session = await auth();
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  
  let userId = session?.user?.id;

  // Validação de Segurança (Sessão de usuário OU x-api-key do n8n)
  if (!userId) {
    if (!N8N_INTERNAL_API_KEY || apiKey !== N8N_INTERNAL_API_KEY) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '50');
  const skip = (page - 1) * limit;
  const phone = searchParams.get('phone') || searchParams.get('contato');
  const leadId = searchParams.get('id') || searchParams.get('leadId');
  const targetUserId = searchParams.get('userId') || (session?.user?.role !== 'ADMIN' ? userId : undefined);

  try {
    const whereClause: any = {};

    if (targetUserId) {
      whereClause.userId = targetUserId;
    }

    if (leadId) {
      whereClause.id = leadId;
    }

    if (phone) {
      const cleanPhone = standardizePhone(phone);
      const last8 = phone.replace(/\D/g, '').slice(-8);
      whereClause.OR = [
        { contato: cleanPhone },
        { contato: phone },
        { contato: { contains: last8 } }
      ];
    }

    if (status) {
      whereClause.status = status;
    }

    const sortBy = searchParams.get('sortBy');

    const orderBy: any = sortBy === 'updatedAt'
      ? { updatedAt: 'desc' }
      : [
          { dataRenovacao: { sort: 'asc', nulls: 'last' } },
          { prioridade: 'asc' },
          { updatedAt: 'desc' }
        ];

    const leads = await prisma.lead.findMany({
      where: whereClause,
      orderBy: orderBy,
      take: limit,
      skip: skip,
      include: {
        interestedInProduct: {
          select: { id: true, name: true, description: true, monthlyPremium: true, coverages: true, assistances: true }
        },
        user: {
          select: { id: true, name: true, phone: true, email: true }
        },
        agendamento: true
      }
    });

    // Se a busca foi por telefone ou ID específico e retornou 1 lead, pode retornar o objeto diretamente ou lista
    if ((phone || leadId) && leads.length === 1 && !searchParams.get('formatList')) {
      return NextResponse.json(leads[0]);
    }
    
    return NextResponse.json(leads);
  } catch (error) {
    console.error("Erro ao buscar leads:", error);
    return NextResponse.json({ error: 'Erro ao buscar leads' }, { status: 500 });
  }
}

// POST: Criação / Atualização de Leads (Dashboard e n8n)
export async function POST(request: Request) {
  const session = await auth();
  const apiKey = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
  
  let userId = session?.user?.id;

  // Validação de Segurança (API Key ou Sessão)
  if (!userId) {
    if (!N8N_INTERNAL_API_KEY || apiKey !== N8N_INTERNAL_API_KEY) {
      return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
    }
  }

  try {
    const body = await request.json();
    const { 
      nome, contato, segmentacao, faturamentoEstimado, 
      dynamicData, historicoCompleto, status, resumoDaConversa, firstContactSent,
      prioridade, ramo, campanha, agencia, dataRenovacao, telefoneFixo, corretorNome
    } = body;

    if (!contato) {
      return NextResponse.json({ error: 'Contato é obrigatório' }, { status: 400 });
    }

    const cleanPhone = standardizePhone(contato);
    const rawDigits = contato.replace(/\D/g, '');
    const last8 = rawDigits.slice(-8);

    // Busca lead existente por contato
    const existingLead = await prisma.lead.findFirst({
      where: {
        OR: [
          { contato: cleanPhone },
          { contato: contato },
          { contato: { contains: last8 } },
          { telefoneFixo: { contains: last8 } }
        ]
      }
    });

    const finalUserId = userId || body.userId || existingLead?.userId || null;
    
    // Tratamento inteligente do nome
    const confirmedName = nome || dynamicData?.nomeConfirmado || (existingLead?.name !== 'Lead Novo' ? existingLead?.name : undefined);

    // Tratamento e Formatação Universal do Histórico de Conversa (LangChain, Redis Chat Memory ou array)
    const rawChatHistory = historicoCompleto || body.messages || body.chatHistory || body.redisChatMemory;
    let formattedHistory: any = undefined;

    if (rawChatHistory !== undefined) {
      const existing = existingLead?.historicoCompleto || [];
      const combined = [
        ...(Array.isArray(existing) ? existing : [existing]),
        ...(Array.isArray(rawChatHistory) ? rawChatHistory : [rawChatHistory])
      ];
      formattedHistory = parseAndFormatChatHistory(combined, confirmedName || existingLead?.name || 'Cliente');
    }

    let lead;
    if (existingLead) {
      lead = await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          ...(confirmedName && { name: confirmedName }),
          ...(segmentacao && { segmentacao }),
          ...(faturamentoEstimado && { faturamentoEstimado }),
          ...(prioridade && { prioridade }),
          ...(ramo && { ramo }),
          ...(campanha && { campanha }),
          ...(agencia && { agencia }),
          ...(telefoneFixo && { telefoneFixo }),
          ...(corretorNome && { corretorNome }),
          ...(dataRenovacao && { dataRenovacao: new Date(dataRenovacao) }),
          ...(status && { status }),
          ...(resumoDaConversa !== undefined && { resumoDaConversa }),
          ...(firstContactSent !== undefined && { firstContactSent }),
          ...(dynamicData && { dynamicData }),
          ...(formattedHistory !== undefined && { historicoCompleto: formattedHistory }),
          updatedAt: new Date()
        }
      });
    } else {
      lead = await prisma.lead.create({
        data: {
          userId: finalUserId,
          name: confirmedName || 'Lead Novo',
          contato: cleanPhone,
          segmentacao: segmentacao || 'ENTRANTE',
          faturamentoEstimado: faturamentoEstimado || '',
          prioridade: prioridade || null,
          ramo: ramo || null,
          campanha: campanha || 'Campanha de Renovação',
          agencia: agencia || null,
          telefoneFixo: telefoneFixo || null,
          corretorNome: corretorNome || null,
          dataRenovacao: dataRenovacao ? new Date(dataRenovacao) : null,
          dynamicData: dynamicData || {},
          historicoCompleto: formattedHistory || [],
          resumoDaConversa: resumoDaConversa || null,
          status: status || 'ENTRANTE',
          firstContactSent: firstContactSent ?? false
        }
      });
    }

    return NextResponse.json({ success: true, leadId: lead.id, lead }, { status: 200 });

  } catch (error) {
    console.error("Erro ao salvar lead:", error);
    return NextResponse.json({ error: 'Erro interno ao processar lead.' }, { status: 500 });
  }
}