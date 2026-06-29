import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { compare } from 'bcryptjs';

const prisma = new PrismaClient();

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

export async function OPTIONS(request: Request) {
  return NextResponse.json({}, { headers: corsHeaders() });
}

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400, headers: corsHeaders() });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401, headers: corsHeaders() });
    }

    const isValid = await compare(password, user.password);

    if (!isValid) {
      return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401, headers: corsHeaders() });
    }

    // Retorna apenas os dados necessários para a extensão
    return NextResponse.json({ 
      success: true, 
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    }, { status: 200, headers: corsHeaders() });

  } catch (error) {
    console.error("Erro no login da extensão:", error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500, headers: corsHeaders() });
  }
}
