import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { name, email, phone, creci, image } = await request.json();

    const trimmedName = name ? String(name).trim() : undefined;

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: trimmedName,
        email,
        phone,
        creci,
        image // URL do blob
      }
    });

    // Se o nome foi atualizado, vincula eventuais leads em standby com esse nome
    if (trimmedName) {
      await prisma.lead.updateMany({
        where: {
          userId: null,
          corretorNome: {
            equals: trimmedName,
            mode: 'insensitive'
          }
        },
        data: {
          userId: session.user.id
        }
      });
    }

    return NextResponse.json(updatedUser);
  } catch (error) {
    console.error("Erro ao atualizar perfil:", error);
    return NextResponse.json({ error: 'Erro ao atualizar perfil' }, { status: 500 });
  }
}