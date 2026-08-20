import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { hash } from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { name, email, password, phone, creci } = await request.json();

    // Validação básica
    if (!name || !email || !password || !phone) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const trimmedName = name.trim();

    // Verifica se já existe usuário com este email ou telefone
    const exists = await prisma.user.findFirst({
        where: { OR: [{ email }, { phone }] }
    });

    if (exists) {
      return NextResponse.json({ error: 'Email ou Telefone já cadastrado' }, { status: 409 });
    }

    // --- LÓGICA DO ADMIN ---
    // Se o email for igual ao do .env, define como ADMIN, senão USER
    const userRole = email === process.env.ADMIN_EMAIL ? Role.ADMIN : Role.USER;

    const hashedPassword = await hash(password, 10);
    const cleanPhone = phone.replace(/\D/g, ''); // Limpa telefone

    const user = await prisma.user.create({
      data: {
        name: trimmedName,
        email,
        password: hashedPassword,
        phone: cleanPhone,
        creci: creci || null,
        role: userRole, // Salva a role correta no banco
        onboardingCompleted: false,
      },
    });

    // Resgate de leads em standby da planilha do Admin:
    // Vincula os leads que têm exatamente o mesmo nome do corretor registrado
    const updateResult = await prisma.lead.updateMany({
      where: {
        userId: null,
        corretorNome: {
          equals: trimmedName,
          mode: 'insensitive'
        }
      },
      data: {
        userId: user.id
      }
    });

    console.log(`[Cadastro Corretor] '${trimmedName}' cadastrado com sucesso. ${updateResult.count} leads em standby vinculados.`);

    return NextResponse.json({ 
        success: true, 
        userId: user.id, 
        role: user.role,
        linkedLeadsCount: updateResult.count
    }, { status: 201 });

  } catch (error) {
    console.error("Erro no registro:", error);
    return NextResponse.json({ error: 'Erro interno ao criar conta.' }, { status: 500 });
  }
}