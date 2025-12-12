import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth';

const prisma = new PrismaClient();
const N8N_API_KEY = process.env.N8N_INTERNAL_API_KEY;

// GET: Lista slots
export async function GET(request: Request) {
  const session = await auth();
  const apiKey = request.headers.get('x-api-key');
  
  // Pega o userId da query string (para o n8n)
  const { searchParams } = new URL(request.url);
  const queryUserId = searchParams.get('userId');

  let targetUserId: string | undefined;

  // 1. Autenticação via Sessão (Acesso pelo Dashboard)
  if (session?.user?.id) {
    targetUserId = session.user.id;
  } 
  // 2. Autenticação via API Key (Acesso pelo n8n)
  else if (apiKey === N8N_API_KEY) {
    if (!queryUserId) {
       return NextResponse.json({ error: 'userId é obrigatório para acesso via API' }, { status: 400 });
    }
    targetUserId = queryUserId;
  } 
  // 3. Bloqueio
  else {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    // Retorna slots futuros apenas
    const slots = await prisma.availabilitySlot.findMany({
      where: { 
        userId: targetUserId, // Usa o ID definido pela lógica acima
        startTime: { gte: new Date() }, // Apenas futuros
        isBooked: false // Apenas livres
      },
      orderBy: { startTime: 'asc' }
    });
    return NextResponse.json(slots);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar disponibilidade' }, { status: 500 });
  }
}

// POST: Cria novo slot (Mantém proteção apenas por sessão, pois só o corretor cria)
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { startISO, endISO } = await request.json();
    
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

// DELETE: Remove slot (Mantém proteção apenas por sessão)
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