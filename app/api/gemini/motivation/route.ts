import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';

const FALLBACK_QUOTES = [
  "Cada cliente atendido com atenção e cuidado genuíno hoje é a tranquilidade de uma família e o alicerce do seu sucesso amanhã. Mantenha o foco!",
  "Na corretagem, a confiança é construída nos detalhes. Hoje é um novo capítulo para transformar conexões em conquistas sólidas.",
  "Grandes negociações exigem paciência, presença e clareza. Respire fundo, confie na sua jornada e lidere o dia com propósito.",
  "Mais do que apólices ou contratos, você entrega segurança e realizações para quem confia no seu trabalho. Tenha um dia extraordinário!",
  "A persistência com elegância é a maior aliada de quem busca o topo. Foque no que está sob o seu controle e avance com confiança.",
];

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const userName = session?.user?.name?.split(' ')[0] || 'Corretor';
    
    // Obter hora atual de Brasília (-3)
    const hour = new Date().getHours();
    let timeOfDay = 'dia';
    let saudacao = 'Bom dia';
    if (hour >= 12 && hour < 18) {
      timeOfDay = 'tarde';
      saudacao = 'Boa tarde';
    } else if (hour >= 18 || hour < 5) {
      timeOfDay = 'noite';
      saudacao = 'Boa noite';
    }

    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      const fallback = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
      return NextResponse.json({
        quote: fallback,
        saudacao,
        source: 'fallback',
        timestamp: new Date().toISOString(),
      });
    }

    const prompt = `Você é o assistente executivo Lucas.ai, parceiro inteligente de corretores de seguros e imóveis no Brasil.
O nome do corretor é ${userName}. É período da ${timeOfDay}.
Escreva uma mensagem curta, sofisticada, motivadora e acolhedora (máximo 2 a 3 frases) para inspirar o corretor a ter um dia de alta performance, empatia com seus clientes e resiliência.
Não use cumprimentos genéricos longos, foque direto na mensagem inspiradora com tom confiante e humano.
Retorne apenas o texto da mensagem, sem aspas e sem explicações.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.85,
            maxOutputTokens: 300,
            thinkingConfig: {
              thinkingBudget: 0,
            },
          },
        }),
      }
    );

    if (!response.ok) {
      console.warn('Gemini API returned status:', response.status);
      const fallback = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
      return NextResponse.json({
        quote: fallback,
        saudacao,
        source: 'fallback',
        timestamp: new Date().toISOString(),
      });
    }

    const data = await response.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const textPart = parts.find((p: any) => !p.thought && p.text)?.text || parts[0]?.text;
    const cleanQuote = textPart ? textPart.trim().replace(/^["']|["']$/g, '') : null;

    const quote = cleanQuote || FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];

    return NextResponse.json({
      quote,
      saudacao,
      source: 'gemini',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error generating motivational quote:', error);
    const fallback = FALLBACK_QUOTES[Math.floor(Math.random() * FALLBACK_QUOTES.length)];
    return NextResponse.json({
      quote: fallback,
      saudacao: 'Olá',
      source: 'fallback',
      timestamp: new Date().toISOString(),
    });
  }
}
