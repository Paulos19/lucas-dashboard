'use server';

import { PrismaClient, Role } from '@prisma/client';
import { auth } from '@/lib/auth';
import { hash } from 'bcryptjs';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export async function adminChangeUserPassword(targetUserId: string, newPassword: string) {
  const session = await auth();

  // Verifica se quem está pedindo é Admin
  if (session?.user?.role !== Role.ADMIN) {
    throw new Error('Acesso negado.');
  }

  try {
    const hashedPassword = await hash(newPassword, 10);
    
    await prisma.user.update({
      where: { id: targetUserId },
      data: { password: hashedPassword }
    });

    revalidatePath('/admin/users');
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false, error: 'Erro ao atualizar senha' };
  }
}