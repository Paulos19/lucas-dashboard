import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth';
import { compare, hash } from 'bcryptjs';

const prisma = new PrismaClient();

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { currentPassword, newPassword } = await request.json();

    if (!newPassword || newPassword.length < 6) {
        return NextResponse.json({ error: 'A nova senha deve ter no mínimo 6 caracteres' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
        where: { id: session.user.id }
    });

    if (!user) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });

    // Verifica senha atual
    const isValid = await compare(currentPassword, user.password);
    if (!isValid) {
        return NextResponse.json({ error: 'Senha atual incorreta' }, { status: 400 });
    }

    // Hash da nova senha
    const hashedPassword = await hash(newPassword, 10);

    await prisma.user.update({
        where: { id: session.user.id },
        data: { password: hashedPassword }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao alterar senha' }, { status: 500 });
  }
}