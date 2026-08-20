import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// DELETE: Remove um lead
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { id } = await params;

    const whereClause: any = { id };
    if (session.user.role !== 'ADMIN') {
      whereClause.userId = session.user.id;
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
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();

    const { 
      name, contato, status, segmentacao, faturamentoEstimado,
      prioridade, ramo, campanha, fase, telefoneFixo, agencia,
      corretorNome, dataRenovacao, numeroApolice
    } = body;

    const whereClause: any = { id };
    if (session.user.role !== 'ADMIN') {
      whereClause.userId = session.user.id;
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