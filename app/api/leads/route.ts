// app/api/leads/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { auth } from '@/lib/auth';

const prisma = new PrismaClient();
const N8N_INTERNAL_API_KEY = process.env.N8N_INTERNAL_API_KEY;

// Função auxiliar para padronizar telefones BR
function standardizePhone(phone: string): string {
  // 1. Remove tudo que não é número
  let clean = phone.replace(/\D/g, '');

  // 2. Lógica para Brasil (DDI 55)
  // Se tem 10 ou 11 dígitos (ex: 11999998888 ou 1133334444), assume que é BR e adiciona 55
  if (clean.length >= 10 && clean.length <= 11) {
    clean = '55' + clean;
  }
  
  // (Opcional) Poderíamos tratar o 9º dígito aqui, mas o DDI é o principal causador de duplicidade.
  
  return clean;
}

// GET: Lista leads do corretor logado
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

// POST: Cria ou Atualiza Lead (Dashboard + n8n)
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
    const finalUserId = userId || body.userId; // Prioriza sessão, fallback para body (n8n)

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

    // --- CORREÇÃO DE DUPLICIDADE ---
    // Padroniza o telefone (Ex: transforma 11999998888 em 5511999998888)
    const cleanPhone = standardizePhone(contato);
    // -------------------------------

    const lead = await prisma.lead.upsert({
        where: {
            contato: cleanPhone // Busca pela chave padronizada
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
            contato: cleanPhone, // Salva padronizado
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