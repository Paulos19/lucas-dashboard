// app/api/properties/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// GET: Retorno seguro (recurso legado substituído por produtos de seguros)
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  return NextResponse.json([]);
}

// POST: Cria novo imóvel
export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  return NextResponse.json({ message: 'Módulo de imóveis migrado para produtos de seguros.' }, { status: 200 });
}