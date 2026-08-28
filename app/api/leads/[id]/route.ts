import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

const N8N_INTERNAL_API_KEY = process.env.N8N_INTERNAL_API_KEY;

function checkAuth(session: any, apiKey: string | null) {
  if (session?.user?.id) {
    return { authorized: true, isAdmin: session.user.role === 'ADMIN', userId: session.user.id };
  }
  if (N8N_INTERNAL_API_KEY && apiKey === N8N_INTERNAL_API_KEY) {
    return { authorized: true, isAdmin: true, userId: null };
  }
  return { authorized: false, isAdmin: false, userId: null };
}

// GET: Busca um lead por ID
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const apiKey = request.headers.get('x-api-key');
  const authRes = checkAuth(session, apiKey);

  if (!authRes.authorized) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { id } = await params;
    const whereClause: any = { id };
    if (!authRes.isAdmin && authRes.userId) {
      whereClause.userId = authRes.userId;
    }

    const lead = await prisma.lead.findFirst({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, phone: true, email: true }
        },
        interestedInProduct: true,
        agendamento: true,
        attachments: true
      }
    });

    if (!lead) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });
    return NextResponse.json(lead);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar lead' }, { status: 500 });
  }
}

// DELETE: Remove um lead
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const apiKey = request.headers.get('x-api-key');
  const authRes = checkAuth(session, apiKey);

  if (!authRes.authorized) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { id } = await params;

    const whereClause: any = { id };
    if (!authRes.isAdmin && authRes.userId) {
      whereClause.userId = authRes.userId;
    }

    await prisma.lead.deleteMany({
      where: whereClause
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao excluir lead:', error);
    return NextResponse.json({ error: 'Erro ao excluir lead' }, { status: 500 });
  }
}

// PUT: Atualiza um lead
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const apiKey = request.headers.get('x-api-key');
  const authRes = checkAuth(session, apiKey);

  if (!authRes.authorized) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();

    const { 
      name, contato, status, segmentacao, faturamentoEstimado,
      prioridade, ramo, campanha, fase, telefoneFixo, agencia,
      corretorNome, dataRenovacao, numeroApolice, firstContactSent,
      resumoDaConversa, dynamicData, historicoCompleto
    } = body;

    const whereClause: any = { id };
    if (!authRes.isAdmin && authRes.userId) {
      whereClause.userId = authRes.userId;
    }

    const updatedLead = await prisma.lead.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(contato !== undefined && { contato }),
        ...(status !== undefined && { status }),
        ...(segmentacao !== undefined && { segmentacao }),
        ...(faturamentoEstimado !== undefined && { faturamentoEstimado }),
        ...(prioridade !== undefined && { prioridade }),
        ...(ramo !== undefined && { ramo }),
        ...(campanha !== undefined && { campanha }),
        ...(fase !== undefined && { fase }),
        ...(telefoneFixo !== undefined && { telefoneFixo }),
        ...(agencia !== undefined && { agencia }),
        ...(corretorNome !== undefined && { corretorNome }),
        ...(numeroApolice !== undefined && { numeroApolice }),
        ...(firstContactSent !== undefined && { firstContactSent }),
        ...(resumoDaConversa !== undefined && { resumoDaConversa }),
        ...(dynamicData !== undefined && { dynamicData }),
        ...(historicoCompleto !== undefined && { historicoCompleto }),
        ...(dataRenovacao !== undefined && { 
          dataRenovacao: dataRenovacao ? new Date(dataRenovacao) : null 
        }),
        updatedAt: new Date()
      }
    });

    return NextResponse.json(updatedLead);
  } catch (error) {
    console.error('Erro ao atualizar lead:', error);
    return NextResponse.json({ error: 'Erro ao atualizar lead' }, { status: 500 });
  }
}