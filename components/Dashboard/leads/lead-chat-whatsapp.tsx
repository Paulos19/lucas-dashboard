'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Send, Bot, User, Check, CheckCheck, Clock, RefreshCw, 
  Phone, Sparkles, AlertCircle, MessageSquare, ExternalLink,
  Shield, Calendar, Flame, AlertTriangle, CheckCircle2, Zap,
  Paperclip, Info, ChevronDown, ChevronUp, Copy
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { getRenewalUrgency } from './leads-table';
import { cn } from '@/lib/utils';

export interface ChatMessage {
  id: string;
  role: 'assistant' | 'user' | 'system' | 'agent' | 'lead';
  content: string;
  timestamp: string;
  senderName?: string;
  status?: 'sent' | 'delivered' | 'read';
  mediaUrl?: string | null;
  messageType?: 'text' | 'image' | 'audio' | 'document';
}

interface LeadChatWhatsAppProps {
  lead: {
    id: string;
    name: string;
    contato: string;
    status: string;
    resumoDaConversa?: string | null;
    historicoCompleto?: any;
    dataRenovacao?: string | Date | null;
    ramo?: string | null;
    campanha?: string | null;
    prioridade?: string | null;
    agencia?: string | null;
    corretorNome?: string | null;
    firstContactSent?: boolean;
    agendamento?: any;
  };
  onRefreshLead?: () => void;
  className?: string;
}

