// app/api/properties/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth';

const prisma = new PrismaClient();

// GET: Lista imóveis do corretor logado
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const properties = await prisma.property.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(properties);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar imóveis' }, { status: 500 });
  }
}

// POST: Cria novo imóvel
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const { title, description, price, location, features, status } = body;

    // Validação
    if (!title || !description || !price) {
        return NextResponse.json({ error: 'Campos obrigatórios faltando' }, { status: 400 });
    }

    const property = await prisma.property.create({
      data: {
        userId: session.user.id,
        title,
        description,
        price: parseFloat(price),
        location,
        status: status || 'AVAILABLE',
        // Se vier como string separada por vírgula, converte para array de strings
        features: typeof features === 'string' 
            ? features.split(',').map((s: string) => s.trim()) 
            : features
      }
    });

    return NextResponse.json(property, { status: 201 });

  } catch (error) {
    console.error("Erro ao criar imóvel:", error);
    return NextResponse.json({ error: 'Erro ao salvar imóvel' }, { status: 500 });
  }
}