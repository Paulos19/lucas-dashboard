import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth';

const prisma = new PrismaClient();

// DELETE: Remove (ou arquiva) um produto
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { id } = await params;

    // Em vez de deletar fisicamente (o que quebraria histórico de leads), vamos marcar como ARCHIVED
    const product = await prisma.insuranceProduct.update({
      where: { id, userId: session.user.id },
      data: { status: 'ARCHIVED' }
    });

    return NextResponse.json({ success: true, product });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao excluir produto' }, { status: 500 });
  }
}

// PUT: Atualiza um produto
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    
    // Extraímos o isPostSales para atualização
    const { name, description, monthlyPremium, assistances, coverages, isPostSales } = body;

    const product = await prisma.insuranceProduct.update({
      where: { id, userId: session.user.id },
      data: {
        name,
        description,
        monthlyPremium: parseFloat(monthlyPremium),
        // Garante que assistances seja sempre um array de strings limpo
        assistances: typeof assistances === 'string' 
            ? assistances.split(',').map((s: string) => s.trim()).filter(Boolean)
            : assistances,
        coverages, // Mantém como veio (string ou json)
        
        // Atualiza a flag no banco de dados
        isPostSales: isPostSales 
      }
    });

    return NextResponse.json(product);
  } catch (error) {
    console.error("Erro ao atualizar:", error);
    return NextResponse.json({ error: 'Erro ao atualizar produto' }, { status: 500 });
  }
}