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
  // 1. Validação de Segurança (Chave n8n)
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

    // 2. Busca o usuário com todas as configurações
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        qualificationConfig: true,
        classificationConfig: true, // Campo novo
        ragKnowledgeBaseCondensed: true 
      }
    });

    const specialist = users.find(u => normalizePhoneNumber(u.phone) === incomingNormalized);

    if (specialist) {
      // Tenta pegar o valor do campo condensado
      const condensedRAG = (specialist.ragKnowledgeBaseCondensed as any)?.condensed_knowledge || '';

      // Tenta pegar as regras de classificação (com fallback seguro)
      const classificationRules = (specialist.classificationConfig as any) || {
          // REGRAS ADAPTADAS PARA SEGURO RESIDENCIAL
          tier1: "Cliente sem histórico, curioso, ou perfil que não se encaixa em Residencial (ex: PJ, Comercial).",
          tier2: "Cliente com interesse ativo em Residencial, já possui seguro (ideal para portabilidade/upgrade).",
          tier3: "Cliente com casa de alto valor (mais de 1 milhão), ou com necessidades especiais (coleções, joias, etc.).",
          tier4: "Lead de altíssima prioridade (ex: indicação direta, alto patrimônio, risco urgente)."
      };

      return NextResponse.json({
        isSpecialist: true,
        specialist: {
          id: specialist.id,
          name: specialist.name,
          // Retorna as perguntas configuradas (fallback se vazio)
          questions: (specialist.qualificationConfig as any)?.questions || [
            // PERGUNTAS ADAPTADAS PARA SEGURO RESIDENCIAL
            "Qual o seu nome completo?",
            "Qual o seu CEP residencial (para verificar a área de risco)?",
            "Você já tem um seguro residencial? Se sim, qual seguradora?"
          ],
          ragKnowledge: condensedRAG,
          classificationRules: classificationRules // <--- ENVIADO PARA O N8N
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