import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { normalizePhoneNumber } from '@/lib/phoneUtils';

const N8N_API_KEY = process.env.N8N_INTERNAL_API_KEY; 

type Context = {
  params: Promise<{
    phone: string;
  }>;
};

async function handleRequest(request: Request, context: Context) {
  // 1. Validação de Segurança
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== N8N_API_KEY) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { phone } = await context.params;

  if (!phone) {
    return NextResponse.json({ error: 'Telefone obrigatório' }, { status: 400 });
  }

  try {
    const incomingNormalized = normalizePhoneNumber(phone);

    // 2. Busca os usuários para encontrar o especialista correto
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        qualificationConfig: true,
        classificationConfig: true,
        ragKnowledgeBaseCondensed: true,
        products: {
          where: { status: 'ACTIVE' },
          select: {
            id: true,
            name: true,
            description: true,
            monthlyPremium: true,
            coverages: true,
            assistances: true
          }
        }
      }
    });

    // 2.1 Tenta achar o especialista direto pelo telefone do corretor
    let specialist = users.find(u => normalizePhoneNumber(u.phone) === incomingNormalized);

    // 2.2 Se o telefone enviado for o do CLIENTE (lead), localiza o lead e seu respectivo corretor
    let lead = null;
    lead = await prisma.lead.findFirst({
      where: {
        OR: [
          { contato: incomingNormalized },
          { contato: phone },
          { contato: { contains: phone.slice(-8) } }
        ]
      },
      include: {
        user: {
          include: {
            products: { where: { status: 'ACTIVE' } }
          }
        },
        interestedInProduct: true
      }
    });

    if (!specialist && lead?.user) {
      specialist = lead.user as any;
    }

    // 2.3 Fallback: Se não encontrou especialista específico, usa o primeiro usuário cadastrado
    if (!specialist && users.length > 0) {
      specialist = users[0];
    }

    if (specialist) {
      const condensedRAG = (specialist.ragKnowledgeBaseCondensed as any)?.condensed_knowledge || '';
      const classificationRules = (specialist.classificationConfig as any) || {
        tier1: "Cliente fora do perfil.",
        tier2: "Cliente com potencial baixo ou produto de entrada.",
        tier3: "Cliente ideal para cotação padrão.",
        tier4: "Cliente VIP / Alto valor."
      };

      return NextResponse.json({
        isSpecialist: true,
        specialist: {
          id: specialist.id,
          name: specialist.name,
          phone: specialist.phone,
          questions: (specialist.qualificationConfig as any)?.questions || [
            "Qual o seu nome completo?",
            "Qual o seu CEP residencial?",
            "Já possui seguro atualmente?"
          ],
          ragKnowledge: condensedRAG,
          classificationRules: classificationRules,
          products: specialist.products || []
        },
        lead: lead ? {
          id: lead.id,
          name: lead.name,
          contato: lead.contato,
          status: lead.status,
          ramo: lead.ramo,
          campanha: lead.campanha,
          prioridade: lead.prioridade,
          agencia: lead.agencia,
          dataRenovacao: lead.dataRenovacao,
          corretorNome: lead.corretorNome,
          dynamicData: lead.dynamicData,
          resumoDaConversa: lead.resumoDaConversa,
          firstContactSent: lead.firstContactSent
        } : null
      });
    }

    return NextResponse.json({ isSpecialist: false, lead: null });

  } catch (error) {
    console.error("Erro ao buscar especialista:", error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

export async function GET(request: Request, context: Context) {
  return handleRequest(request, context);
}

export async function POST(request: Request, context: Context) {
  return handleRequest(request, context);
}