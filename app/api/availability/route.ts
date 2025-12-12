import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth';

const prisma = new PrismaClient();

// GET: Lista slots
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    // Retorna slots futuros apenas, para não poluir
    const slots = await prisma.availabilitySlot.findMany({
      where: { 
        userId: session.user.id,
        startTime: { gte: new Date() } // Apenas futuros
      },
      orderBy: { startTime: 'asc' }
    });
    return NextResponse.json(slots);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar disponibilidade' }, { status: 500 });
  }
}

// POST: Cria novo slot
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { startISO, endISO } = await request.json();
    
    // Validações básicas
    const start = new Date(startISO);
    const end = new Date(endISO);

    if (start >= end) {
        return NextResponse.json({ error: 'Hora final deve ser maior que inicial' }, { status: 400 });
    }

    const slot = await prisma.availabilitySlot.create({
      data: {
        userId: session.user.id,
        startTime: start,
        endTime: end,
        isBooked: false
      }
    });

    return NextResponse.json(slot, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar slot' }, { status: 500 });
  }
}

// DELETE: Remove slot
export async function DELETE(request: Request) {
    const session = await auth();
    if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    try {
        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID necessário' }, { status: 400 });

        await prisma.availabilitySlot.delete({
            where: { id, userId: session.user.id }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
    }
}