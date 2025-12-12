import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth';

const prisma = new PrismaClient();

// DELETE: Remove um lead
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> } // Next.js 15: params é uma Promise
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { id } = await params;

    await prisma.lead.delete({
      where: { 
        id,
        userId: session.user.id // Garante que só deleta leads do próprio usuário
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
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

    // Filtramos apenas o que pode ser editado manualmente
    const { name, contato, status, segmentacao, faturamentoEstimado } = body;

    const updatedLead = await prisma.lead.update({
      where: { id, userId: session.user.id },
      data: {
        name,
        contato,
        status,
        segmentacao,
        faturamentoEstimado,
        updatedAt: new Date()
      }
    });

    return NextResponse.json(updatedLead);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao atualizar lead' }, { status: 500 });
  }
}