'use server';

import { PrismaClient, LeadStatus } from '@prisma/client'; // <--- Importamos o Enum aqui
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export async function updateLeadStatus(leadId: string, newStatus: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Não autorizado');
  }

  // --- CORREÇÃO DO ERRO ---
  // Convertemos a string genérica para o tipo Enum 'LeadStatus'
  // O TypeScript agora aceita porque afirmamos que newStatus é um valor válido do Enum
  const status = newStatus as LeadStatus; 

  try {
    await prisma.lead.update({
      where: { 
        id: leadId,
        userId: session.user.id // Segurança: garante que o lead é do usuário
      },
      data: { 
        status: status, // Agora bate com o tipo do Schema
        updatedAt: new Date()
      }
    });

    // Revalida o cache para atualizar a tela instantaneamente
    revalidatePath('/dashboard/leads');
    return { success: true };
  } catch (error) {
    console.error("Erro ao mover card:", error);
    return { success: false, error: 'Falha ao atualizar status' };
  }
}