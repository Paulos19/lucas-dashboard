// lib/chatParser.ts

export interface StandardChatMessage {
  id: string;
  role: 'assistant' | 'user' | 'system';
  content: string;
  timestamp: string; // ISO string
  senderName: string;
  status: 'sent' | 'delivered' | 'read';
  mediaUrl?: string | null;
  messageType?: 'text' | 'image' | 'audio' | 'document';
}

/**
 * Converte qualquer formato de histórico (LangChain Core, Redis Chat Memory, ChatML ou array simples)
 * para o formato padrão do Visualizador de Chat WhatsApp da Lucas.ai
 */
export function parseAndFormatChatHistory(
  rawInput: any,
  defaultLeadName: string = 'Cliente'
): StandardChatMessage[] {
  if (!rawInput) return [];

  let items: any[] = [];

  // Se vier como string JSON (ex: do Redis ou banco), faz o parse
  if (typeof rawInput === 'string') {
    try {
      const parsed = JSON.parse(rawInput);
      items = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // Se for apenas uma string de texto simples
      if (rawInput.trim()) {
        items = [{ role: 'assistant', content: rawInput }];
      } else {
        return [];
      }
    }
  } else if (Array.isArray(rawInput)) {
    items = rawInput;
  } else if (typeof rawInput === 'object') {
    items = [rawInput];
  }

  const result: StandardChatMessage[] = [];
  let baseTimestamp = Date.now() - items.length * 15000; // Gera timestamps sequenciais caso não existam

  items.forEach((item, itemIdx) => {
    if (!item) return;

    // 1. Extração do Tipo / Role
    let role: 'assistant' | 'user' | 'system' = 'user';
    let senderName = defaultLeadName;

    // Identificação de formato LangChain Core: { id: ["langchain_core", "messages", "AIMessage" | "HumanMessage"], kwargs: { content } }
    if (item.id && Array.isArray(item.id)) {
      const typeStr = item.id[item.id.length - 1];
      if (typeStr === 'AIMessage' || typeStr === 'ai') {
        role = 'assistant';
        senderName = 'Lucas (IA)';
      } else if (typeStr === 'HumanMessage' || typeStr === 'human') {
        role = 'user';
        senderName = defaultLeadName;
      } else if (typeStr === 'SystemMessage' || typeStr === 'system') {
        role = 'system';
        senderName = 'Sistema';
      } else if (typeStr === 'ToolMessage' || typeStr === 'tool') {
        // Pula ou marca como sistema
        role = 'system';
        senderName = item.kwargs?.name || 'Ferramenta';
      }
    } 
    // Identificação por campo 'type' (LangChain simplificado)
    else if (item.type) {
      if (item.type === 'ai' || item.type === 'assistant' || item.type === 'AIMessage') {
        role = 'assistant';
        senderName = 'Lucas (IA)';
      } else if (item.type === 'human' || item.type === 'user' || item.type === 'HumanMessage') {
        role = 'user';
        senderName = defaultLeadName;
      } else if (item.type === 'system') {
        role = 'system';
        senderName = 'Sistema';
      }
    }
    // Identificação padrão ChatML: { role: 'user' | 'assistant' }
    else if (item.role) {
      if (item.role === 'assistant' || item.role === 'agent' || item.role === 'lucas') {
        role = 'assistant';
        senderName = item.senderName || 'Lucas (IA)';
      } else if (item.role === 'user' || item.role === 'lead' || item.role === 'client') {
        role = 'user';
        senderName = item.senderName || defaultLeadName;
      } else {
        role = 'system';
        senderName = item.senderName || 'Sistema';
      }
    }

    // 2. Extração do Conteúdo
    let rawContent: any = '';
    if (item.kwargs && item.kwargs.content !== undefined) {
      rawContent = item.kwargs.content;
    } else if (item.data && item.data.content !== undefined) {
      rawContent = item.data.content;
    } else if (item.content !== undefined) {
      rawContent = item.content;
    } else if (item.text !== undefined) {
      rawContent = item.text;
    }

    // Se o conteúdo for array de blocos de texto (ex: GPT-4o multimodal)
    if (Array.isArray(rawContent)) {
      rawContent = rawContent
        .map(c => (typeof c === 'string' ? c : c.text || c.content || ''))
        .join('\n');
    } else if (typeof rawContent !== 'string') {
      rawContent = String(rawContent || '');
    }

    if (!rawContent.trim()) return;

    // 3. Extração / Cálculo de Timestamp
    let msgTime = item.kwargs?.timestamp || item.timestamp || item.createdAt;
    let timeEpoch = msgTime ? new Date(msgTime).getTime() : NaN;
    if (isNaN(timeEpoch)) {
      timeEpoch = baseTimestamp + itemIdx * 10000;
    }

    // 4. Quebra de Micro-mensagens por "|||" (padrão humanizado do Lucas)
    if (rawContent.includes('|||')) {
      const parts = rawContent
        .split('|||')
        .map((p: string) => p.trim())
        .filter((p: string) => p.length > 0);

      parts.forEach((part: string, pIdx: number) => {
        result.push({
          id: `msg_${timeEpoch}_${itemIdx}_${pIdx}_${Math.random().toString(36).substr(2, 5)}`,
          role,
          content: part,
          timestamp: new Date(timeEpoch + pIdx * 1500).toISOString(),
          senderName: item.senderName || senderName,
          status: 'read'
        });
      });
    } else {
      result.push({
        id: item.id && typeof item.id === 'string' ? item.id : `msg_${timeEpoch}_${itemIdx}_${Math.random().toString(36).substr(2, 5)}`,
        role,
        content: rawContent.trim(),
        timestamp: new Date(timeEpoch).toISOString(),
        senderName: item.senderName || senderName,
        status: 'read'
      });
    }
  });

  // 5. Deduplicação inteligente
  const deduplicated: StandardChatMessage[] = [];
  result.forEach(msg => {
    const isDup = deduplicated.some(
      d => d.id === msg.id || 
      (d.role === msg.role && d.content === msg.content && Math.abs(new Date(d.timestamp).getTime() - new Date(msg.timestamp).getTime()) < 3000)
    );
    if (!isDup) {
      deduplicated.push(msg);
    }
  });

  // 6. Ordenação Cronológica
  deduplicated.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  return deduplicated;
}
