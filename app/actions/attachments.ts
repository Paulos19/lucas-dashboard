'use server';

import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth';
import { revalidatePath } from 'next/cache';

const prisma = new PrismaClient();

export async function saveAttachment(leadId: string, fileUrl: string, fileName: string, fileType: string) {
  const session = await auth();
  if (!session?.user) throw new Error('Unauthorized');

  try {
    const attachment = await prisma.attachment.create({
      data: {
        leadId,
        url: fileUrl,
        name: fileName,
        type: fileType,
      },
    });

    revalidatePath(`/dashboard/leads/${leadId}`);
    return { success: true, attachment };
  } catch (error) {
    console.error('Erro ao salvar anexo:', error);
    return { success: false, error: 'Erro ao registrar arquivo' };
  }
}

export async function deleteAttachment(attachmentId: string) {
    const session = await auth();
    if (!session?.user) throw new Error('Unauthorized');
    
    // Nota: Em produção, idealmente deletaríamos do Vercel Blob também via API
    // mas remover do banco já "esconde" o arquivo.

    await prisma.attachment.delete({
        where: { id: attachmentId }
    });
    
    // Não temos o leadId fácil aqui para revalidar específico, 
    // então revalidamos o path geral de leads ou retornamos sucesso pro client atualizar
    return { success: true };
}