import { NextResponse } from 'next/server';
import { PrismaClient, Role } from '@prisma/client'; // Importar Role
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

export async function POST(request: Request) {
  try {
    const { name, email, password, phone, creci } = await request.json();

    // Validação básica
    if (!name || !email || !password || !phone) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

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
        name,
        email,
        password: hashedPassword,
        phone: cleanPhone,
        creci: creci || null,
        role: userRole, // Salva a role correta no banco
        onboardingCompleted: false,
      },
    });

    return NextResponse.json({ 
        success: true, 
        userId: user.id, 
        role: user.role 
    }, { status: 201 });

  } catch (error) {
    console.error("Erro no registro:", error);
    return NextResponse.json({ error: 'Erro interno ao criar conta.' }, { status: 500 });
  }
}