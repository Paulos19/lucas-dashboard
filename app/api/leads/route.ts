// app/api/leads/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth';

const prisma = new PrismaClient();
const N8N_INTERNAL_API_KEY = process.env.N8N_INTERNAL_API_KEY;

// Função auxiliar para padronizar telefones BR
function standardizePhone(phone: string): string {
  let clean = phone.replace(/\D/g, '');
  if (clean.length >= 10 && clean.length <= 11) {
    clean = '55' + clean;
  }
  return clean;
}

// GET: Lista leads com Paginação e Filtros
export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status'); // Filtro de coluna
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '20');
  const skip = (page - 1) * limit;

  try {
    const whereClause: any = {
        userId: session.user.id
    };

    if (status) {
        whereClause.status = status;
    }

    const leads = await prisma.lead.findMany({
      where: whereClause,
      orderBy: { updatedAt: 'desc' }, // Ordem cronológica
      take: limit,
      skip: skip,
      include: {
        interestedInProduct: {
            select: { name: true }
        }
      }
    });
    
    return NextResponse.json(leads);
  } catch (error) {
    console.error("Erro ao buscar leads:", error);
    return NextResponse.json({ error: 'Erro ao buscar leads' }, { status: 500 });
  }
}

// POST: Mantido (Criação/Update)
export async function POST(request: Request) {
  const session = await auth();
  const apiKey = request.headers.get('x-api-key');
  
  let userId = session?.user?.id;

  // Validação de Segurança (API Key ou Sessão)
  if (!userId) {
      if (apiKey !== N8N_INTERNAL_API_KEY || !N8N_INTERNAL_API_KEY) {
        return NextResponse.json({ error: 'Acesso não autorizado.' }, { status: 401 });
      }
  }

  try {
    const body = await request.json();
    const finalUserId = userId || body.userId; 

    const { 
        nome, contato, segmentacao, faturamentoEstimado, 
        dynamicData, historicoCompleto, status 
    } = body;

    if (!finalUserId || !contato) {
        return NextResponse.json({ error: 'UserId e Contato são obrigatórios' }, { status: 400 });
    }

    const cleanPhone = standardizePhone(contato);

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
            firstContactSent: false
        }
    });

    return NextResponse.json({ success: true, leadId: lead.id }, { status: 200 });

  } catch (error) {
    console.error("Erro ao salvar lead:", error);
    return NextResponse.json({ error: 'Erro interno ao processar lead.' }, { status: 500 });
  }
}