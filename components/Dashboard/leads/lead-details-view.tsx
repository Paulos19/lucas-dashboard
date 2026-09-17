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
  Loader2, Sparkles, Shield, Tag
} from 'lucide-react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { LeadFormDialog } from './lead-form-dialog';
import { LeadAttachments } from './lead-attachments';
import { LeadChatWhatsApp } from './lead-chat-whatsapp';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getRenewalUrgency } from '@/lib/renewal';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

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
    const toastId = toast.loading('Enviando lead para a esteira do Lucas...');

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

  // Mapeamento de cor e rótulo do status
  const getStatusBadgeConfig = (status: string) => {
    const map: Record<string, { bg: string, dot: string, label: string }> = {
      'ENTRANTE': { 
        bg: 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
        dot: 'bg-blue-500',
        label: 'Entrante' 
      },
      'QUALIFICADO': { 
        bg: 'bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60',
        dot: 'bg-purple-500',
        label: 'Qualificado' 
      },
      'AGENDADO_COTACAO': { 
        bg: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
        dot: 'bg-amber-500',
        label: 'Em Cotação' 
      },
      'PROPOSTA_ENVIADA': { 
        bg: 'bg-orange-50 text-orange-700 border-orange-200/80 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60',
        dot: 'bg-orange-500',
        label: 'Proposta Enviada' 
      },
      'VENDA_REALIZADA': { 
        bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
        dot: 'bg-emerald-500',
        label: 'Venda Fechada' 
      },
      'PERDIDO': { 
        bg: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
        dot: 'bg-rose-500',
        label: 'Perdido' 
      },
      'ARQUIVADO': { 
        bg: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
        dot: 'bg-slate-400',
        label: 'Arquivado' 
      },
    };
    return map[status] || { 
      bg: 'bg-slate-100 text-slate-700', 
      dot: 'bg-slate-500', 
      label: status || 'Entrante' 
    };
  };

  const statusConfig = getStatusBadgeConfig(lead.status);
  const urgency = getRenewalUrgency(lead.dataRenovacao);

  // Cálculo de dias para vencimento
  const renewalDate = lead.dataRenovacao ? new Date(lead.dataRenovacao) : null;
  const daysToRenewal = renewalDate ? differenceInDays(renewalDate, new Date()) : null;
  const initials = lead.name ? lead.name.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() : 'LE';

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-12">
      
      {/* 1. Barra de Navegação e Ações Principais */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-2 glass-pill text-xs border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400" 
          onClick={() => router.push('/dashboard/leads')}
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Voltar para Meus Leads
        </Button>

        <div className="flex items-center gap-2">
          <LeadFormDialog 
            lead={lead} 
            trigger={
              <Button variant="outline" size="sm" className="gap-1.5 glass-pill text-xs border-slate-200/80 dark:border-slate-800/80">
                <Edit className="h-3.5 w-3.5 text-blue-500" /> Editar Ficha
              </Button>
            } 
          />

          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-1.5 text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700" 
            onClick={handleDelete}
          >
            <Trash2 className="h-3.5 w-3.5" /> Excluir
          </Button>
        </div>
      </div>

      {/* 2. Hero Header Card com Glassmorphism */}
      <div className="relative rounded-3xl glass-panel border border-slate-200/80 dark:border-slate-800/80 p-6 md:p-7 shadow-xl overflow-hidden">
        {/* Ambient Glow Orb */}
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-linear-to-br from-blue-500/15 via-indigo-500/10 to-transparent blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          
          {/* Avatar e Dados do Segurado */}
          <div className="flex items-start gap-4 sm:gap-5 min-w-0">
            <div className="h-16 w-16 sm:h-20 sm:w-20 rounded-2xl bg-linear-to-tr from-blue-600 via-indigo-600 to-cyan-400 text-white font-black text-xl sm:text-2xl flex items-center justify-center shrink-0 shadow-lg ring-4 ring-white dark:ring-slate-900">
              {initials}
            </div>

            <div className="space-y-2 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
                  {lead.name}
                </h1>

                {/* Badge de Status do Funil */}
                <Badge variant="outline" className={cn("px-2.5 py-0.5 border text-xs font-semibold gap-1.5 shadow-2xs", statusConfig.bg)}>
                  <span className={cn("h-1.5 w-1.5 rounded-full", statusConfig.dot)} />
                  {statusConfig.label}
                </Badge>

                {/* Badge de Urgência de Renovação */}
                {lead.dataRenovacao && (
                  <Badge variant="outline" className={cn("text-xs px-2.5 py-0.5 border font-semibold gap-1 shadow-2xs", urgency.badgeClass)}>
                    <Calendar className="h-3 w-3" />
                    {urgency.label}
                  </Badge>
                )}

                {/* Badge de Prioridade */}
                {lead.prioridade && lead.prioridade === '1' && (
                  <Badge variant="destructive" className="text-xs px-2 py-0.5 font-bold shadow-2xs">
                    Prioridade 1 (Crítica)
                  </Badge>
                )}
              </div>

              {/* Contatos e Atualização */}
              <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                <div className="flex items-center gap-1.5 font-mono text-slate-700 dark:text-slate-200 font-semibold">
                  <Phone className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <span>{lead.contato}</span>
                </div>

                {lead.telefoneFixo && (
                  <div className="flex items-center gap-1.5 font-mono text-slate-500">
                    <PhoneCall className="h-3.5 w-3.5 text-slate-400" />
                    <span>Fixo: {lead.telefoneFixo}</span>
                  </div>
                )}

                <div className="flex items-center gap-1.5 text-slate-400">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Atualizado {formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true, locale: ptBR })}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Botões de Ação Imediata */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto shrink-0">
            {/* Botão de Disparo do Lucas */}
            <Button
              className="gap-2 bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md flex-1 lg:flex-initial text-xs font-bold h-10 px-4 rounded-xl"
              disabled={isDispatching}
              onClick={() => setConfirmDialogOpen(true)}
            >
              {isDispatching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
              {lead.firstContactSent ? 'Disparar Novamente (IA)' : 'Disparar Lucas (IA)'}
            </Button>

            {/* WhatsApp Web Direto */}
            <Button 
              variant="outline"
              className="gap-2 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/80 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 glass-pill flex-1 lg:flex-initial text-xs font-semibold h-10 px-4 rounded-xl"
              onClick={() => window.open(`https://wa.me/${lead.contato.replace(/\D/g, '')}`, '_blank')}
            >
              <MessageSquare className="h-4 w-4 text-emerald-500" /> WhatsApp Web
            </Button>

            {/* Fazer Ligação */}
            {lead.contato && (
              <Button 
                variant="outline"
                className="gap-2 glass-pill flex-1 lg:flex-initial text-xs font-semibold h-10 px-3.5 rounded-xl border-slate-200/80 dark:border-slate-800/80"
                asChild
              >
                <a href={`tel:${lead.contato.replace(/\D/g, '')}`}>
                  <PhoneCall className="h-3.5 w-3.5 text-blue-500" /> Ligar
                </a>
              </Button>
            )}
          </div>

        </div>
      </div>

      {/* 3. Grid de 4 Cards de Métricas e Inteligência */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Vencimento da Apólice */}
        <div className="rounded-2xl glass-card p-4.5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Vencimento Apólice
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400">
              <Calendar className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            {renewalDate ? renewalDate.toLocaleDateString('pt-BR') : 'Sem data definida'}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {daysToRenewal !== null ? (
              daysToRenewal > 0 ? (
                <span className="text-amber-600 dark:text-amber-400 font-semibold">Vence em {daysToRenewal} dias</span>
              ) : daysToRenewal === 0 ? (
                <span className="text-rose-600 font-bold">Vence hoje!</span>
              ) : (
                <span className="text-slate-400">Venceu há {Math.abs(daysToRenewal)} dias</span>
              )
            ) : 'Aguardando apólice'}
          </p>
        </div>

        {/* Card 2: Ramo & Campanha */}
        <div className="rounded-2xl glass-card p-4.5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Ramo & Produto
            </span>
            <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
            {lead.ramo || lead.interestedInProduct?.name || 'Geral'}
          </div>
          <p className="text-xs text-slate-500 mt-1 truncate" title={lead.campanha || ''}>
            {lead.campanha || 'Campanha Padrão'}
          </p>
        </div>

        {/* Card 3: Agência Bancária */}
        <div className="rounded-2xl glass-card p-4.5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Agência Relacionamento
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white truncate" title={lead.agencia || 'Não informada'}>
            {lead.agencia || 'Não informada'}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Fase: <strong className="text-slate-700 dark:text-slate-300 font-semibold">{lead.fase || 'Nova'}</strong>
          </p>
        </div>

        {/* Card 4: Corretor Responsável */}
        <div className="rounded-2xl glass-card p-4.5 border border-slate-200/80 dark:border-slate-800/80 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between pb-2">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Corretor Responsável
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <UserCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="text-sm font-bold text-slate-900 dark:text-white truncate" title={lead.corretorNome || lead.user?.name || 'Sem corretor'}>
            {lead.corretorNome || lead.user?.name || 'Sem corretor'}
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            {lead.userId ? (
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" /> Vinculado à Carteira
              </span>
            ) : (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" /> Standby
              </span>
            )}
          </div>
        </div>

      </div>

      {/* 4. Conteúdo Principal em 2 Colunas: Dossiê Lateral + Abas de Atendimento */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Coluna Esquerda: Dossiê do Segurado (4 colunas) */}
        <div className="lg:col-span-4 space-y-6">
          <div className="rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-sm space-y-4">
            
            <div className="pb-3 border-b border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  <FileSpreadsheet className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Dossiê do Segurado</h3>
                  <p className="text-[11px] text-slate-500">Dados cadastrais consolidados</p>
                </div>
              </div>

              {lead.prioridade && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                  Prio {lead.prioridade}
                </span>
              )}
            </div>

            {/* Linhas de Dados Cadastrais */}
            <div className="space-y-3 text-xs">
              
              <div>
                <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Nome Completo</span>
                <p className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-0.5">{lead.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <div>
                  <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Celular WhatsApp</span>
                  <p className="font-mono font-semibold text-slate-800 dark:text-slate-200 mt-0.5">{lead.contato}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Tel. Fixo</span>
                  <p className="font-mono text-slate-600 dark:text-slate-300 mt-0.5">{lead.telefoneFixo || '-'}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Ramo / Produto</span>
                <p className="font-semibold text-slate-900 dark:text-slate-100 mt-0.5">{lead.ramo || '-'}</p>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Campanha de Origem</span>
                <p className="text-slate-700 dark:text-slate-300 mt-0.5">{lead.campanha || lead.origemLead || '-'}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <div>
                  <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Agência</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{lead.agencia || '-'}</p>
                </div>
                <div>
                  <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Fase Comercial</span>
                  <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{lead.fase || 'Nova'}</p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Corretora Parceira</span>
                <p className="font-medium text-slate-800 dark:text-slate-200 mt-0.5">{lead.corretorNome || '-'}</p>
              </div>

              {lead.numeroApolice && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Número da Apólice</span>
                  <p className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400 mt-0.5">{lead.numeroApolice}</p>
                </div>
              )}

              {lead.faturamentoEstimado && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60">
                  <span className="text-slate-400 font-medium uppercase tracking-wider text-[10px]">Prêmio Estimado</span>
                  <p className="font-bold text-base text-emerald-600 dark:text-emerald-400 mt-0.5">
                    R$ {lead.faturamentoEstimado}
                  </p>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Coluna Direita: Abas de Atendimento e Copilot (8 colunas) */}
        <div className="lg:col-span-8 space-y-6">
          <Tabs defaultValue="conversaWhatsApp" className="w-full">
            
            {/* Tabs Header com Segmented Control Estilizado */}
            <div className="p-1 rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800/80 mb-5 overflow-x-auto no-scrollbar">
              <TabsList className="w-full justify-start bg-transparent p-0 gap-1 h-auto">
                
                <TabsTrigger 
                  value="conversaWhatsApp" 
                  className="rounded-xl data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 transition-all flex items-center gap-1.5"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  <span>Chat WhatsApp</span>
                  {Array.isArray(lead.historicoCompleto) && lead.historicoCompleto.length > 0 && (
                    <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-white/20 text-white ml-0.5">
                      {lead.historicoCompleto.length}
                    </span>
                  )}
                </TabsTrigger>

                <TabsTrigger 
                  value="visaoGeral" 
                  className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-xs px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 transition-all flex items-center gap-1.5"
                >
                  <Activity className="h-3.5 w-3.5" />
                  <span>Visão Geral & Agenda</span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="resumoIA" 
                  className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-xs px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 transition-all flex items-center gap-1.5"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Resumo da IA</span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="arquivos" 
                  className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-xs px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 transition-all flex items-center gap-1.5"
                >
                  <FileText className="h-3.5 w-3.5" />
                  <span>Arquivos ({lead.attachments?.length || 0})</span>
                </TabsTrigger>
                
                <TabsTrigger 
                  value="dadosBrutos" 
                  className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:text-blue-600 dark:data-[state=active]:text-blue-400 data-[state=active]:shadow-xs px-3.5 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 transition-all flex items-center gap-1.5"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  <span>Dados Planilha</span>
                </TabsTrigger>

              </TabsList>
            </div>

            {/* ABA 1: Conversa WhatsApp (COM O BUG DE SCROLL CORRIGIDO!) */}
            <TabsContent value="conversaWhatsApp" className="mt-0">
              <LeadChatWhatsApp 
                lead={lead} 
                onRefreshLead={() => router.refresh()} 
                className="rounded-2xl border-slate-200/80 dark:border-slate-800/80 shadow-md"
              />
            </TabsContent>

            {/* ABA 2: Visão Geral & Agenda */}
            <TabsContent value="visaoGeral" className="space-y-5 mt-0">
              
              {/* Card de Agendamento Confirmado */}
              {lead.agendamento ? (
                <div className="rounded-2xl glass-panel border border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20 p-5 shadow-xs space-y-2">
                  <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 font-bold text-sm">
                    <Calendar className="h-4 w-4" />
                    <span>Reunião / Agendamento Confirmado</span>
                  </div>
                  <p className="text-xl font-extrabold text-slate-900 dark:text-white">
                    {new Date(lead.agendamento.dataHora).toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' })}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Tipo: <strong className="text-slate-700 dark:text-slate-200">{lead.agendamento.tipo}</strong> • Status: <strong className="text-slate-700 dark:text-slate-200">{lead.agendamento.status}</strong>
                  </p>
                  {lead.agendamento.resumo && (
                    <p className="text-xs bg-white/80 dark:bg-slate-900/80 p-3 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-slate-800 dark:text-slate-200 mt-2">
                      {lead.agendamento.resumo}
                    </p>
                  )}
                </div>
              ) : null}

              {/* Status de Primeiro Contato com IA */}
              <div className="rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Esteira de Abordagem do Lucas (IA)</h3>
                  </div>

                  <Button
                    size="sm"
                    onClick={() => setConfirmDialogOpen(true)}
                    disabled={isDispatching}
                    className="h-8 gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl"
                  >
                    {isDispatching ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    {lead.firstContactSent ? 'Disparar Novamente' : 'Disparar Abordagem'}
                  </Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Primeiro Contato</p>
                      <p className="text-[11px] text-slate-400">Disparo automático WhatsApp</p>
                    </div>
                    {lead.firstContactSent ? (
                      <Badge className="bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800">
                        Enviada
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500 dark:text-slate-400">
                        Pendente
                      </Badge>
                    )}
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Etapa Comercial</p>
                      <p className="text-[11px] text-slate-400">Posição no funil de vendas</p>
                    </div>
                    <Badge variant="outline" className={cn("px-2.5 py-0.5 border text-xs font-semibold gap-1.5 shadow-2xs", statusConfig.bg)}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", statusConfig.dot)} />
                      {statusConfig.label}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Informações Institucionais */}
              <div className="rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-xs space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
                  <ShieldCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">Dados de Bancassurance</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-slate-400 uppercase font-semibold text-[10px]">Agência Bancária</span>
                    <p className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-0.5">{lead.agencia || '-'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-slate-400 uppercase font-semibold text-[10px]">Corretora Parceira</span>
                    <p className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-0.5">{lead.corretorNome || '-'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-slate-400 uppercase font-semibold text-[10px]">Campanha</span>
                    <p className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-0.5">{lead.campanha || '-'}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                    <span className="text-slate-400 uppercase font-semibold text-[10px]">Data de Entrada</span>
                    <p className="font-bold text-sm text-slate-900 dark:text-slate-100 mt-0.5">
                      {new Date(lead.createdAt).toLocaleDateString('pt-BR')} ({formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true, locale: ptBR })})
                    </p>
                  </div>
                </div>
              </div>

            </TabsContent>

            {/* ABA 3: Resumo da IA */}
            <TabsContent value="resumoIA" className="mt-0 space-y-4">
              <div className="rounded-2xl glass-panel border border-blue-200/80 dark:border-blue-900/60 p-6 shadow-sm space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                    <Sparkles className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">Resumo Analítico da Negociação</h3>
                    <p className="text-xs text-slate-500">Síntese cognitiva gerada pelo Lucas AI</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-white/60 dark:bg-slate-900/80 border border-slate-200/70 dark:border-slate-800/70 text-sm leading-relaxed whitespace-pre-wrap text-slate-800 dark:text-slate-200 font-medium">
                  {lead.resumoDaConversa || "Nenhum resumo registrado ainda. Quando o cliente interagir via WhatsApp, o Lucas sintetizará os pontos-chave e o perfil de compra aqui."}
                </div>
              </div>
            </TabsContent>

            {/* ABA 4: Arquivos & Propostas */}
            <TabsContent value="arquivos" className="mt-0">
              <LeadAttachments 
                leadId={lead.id} 
                initialAttachments={lead.attachments || []} 
              />
            </TabsContent>

            {/* ABA 5: Dados Brutos da Planilha */}
            <TabsContent value="dadosBrutos" className="mt-0 space-y-4">
              <div className="rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800/80 p-5 shadow-sm space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
                  <FileSpreadsheet className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">Campos Dinâmicos da Planilha</h3>
                    <p className="text-[11px] text-slate-500">Mapeamento completo dos metadados importados</p>
                  </div>
                </div>

                {lead.dynamicData && Object.keys(lead.dynamicData).length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {Object.entries(lead.dynamicData).map(([key, value]) => {
                      const cleanKey = key.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
                      return (
                        <div key={key} className="p-3 rounded-xl bg-slate-50/70 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                            {cleanKey}
                          </span>
                          <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 break-words">
                            {value !== null && value !== undefined && value !== '' ? String(value) : '-'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-10 text-slate-400 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                    <p className="text-xs">Nenhum dado dinâmico adicional coletado na importação.</p>
                  </div>
                )}
              </div>
            </TabsContent>

          </Tabs>
        </div>

      </div>

      {/* Diálogo de Confirmação de Disparo com a IA */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md glass-panel border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Bot className="h-5 w-5 text-blue-600" /> Iniciar Disparo com Lucas (IA)
            </DialogTitle>
            <DialogDescription className="text-xs">
              Deseja enviar a abordagem automática do Lucas para <strong className="text-slate-900 dark:text-slate-100">{lead.name}</strong> ({lead.contato})?
            </DialogDescription>
          </DialogHeader>

          <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3.5 rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
            <p className="font-bold text-slate-900 dark:text-slate-200">Parâmetros do Disparo:</p>
            <ul className="list-disc pl-4 space-y-0.5">
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
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDispatchLucas}
              disabled={isDispatching}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-bold text-xs"
            >
              {isDispatching ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Disparando...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" /> Confirmar e Disparar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}