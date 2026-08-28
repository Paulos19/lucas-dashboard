// app/api/leads/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

const N8N_INTERNAL_API_KEY = process.env.N8N_INTERNAL_API_KEY;

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
  const apiKey = request.headers.get('x-api-key');
  
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
      whereClause.OR = [
        { contato: cleanPhone },
        { contato: phone },
        { contato: { contains: phone.slice(-8) } }
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
        }
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
  const apiKey = request.headers.get('x-api-key');
  
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

    // Busca lead existente se houver
    const existingLead = await prisma.lead.findFirst({
      where: {
        OR: [
          { contato: cleanPhone },
          { contato: contato }
        ]
      }
    });

    const finalUserId = userId || body.userId || existingLead?.userId || null;

    let lead;
    if (existingLead) {
      lead = await prisma.lead.update({
        where: { id: existingLead.id },
        data: {
          ...(nome && { name: nome }),
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
          ...(historicoCompleto && { historicoCompleto }),
          updatedAt: new Date()
        }
      });
    } else {
      lead = await prisma.lead.create({
        data: {
          userId: finalUserId,
          name: nome || 'Lead Novo',
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
          historicoCompleto: historicoCompleto || [],
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