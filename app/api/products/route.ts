// app/api/products/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth';

const prisma = new PrismaClient();

// GET: Lista produtos do corretor
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const products = await prisma.insuranceProduct.findMany({
      where: { userId: session.user.id, status: 'ACTIVE' },
      orderBy: { createdAt: 'desc' }
    });
    return NextResponse.json(products);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar produtos' }, { status: 500 });
  }
}

// POST: Cria novo seguro
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const body = await request.json();
    const { name, description, monthlyPremium, assistances, coverages } = body;

    if (!name || !description) {
        return NextResponse.json({ error: 'Nome e Descrição são obrigatórios' }, { status: 400 });
    }

    const product = await prisma.insuranceProduct.create({
      data: {
        userId: session.user.id,
        name,
        description,
        monthlyPremium: parseFloat(monthlyPremium) || 0,
        assistances: typeof assistances === 'string' ? assistances.split(',').map((s: string) => s.trim()) : assistances,
        coverages: coverages // Espera um objeto JSON já estruturado ou string
      }
    });

    return NextResponse.json(product, { status: 201 });

  } catch (error) {
    console.error("Erro ao criar produto:", error);
    return NextResponse.json({ error: 'Erro ao salvar produto' }, { status: 500 });
  }
}