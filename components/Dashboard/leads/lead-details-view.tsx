'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Phone, Calendar, ArrowLeft, MessageSquare, 
  FileText, Activity, Trash2, Edit, ShieldCheck, 
  Building2, UserCheck, Clock, Flame, 
  FileSpreadsheet, Hash, DollarSign, CheckCircle2,
  AlertTriangle, PhoneCall, ExternalLink, Bot, Send,
  Loader2, Sparkles
} from 'lucide-react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { LeadFormDialog } from './lead-form-dialog';
import { LeadAttachments } from './lead-attachments';
import { LeadChatWhatsApp } from './lead-chat-whatsapp';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface LeadDetailsViewProps {
  lead: any;
}

export function LeadDetailsView({ lead }: LeadDetailsViewProps) {
  const router = useRouter();
  const [isDispatching, setIsDispatching] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este lead? Essa ação não pode ser desfeita.')) return;

    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Lead excluído com sucesso.');
        router.push('/dashboard/leads');
        router.refresh();
      } else {
        throw new Error();
      }
    } catch (e) {
      toast.error('Erro ao excluir lead.');
    }
  };

  // Disparo individual com o Lucas via n8n
  const handleDispatchLucas = async () => {
    setIsDispatching(true);
    const toastId = toast.loading('Enviando lead para a automação do Lucas...');

    try {
      const res = await fetch('/api/automations/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Erro ao processar disparo.');
      }

      toast.dismiss(toastId);
      toast.success(`Sucesso! O Lucas iniciou a abordagem com ${lead.name} no WhatsApp.`);
      setConfirmDialogOpen(false);
      router.refresh();

    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error(error.message || 'Erro durante o disparo.');
    } finally {
      setIsDispatching(false);
    }
  };

  const getStatusColor = (status: string) => {
    const map: Record<string, string> = {
      'ENTRANTE': 'bg-blue-600 text-white',
      'QUALIFICADO': 'bg-purple-600 text-white',
      'AGENDADO_COTACAO': 'bg-amber-600 text-white',
      'PROPOSTA_ENVIADA': 'bg-orange-600 text-white',
      'VENDA_REALIZADA': 'bg-green-600 text-white',
      'PERDIDO': 'bg-red-600 text-white',
      'ARQUIVADO': 'bg-slate-600 text-white'
    };
    return map[status] || 'bg-slate-500 text-white';
  };

  const getPriorityBadge = (prio: string | null | undefined) => {
    if (!prio) return null;
    const str = String(prio).trim();
    if (str === '1') {
      return (
        <Badge className="bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800 gap-1 font-bold">
          <Flame className="h-3 w-3 fill-current" /> Prioridade 1 (Crítica)
        </Badge>
      );
    }
    if (str === '6') {
      return (
        <Badge className="bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 gap-1 font-bold">
          <AlertTriangle className="h-3 w-3" /> Prioridade 6 (Alta)
        </Badge>
      );
    }
    if (str === '20') {
      return (
        <Badge className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-800 font-semibold">
          Prioridade 20 (Média)
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
        Prioridade {str}
      </Badge>
    );
  };

  // Cálculo de dias para vencimento
  const renewalDate = lead.dataRenovacao ? new Date(lead.dataRenovacao) : null;
  const daysToRenewal = renewalDate ? differenceInDays(renewalDate, new Date()) : null;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Navegação e Ações de Topo */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Button variant="ghost" className="pl-0 gap-2 hover:bg-transparent hover:text-blue-600" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" /> Voltar para lista
        </Button>
        <div className="flex gap-2">
          <Button variant="destructive" size="sm" className="gap-2" onClick={handleDelete}>
            <Trash2 className="h-4 w-4" /> Excluir
          </Button>
          <LeadFormDialog 
            lead={lead} 
            trigger={
              <Button variant="outline" size="sm" className="gap-2">
                <Edit className="h-4 w-4" /> Editar
              </Button>
            } 
          />
        </div>
      </div>

      {/* Cabeçalho Principal do Lead */}
      <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20 border-4 border-slate-100 dark:border-slate-800 shadow-xs shrink-0">
              <AvatarFallback className="text-2xl bg-linear-to-br from-blue-600 to-indigo-700 text-white font-bold">
                {lead.name ? lead.name.substring(0, 2).toUpperCase() : 'LE'}
              </AvatarFallback>
            </Avatar>
            
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-100">
                  {lead.name}
                </h1>
                <Badge className={`${getStatusColor(lead.status)} border-0 text-xs font-semibold px-2.5 py-0.5`}>
                  {lead.status.replace('_', ' ')}
                </Badge>
                {getPriorityBadge(lead.prioridade)}
                {lead.segmentacao && (
                  <Badge variant="outline" className="text-slate-600 dark:text-slate-300">
                    {lead.segmentacao}
                  </Badge>
                )}
              </div>
              
              <div className="flex flex-wrap items-center gap-4 text-xs sm:text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5 font-medium text-slate-700 dark:text-slate-300">
                  <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>{lead.contato}</span>
                </div>
                {lead.telefoneFixo && (
                  <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-400">
                    <PhoneCall className="h-4 w-4 text-slate-400" />
                    <span>Fixo: {lead.telefoneFixo}</span>
                  </div>
                )}
                <div className="flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-slate-400" />
                  <span>Atualizado {formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true, locale: ptBR })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Botões de Ação Direta */}
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            {/* Botão de Disparo do Lucas */}
            <Button
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs flex-1 lg:flex-initial font-semibold"
              disabled={isDispatching}
              onClick={() => setConfirmDialogOpen(true)}
            >
              {isDispatching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
              Disparar Lucas (IA)
            </Button>

            <Button 
              variant="outline"
              className="gap-2 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800 hover:bg-green-50 dark:hover:bg-green-950/50 flex-1 lg:flex-initial"
              onClick={() => window.open(`https://wa.me/${lead.contato.replace(/\D/g, '')}`, '_blank')}
            >
              <MessageSquare className="h-4 w-4" /> WhatsApp
            </Button>

            {lead.contato && (
              <Button 
                variant="outline"
                className="gap-2 flex-1 lg:flex-initial"
                asChild
              >
                <a href={`tel:${lead.contato.replace(/\D/g, '')}`}>
                  <PhoneCall className="h-4 w-4" /> Ligar
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Grid de 4 Cards de Métricas da Tabela */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Vencimento da Apólice */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Data de Vencimento
            </CardTitle>
            <Calendar className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {renewalDate ? renewalDate.toLocaleDateString('pt-BR') : 'Não informada'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {daysToRenewal !== null ? (
                daysToRenewal > 0 ? (
                  <span className="text-amber-600 dark:text-amber-400 font-medium">Vence em {daysToRenewal} dias</span>
                ) : daysToRenewal === 0 ? (
                  <span className="text-red-600 font-bold">Vence hoje!</span>
                ) : (
                  <span className="text-slate-500">Venceu há {Math.abs(daysToRenewal)} dias</span>
                )
              ) : 'Sem data definida'}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Ramo & Campanha */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Ramo do Seguro
            </CardTitle>
            <ShieldCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold text-slate-900 dark:text-slate-100 truncate">
              {lead.ramo || lead.interestedInProduct?.name || 'Geral'}
            </div>
            <p className="text-xs text-muted-foreground mt-1 truncate" title={lead.campanha || ''}>
              {lead.campanha || 'Campanha Padrão'}
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Agência Bancária */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Agência de Relacionamento
            </CardTitle>
            <Building2 className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1" title={lead.agencia || 'Não informada'}>
              {lead.agencia || 'Não informada'}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Fase: <span className="font-medium text-slate-700 dark:text-slate-300">{lead.fase || 'Nova'}</span>
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Corretor Responsável */}
        <Card className="border border-slate-200 dark:border-slate-800 shadow-xs bg-white dark:bg-slate-900">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Corretor
            </CardTitle>
            <UserCheck className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold text-slate-900 dark:text-slate-100 line-clamp-1" title={lead.corretorNome || lead.user?.name || 'Sem corretor'}>
              {lead.corretorNome || lead.user?.name || 'Sem corretor'}
            </div>
            <div className="mt-1 flex items-center gap-1.5">
              {lead.userId ? (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> Corretor Vinculado
                </span>
              ) : (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Em Standby
                </span>
              )}
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Conteúdo Principal em 2 Colunas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coluna Esquerda - Dossiê da Apólice e Contato */}
        <div className="space-y-6">
          <Card className="shadow-xs border border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <FileSpreadsheet className="h-4 w-4 text-blue-600" /> Detalhes da Tabela
              </CardTitle>
              <CardDescription>Informações extraídas da planilha de renovação.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              
              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wider">Nome do Segurado / Cliente</span>
                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{lead.name}</p>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground block text-xs uppercase tracking-wider">Celular</span>
                  <p className="font-mono text-xs font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{lead.contato}</p>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs uppercase tracking-wider">Tel. Fixo</span>
                  <p className="font-mono text-xs text-slate-700 dark:text-slate-300 mt-0.5">{lead.telefoneFixo || '-'}</p>
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-muted-foreground block text-xs uppercase tracking-wider">Prioridade</span>
                  <div className="mt-1">{getPriorityBadge(lead.prioridade) || '-'}</div>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs uppercase tracking-wider">Fase</span>
                  <p className="font-medium text-slate-900 dark:text-slate-100 mt-0.5">{lead.fase || 'Nova'}</p>
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wider">Ramo do Seguro</span>
                <p className="font-medium text-slate-900 dark:text-slate-100 mt-0.5">{lead.ramo || '-'}</p>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wider">Campanha</span>
                <p className="font-medium text-slate-900 dark:text-slate-100 mt-0.5 text-xs">{lead.campanha || lead.origemLead || '-'}</p>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wider">Agência Bancária</span>
                <p className="font-medium text-slate-900 dark:text-slate-100 mt-0.5 text-xs">{lead.agencia || '-'}</p>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              <div>
                <span className="text-muted-foreground block text-xs uppercase tracking-wider">Corretora Parceira</span>
                <p className="font-medium text-slate-900 dark:text-slate-100 mt-0.5 text-xs">{lead.corretorNome || '-'}</p>
              </div>

              {lead.numeroApolice && (
                <>
                  <div className="h-px bg-slate-100 dark:bg-slate-800" />
                  <div>
                    <span className="text-muted-foreground block text-xs uppercase tracking-wider">Número da Apólice</span>
                    <p className="font-mono text-slate-900 dark:text-slate-100 mt-0.5">{lead.numeroApolice}</p>
                  </div>
                </>
              )}

              {lead.faturamentoEstimado && (
                <>
                  <div className="h-px bg-slate-100 dark:bg-slate-800" />
                  <div>
                    <span className="text-muted-foreground block text-xs uppercase tracking-wider">Prêmio / Valor Estimado</span>
                    <p className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                      R$ {lead.faturamentoEstimado}
                    </p>
                  </div>
                </>
              )}

            </CardContent>
          </Card>
        </div>

        {/* Coluna Direita - Abas de Acompanhamento */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="conversaWhatsApp" className="w-full">
            <TabsList className="w-full justify-start bg-transparent border-b border-slate-200 dark:border-slate-800 rounded-none h-auto p-0 mb-6 gap-6 overflow-x-auto no-scrollbar">
              <TabsTrigger 
                value="conversaWhatsApp" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-emerald-500 data-[state=active]:text-emerald-500 dark:data-[state=active]:text-emerald-400 data-[state=active]:bg-transparent px-1 pb-3 text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 transition-colors flex items-center gap-1.5 font-semibold"
              >
                <MessageSquare className="h-4 w-4 text-emerald-500" />
                <span>Chat WhatsApp</span>
                {Array.isArray(lead.historicoCompleto) && lead.historicoCompleto.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-emerald-600 text-white">
                    {lead.historicoCompleto.length}
                  </span>
                )}
              </TabsTrigger>

              <TabsTrigger 
                value="visaoGeral" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent px-1 pb-3 text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                Visão Geral
              </TabsTrigger>
              
              <TabsTrigger 
                value="resumoIA" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent px-1 pb-3 text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                Resumo da IA
              </TabsTrigger>
              
              <TabsTrigger 
                value="arquivos" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent px-1 pb-3 text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                Arquivos & Propostas ({lead.attachments?.length || 0})
              </TabsTrigger>
              
              <TabsTrigger 
                value="dadosBrutos" 
                className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:text-blue-600 data-[state=active]:bg-transparent px-1 pb-3 text-muted-foreground hover:text-slate-900 dark:hover:text-slate-100 transition-colors"
              >
                Dados da Planilha
              </TabsTrigger>
            </TabsList>

            {/* ABA 0: Conversa WhatsApp */}
            <TabsContent value="conversaWhatsApp" className="mt-0 space-y-4">
              <LeadChatWhatsApp 
                lead={lead} 
                onRefreshLead={() => router.refresh()} 
              />
            </TabsContent>

            {/* ABA 1: Visão Geral */}
            <TabsContent value="visaoGeral" className="space-y-6 mt-0">
              
              {/* Card de Agendamento se existir */}
              {lead.agendamento ? (
                <Card className="border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20 shadow-xs">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-amber-800 dark:text-amber-300">
                      <Calendar className="h-4 w-4" /> Reunião / Agendamento Confirmado
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-amber-900 dark:text-amber-200">
                    <p className="font-semibold text-lg">
                      {new Date(lead.agendamento.dataHora).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Tipo: <span className="font-medium">{lead.agendamento.tipo}</span> • Status: <span className="font-medium">{lead.agendamento.status}</span>
                    </p>
                    {lead.agendamento.resumo && (
                      <p className="text-xs bg-white/70 dark:bg-slate-900/70 p-2.5 rounded-md border border-amber-200 dark:border-amber-900/50">
                        {lead.agendamento.resumo}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ) : null}

              {/* Status de Primeiro Contato com IA */}
              <Card className="shadow-xs border border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span className="flex items-center gap-2">
                      <Bot className="h-4 w-4 text-blue-600" /> Automação de Abordagem com Lucas (IA)
                    </span>
                    <Button
                      size="sm"
                      onClick={() => setConfirmDialogOpen(true)}
                      disabled={isDispatching}
                      className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold"
                    >
                      {isDispatching ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      {lead.firstContactSent ? 'Disparar Novamente' : 'Disparar Abordagem'}
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Status do Primeiro Contato</p>
                      <p className="text-xs text-muted-foreground">Disparo automático de abordagem via WhatsApp.</p>
                    </div>
                    {lead.firstContactSent ? (
                      <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300">
                        Enviada
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-600 dark:text-slate-400">
                        Pendente / Não Disparado
                      </Badge>
                    )}
                  </div>

                  <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                    <div className="space-y-0.5">
                      <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Status no Funil Comercial</p>
                      <p className="text-xs text-muted-foreground">Etapa atual do lead no pipeline.</p>
                    </div>
                    <Badge className={getStatusColor(lead.status)}>
                      {lead.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Informações Complementares */}
              <Card className="shadow-xs border border-slate-200 dark:border-slate-800">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4 text-blue-600" /> Dados Institucionais & Bancassurance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-muted-foreground uppercase font-semibold">Agência</span>
                      <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 mt-1">{lead.agencia || '-'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-muted-foreground uppercase font-semibold">Corretora Parceira</span>
                      <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 mt-1">{lead.corretorNome || '-'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-muted-foreground uppercase font-semibold">Campanha de Origem</span>
                      <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 mt-1">{lead.campanha || '-'}</p>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                      <span className="text-xs text-muted-foreground uppercase font-semibold">Data de Cadastro</span>
                      <p className="font-semibold text-sm text-slate-900 dark:text-slate-100 mt-1">
                        {new Date(lead.createdAt).toLocaleDateString('pt-BR')} ({formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true, locale: ptBR })})
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

            </TabsContent>

            {/* ABA 2: Resumo da IA */}
            <TabsContent value="resumoIA" className="mt-0">
              <Card className="shadow-xs border border-blue-100 dark:border-blue-900/50">
                <CardHeader>
                  <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-blue-600" /> Resumo da Conversa com IA
                  </CardTitle>
                  <CardDescription>
                    Resumo e perfil analítico gerados pelo Lucas a partir das mensagens do WhatsApp.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 leading-relaxed text-sm whitespace-pre-wrap text-slate-800 dark:text-slate-200">
                    {lead.resumoDaConversa || "Nenhum resumo registrado ainda. Quando o cliente interagir via WhatsApp, o Lucas sintetizará a negociação aqui."}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            {/* ABA 3: Arquivos & Propostas */}
            <TabsContent value="arquivos" className="mt-0">
              <LeadAttachments 
                leadId={lead.id} 
                initialAttachments={lead.attachments || []} 
              />
            </TabsContent>

            {/* ABA 4: Dados Brutos da Planilha */}
            <TabsContent value="dadosBrutos" className="mt-0">
              <Card className="shadow-xs border border-slate-200 dark:border-slate-800">
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4 text-green-600" /> Todos os Campos da Planilha
                  </CardTitle>
                  <CardDescription>
                    Mapeamento completo dos dados brutos importados da planilha.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {lead.dynamicData && Object.keys(lead.dynamicData).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {Object.entries(lead.dynamicData).map(([key, value]) => {
                        const cleanKey = key.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
                        return (
                          <div key={key} className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-800">
                            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1">
                              {cleanKey}
                            </span>
                            <p className="text-sm font-medium text-slate-900 dark:text-slate-100 break-words">
                              {value !== null && value !== undefined && value !== '' ? String(value) : '-'}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-10 text-muted-foreground border border-dashed rounded-xl">
                      <p className="text-sm">Nenhum dado dinâmico adicional coletado.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

          </Tabs>
        </div>

      </div>

      {/* Diálogo de Confirmação de Disparo Individual */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Bot className="h-5 w-5 text-blue-600" /> Iniciar Disparo com Lucas (IA)
            </DialogTitle>
            <DialogDescription>
              Deseja enviar a abordagem automática do Lucas para <strong className="text-slate-900 dark:text-slate-100">{lead.name}</strong> ({lead.contato})?
            </DialogDescription>
          </DialogHeader>

          <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <p className="font-semibold text-slate-800 dark:text-slate-200">Parâmetros do Disparo:</p>
            <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
              <li><strong>Ramo:</strong> {lead.ramo || 'Seguro Residencial'}</li>
              <li><strong>Campanha:</strong> {lead.campanha || 'Campanha de Renovação'}</li>
              <li><strong>Agência:</strong> {lead.agencia || '-'}</li>
              <li><strong>Vencimento:</strong> {renewalDate ? renewalDate.toLocaleDateString('pt-BR') : '-'}</li>
            </ul>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={isDispatching}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDispatchLucas}
              disabled={isDispatching}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-semibold"
            >
              {isDispatching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Disparando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Confirmar e Disparar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}