// app/api/leads/uncontacted/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth'; // Importe auth para segurança

const prisma = new PrismaClient();
const N8N_INTERNAL_API_KEY = process.env.N8N_INTERNAL_API_KEY;

/**
 * GET: Busca Leads que ainda não foram contatados.
 *
 * É uma API interna, protegida por uma chave secreta (N8N_INTERNAL_API_KEY).
 * O n8n chama este endpoint periodicamente.
 */
export async function GET(request: Request) {
  // 1. Validação de Segurança (Chave n8n)
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== N8N_INTERNAL_API_KEY || !N8N_INTERNAL_API_KEY) {
    return NextResponse.json({ error: 'Acesso não autorizado ou chave de API ausente.' }, { status: 401 });
  }

  try {
    // 2. Busca leads: Status ENTRANTE E firstContactSent é FALSE
    const leads = await prisma.lead.findMany({
      where: {
        status: 'ENTRANTE',
        firstContactSent: false,
      },
      select: {
        id: true,
        name: true,
        contato: true,
        userId: true, // Necessário para saber quem é o corretor
        user: {
            select: {
                welcomeMessage: true // Mensagem de saudação personalizada
            }
        }
      },
      // Limita a 100 leads por chamada para evitar sobrecarga no WhatsApp
      take: 100, 
      orderBy: {
        createdAt: 'asc', // Prioriza os leads mais antigos
      }
    });

    if (leads.length === 0) {
        return NextResponse.json({ message: 'Nenhum lead entrante pendente.' }, { status: 200 });
    }

    // 3. Marca os leads como "firstContactSent: true" IMEDIATAMENTE antes de retornar.
    // Isso é feito em bloco para evitar que o n8n pegue os mesmos leads em caso de falha.
    // (A Evolution API fará o trabalho de envio, mas a responsabilidade do backend termina aqui)
    const leadIdsToUpdate = leads.map(lead => lead.id);
    await prisma.lead.updateMany({
        where: { id: { in: leadIdsToUpdate } },
        data: { firstContactSent: true },
    });

    // 4. Retorna os leads e a mensagem de saudação do corretor
    return NextResponse.json(leads.map(lead => ({
        leadId: lead.id,
        phone: lead.contato,
        leadName: lead.name,
        welcomeMessage: lead.user.welcomeMessage || `Olá, ${lead.name}! Meu nome é Lucas e sou o assistente virtual do seu corretor na CSB Seguros. Como posso te ajudar hoje com seu seguro residencial?`
    })));

  } catch (error) {
    console.error("Erro no Scheduler API:", error);
    return NextResponse.json({ error: 'Erro interno do servidor ao buscar leads.' }, { status: 500 });
  }
}