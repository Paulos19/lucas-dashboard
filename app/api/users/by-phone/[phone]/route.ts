// app/api/users/by-phone/[phone]/route.ts
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { normalizePhoneNumber } from '@/lib/phoneUtils';

const prisma = new PrismaClient();
const N8N_API_KEY = process.env.N8N_INTERNAL_API_KEY; 

type Context = {
  params: {
    phone: string;
  };
};

export async function GET(request: Request, context: Context) {
  // 1. Validação de Segurança
  const apiKey = request.headers.get('x-api-key');
  if (apiKey !== N8N_API_KEY) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const { phone } = context.params;

  if (!phone) {
    return NextResponse.json({ error: 'Telefone obrigatório' }, { status: 400 });
  }

  try {
    const incomingNormalized = normalizePhoneNumber(phone);

    // 2. Busca todos os usuários para encontrar o especialista correto
    // Otimização: Em produção, idealmente normalizaríamos o telefone no banco para buscar direto
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        qualificationConfig: true,
        classificationConfig: true,
        ragKnowledgeBaseCondensed: true,
        // --- NOVO: Incluir produtos ativos no retorno ---
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
        // ------------------------------------------------
      }
    });

    const specialist = users.find(u => normalizePhoneNumber(u.phone) === incomingNormalized);

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
          phone: specialist.phone, // Importante para o fallback de contato
          questions: (specialist.qualificationConfig as any)?.questions || [
            "Qual o seu nome completo?",
            "Qual o seu CEP residencial?",
            "Já possui seguro atualmente?"
          ],
          ragKnowledge: condensedRAG,
          classificationRules: classificationRules,
          products: specialist.products // <--- N8N recebe isso agora
        }
      });
    } else {
      return NextResponse.json({ isSpecialist: false });
    }

  } catch (error) {
    console.error("Erro ao buscar especialista:", error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}