export function LeadChatWhatsApp({ lead, onRefreshLead, className }: LeadChatWhatsAppProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [resumo, setResumo] = useState<string>(lead.resumoDaConversa || '');
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [showContextBanner, setShowContextBanner] = useState(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Parse inicial do histórico do lead
  useEffect(() => {
    let parsed: ChatMessage[] = [];
    if (Array.isArray(lead.historicoCompleto)) {
      parsed = lead.historicoCompleto;
    } else if (typeof lead.historicoCompleto === 'string') {
      try {
        parsed = JSON.parse(lead.historicoCompleto);
      } catch {
        parsed = [];
      }
    }
    setMessages(parsed);
    setResumo(lead.resumoDaConversa || '');
  }, [lead.historicoCompleto, lead.resumoDaConversa]);

  // Função para buscar mensagens atualizadas da API
  const fetchMessages = async (silent = false) => {
    if (!silent) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/leads/${lead.id}/messages`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages) {
          setMessages(data.messages);
        }
        if (data.lead?.resumoDaConversa !== undefined) {
          setResumo(data.lead.resumoDaConversa || '');
        }
      }
    } catch (error) {
      if (!silent) toast.error('Erro ao atualizar mensagens.');
    } finally {
      if (!silent) setIsRefreshing(false);
    }
  };

  // Auto-polling a cada 5 segundos se autoRefresh estiver ativo
  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchMessages(true);
    }, 5000);
    return () => clearInterval(interval);
  }, [autoRefresh, lead.id]);

  // Scroll automático para o final da conversa quando chegam novas mensagens
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Envio manual de mensagem / nota pelo corretor
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputMessage.trim()) return;

    const contentToSend = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    // Adição otimista no estado
    const tempMsg: ChatMessage = {
      id: `temp_${Date.now()}`,
      role: 'assistant',
      content: contentToSend,
      timestamp: new Date().toISOString(),
      senderName: 'Você (Corretor)',
      status: 'read'
    };
    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await fetch(`/api/leads/${lead.id}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'assistant',
          content: contentToSend,
          senderName: 'Corretor'
        })
      });

      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
      toast.success('Mensagem registrada no histórico.');
      if (onRefreshLead) onRefreshLead();
    } catch (error) {
      toast.error('Erro ao enviar mensagem.');
    } finally {
      setIsLoading(false);
    }
  };

  const cleanPhone = lead.contato ? lead.contato.replace(/\D/g, '') : '';
  const waLink = `https://wa.me/${cleanPhone}`;
  const renewalUrgency = getRenewalUrgency(lead.dataRenovacao);

  // Formatar data do separador
  const formatSeparatorDate = (dateStr: string) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Conversa Recente';
    if (isToday(d)) return 'Hoje';
    if (isYesterday(d)) return 'Ontem';
    return format(d, "d 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  // Agrupar mensagens por dia para criar separadores estilo WhatsApp
  const groupedMessages: { dateLabel: string; items: ChatMessage[] }[] = [];
  messages.forEach(msg => {
    const label = formatSeparatorDate(msg.timestamp || new Date().toISOString());
    const lastGroup = groupedMessages[groupedMessages.length - 1];
    if (lastGroup && lastGroup.dateLabel === label) {
      lastGroup.items.push(msg);
    } else {
      groupedMessages.push({ dateLabel: label, items: [msg] });
    }
  });

  return (
    <Card className={cn("overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md flex flex-col h-[760px] bg-slate-900", className)}>
      
      {/* ─── HEADER ESTILO WHATSAPP ─── */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-3 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10 border border-slate-700">
              <AvatarFallback className="bg-emerald-600 text-white font-bold text-sm">
                {lead.name.substring(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-slate-900" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white line-clamp-1">{lead.name}</h3>
              {lead.prioridade && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 border-slate-700 text-slate-300">
                  Prio {lead.prioridade}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span className="font-mono">{lead.contato}</span>
              <span>•</span>
              <span className="text-emerald-400 flex items-center gap-1">
                <Bot className="h-3 w-3" /> Lucas Copilot Ativo
              </span>
            </div>
          </div>
        </div>

        {/* Ações do Header */}
        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowContextBanner(!showContextBanner)}
            className="h-8 px-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800"
            title="Alternar Resumo de Inteligência"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1 text-amber-400" />
            <span className="hidden sm:inline">Contexto</span>
            {showContextBanner ? <ChevronUp className="h-3 w-3 ml-1" /> : <ChevronDown className="h-3 w-3 ml-1" />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => fetchMessages(false)}
            disabled={isRefreshing}
            className="h-8 w-8 text-slate-300 hover:text-white hover:bg-slate-800"
            title="Atualizar mensagens"
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin text-blue-400")} />
          </Button>

          <Button
            variant="secondary"
            size="sm"
            asChild
            className="h-8 px-2.5 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-semibold gap-1.5"
          >
            <a href={waLink} target="_blank" rel="noopener noreferrer">
              <Phone className="h-3.5 w-3.5" />
              <span className="hidden md:inline">Abrir no WhatsApp</span>
              <ExternalLink className="h-3 w-3 opacity-70" />
            </a>
          </Button>
        </div>
      </div>

      {/* ─── BANNER DE CONTEXTO & RESUMO DA IA (RECOLHÍVEL) ─── */}
      {showContextBanner && (
        <div className="bg-slate-950/90 border-b border-slate-800 p-3 text-xs text-slate-300 space-y-2 animate-in slide-in-from-top duration-300">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className={cn("text-[11px] font-semibold border", renewalUrgency.badgeClass)}>
                <Calendar className="mr-1 h-3 w-3" />
                {renewalUrgency.label}
              </Badge>

              {lead.ramo && (
                <Badge variant="secondary" className="text-[11px] bg-slate-800 text-slate-200">
                  Ramo: {lead.ramo}
                </Badge>
              )}

              {lead.agencia && (
                <span className="text-[11px] text-slate-400 hidden lg:inline">
                  Agência: {lead.agencia}
                </span>
              )}
            </div>

            {lead.agendamento && (
              <Badge className="bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[11px]">
                <Calendar className="h-3 w-3 mr-1" />
                Reunião: {new Date(lead.agendamento.dataHora).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
              </Badge>
            )}
          </div>

          {/* Resumo da IA */}
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 flex items-start gap-2">
            <Sparkles className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold text-slate-100 text-[11px] uppercase tracking-wider block mb-0.5">
                Resumo Analítico da Conversa (IA Lucas):
              </span>
              <p className="text-xs leading-relaxed text-slate-300 whitespace-pre-wrap">
                {resumo || "Aguardando primeiras interações para gerar o resumo cognitivo da negociação."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── CORPO DO CHAT (CANVAS ESTILO WHATSAPP) ─── */}
      <div 
        ref={scrollContainerRef}
        className="flex-1 p-4 overflow-y-auto space-y-4 bg-[#0b141a] bg-[radial-gradient(#1f2c34_1px,transparent_1px)] [background-size:16px_16px]"
      >
        {/* Aviso de Início de Conversa Seguro */}
        <div className="flex justify-center my-2">
          <div className="bg-[#182229] border border-[#222e35] text-[#8696a0] text-[11px] px-3.5 py-1.5 rounded-lg max-w-md text-center shadow-xs flex items-center gap-1.5">
            <Shield className="h-3 w-3 text-emerald-500 shrink-0" />
            <span>As mensagens são sincronizadas em tempo real via Lucas Copilot & WhatsApp.</span>
          </div>
        </div>

        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center space-y-3">
            <div className="p-4 rounded-full bg-[#182229] border border-[#222e35] text-[#8696a0]">
              <MessageSquare className="h-8 w-8 text-emerald-500" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#e9edef]">Nenhuma mensagem registrada ainda</p>
              <p className="text-xs text-[#8696a0] max-w-xs mt-1">
                Assim que o Lucas ou o cliente enviarem uma mensagem pelo WhatsApp, a conversa aparecerá aqui em tempo real.
              </p>
            </div>
          </div>
        ) : (
          groupedMessages.map((group, gIdx) => (
            <div key={`group_${gIdx}`} className="space-y-2">
              
              {/* Separador de Data */}
              <div className="flex justify-center my-3">
                <span className="bg-[#182229] text-[#8696a0] text-[11px] font-medium px-3 py-1 rounded-md shadow-xs border border-[#222e35]">
                  {group.dateLabel}
                </span>
              </div>

              {/* Mensagens do Dia */}
              {group.items.map((msg, mIdx) => {
                const isAssistant = msg.role === 'assistant' || msg.role === 'agent' || msg.role === 'system';
                const msgDate = msg.timestamp ? new Date(msg.timestamp) : new Date();
                const timeLabel = isNaN(msgDate.getTime()) ? '' : format(msgDate, 'HH:mm');

                return (
                  <div 
                    key={msg.id || `msg_${mIdx}`} 
                    className={cn("flex w-full", isAssistant ? "justify-end" : "justify-start")}
                  >
                    <div 
                      className={cn(
                        "relative max-w-[85%] sm:max-w-[75%] px-3.5 py-2 rounded-2xl shadow-md text-sm leading-relaxed",
                        isAssistant
                          ? "bg-[#005c4b] text-[#e9edef] rounded-tr-xs border border-[#004f40]" 
                          : "bg-[#202c33] text-[#e9edef] rounded-tl-xs border border-[#2a3942]"
                      )}
                    >
                      {/* Nome do Remetente */}
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <span className={cn(
                          "text-[11px] font-bold tracking-wide",
                          isAssistant ? "text-[#53bdeb]" : "text-[#25d366]"
                        )}>
                          {isAssistant ? (
                            <span className="flex items-center gap-1">
                              <Bot className="h-3 w-3" /> {msg.senderName || 'Lucas (IA)'}
                            </span>
                          ) : (
                            <span className="flex items-center gap-1">
                              <User className="h-3 w-3" /> {msg.senderName || lead.name}
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Texto da Mensagem */}
                      <div className="whitespace-pre-wrap break-words text-[13px] text-[#e9edef] pr-8">
                        {msg.content}
                      </div>

                      {/* Hora e Duplo Checkmark */}
                      <div className="flex items-center justify-end gap-1 text-[10px] text-[#8696a0] mt-1 select-none">
                        <span>{timeLabel}</span>
                        {isAssistant && (
                          <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ))
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* ─── FOOTER COM CAMPO DE ENVIO / NOTAS ─── */}
      <form onSubmit={handleSendMessage} className="bg-slate-900 border-t border-slate-800 p-3 flex items-center gap-2 z-10">
        <Input
          placeholder="Digite uma mensagem ou resposta para o cliente..."
          value={inputMessage}
          onChange={e => setInputMessage(e.target.value)}
          disabled={isLoading}
          className="flex-1 bg-slate-950 border-slate-700 text-white placeholder:text-slate-500 focus-visible:ring-emerald-500 text-sm h-10"
        />

        <Button
          type="submit"
          disabled={isLoading || !inputMessage.trim()}
          className="bg-emerald-600 hover:bg-emerald-500 text-white h-10 px-4 font-semibold gap-1.5 shadow-sm"
        >
          <Send className="h-4 w-4" />
          <span className="hidden sm:inline">Enviar</span>
        </Button>
      </form>

    </Card>
  );
}
