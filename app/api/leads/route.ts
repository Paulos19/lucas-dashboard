// app/api/leads/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth'; // Importe auth para validar sessão no GET

const prisma = new PrismaClient();
const N8N_INTERNAL_API_KEY = process.env.N8N_INTERNAL_API_KEY;

// GET: Lista leads do corretor logado (Para o Dashboard)
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const leads = await prisma.lead.findMany({
      where: { userId: session.user.id },
      orderBy: { updatedAt: 'desc' },
      include: {
        interestedInProduct: {
            select: { name: true }
        }
      }
    });
    return NextResponse.json(leads);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar leads' }, { status: 500 });
  }
}

// POST: Cria ou Atualiza Lead (Usado pelo Dashboard E pelo n8n)
export async function POST(request: Request) {
  // Tenta autenticar via Sessão (Dashboard) ou via API Key (n8n)
  const session = await auth();
  const apiKey = request.headers.get('x-api-key');
  
  let userId = session?.user?.id;

  // Se não tem sessão, verifica API Key
  if (!userId) {
      if (apiKey !== N8N_INTERNAL_API_KEY || !N8N_INTERNAL_API_KEY) {
        return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
      }
      // Se veio do n8n, o userId deve vir no corpo da requisição
  }

  try {
    const body = await request.json();
    
    // Se veio do n8n, usa o userId do body. Se veio do dashboard, usa da sessão.
    const finalUserId = userId || body.userId;

    const { 
        nome, 
        contato, 
        segmentacao, 
        faturamentoEstimado, 
        dynamicData, 
        historicoCompleto, 
        status 
    } = body;

    if (!finalUserId || !contato) {
        return NextResponse.json({ error: 'UserId e Contato são obrigatórios' }, { status: 400 });
    }

    const cleanPhone = contato.replace(/\D/g, '');

    const lead = await prisma.lead.upsert({
        where: {
            contato: cleanPhone
        },
        update: {
            name: nome || undefined,
            segmentacao: segmentacao || undefined,
            faturamentoEstimado: faturamentoEstimado || undefined,
            dynamicData: dynamicData || undefined,
            historicoCompleto: historicoCompleto || undefined,
            status: status || undefined,
            updatedAt: new Date()
        },
        create: {
            userId: finalUserId,
            name: nome || 'Lead Novo',
            contato: cleanPhone,
            segmentacao: segmentacao || 'ENTRANTE',
            faturamentoEstimado: faturamentoEstimado || '',
            dynamicData: dynamicData || {},
            historicoCompleto: historicoCompleto || [],
            status: status || 'ENTRANTE',
            firstContactSent: false // Se criado manualmente no dash, o Lucas ainda vai chamar
        }
    });

    return NextResponse.json({ success: true, leadId: lead.id }, { status: 200 });

  } catch (error) {
    console.error("Erro ao salvar lead:", error);
    return NextResponse.json({ error: 'Erro interno ao processar lead.' }, { status: 500 });
  }
}