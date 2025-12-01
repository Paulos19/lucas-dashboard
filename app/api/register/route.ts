// app/api/register/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { name, email, password, phone, creci } = await request.json();

    if (!name || !email || !password || !phone) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const exists = await prisma.user.findFirst({
        where: { OR: [{ email }, { phone }] }
    });

    if (exists) {
      return NextResponse.json({ error: 'Email ou Telefone já cadastrado' }, { status: 409 });
    }

    const hashedPassword = await hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone.replace(/\D/g, ''), // Limpa telefone
        creci
      },
    });

    return NextResponse.json({ success: true, userId: user.id }, { status: 201 });

  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}