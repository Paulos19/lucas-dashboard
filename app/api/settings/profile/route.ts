import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        creci: true,
        image: true,
        role: true,
        evoApiKey: true,
        evoInstance: true,
        evoApiUrl: true,
      } as any
    });

    return NextResponse.json(user);
  } catch (error) {
    console.error("Erro ao buscar perfil:", error);
    return NextResponse.json({ error: 'Erro ao buscar perfil' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { name, email, phone, creci, image, evoApiKey, evoInstance, evoApiUrl } = await request.json();

    const trimmedName = name ? String(name).trim() : undefined;

    const updatedUser = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        name: trimmedName,
        email,
        phone,
        creci,
        image,
        evoApiKey: evoApiKey !== undefined ? (evoApiKey ? String(evoApiKey).trim() : null) : undefined,
        evoInstance: evoInstance !== undefined ? (evoInstance ? String(evoInstance).trim() : null) : undefined,
        evoApiUrl: evoApiUrl !== undefined ? (evoApiUrl ? String(evoApiUrl).trim() : null) : undefined,
      } as any
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