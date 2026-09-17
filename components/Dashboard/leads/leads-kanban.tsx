'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Lead } from './leads-table';
import { getRenewalUrgency } from '@/lib/renewal';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Clock, Phone, MoreHorizontal, Loader2, Calendar, 
  Zap, CheckCircle2, MessageSquare, Bot, Shield, AlertCircle,
  ExternalLink, Sparkles
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import Link from 'next/link';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { LeadChatWhatsApp } from './lead-chat-whatsapp';
import { useRouter } from 'next/navigation';

// --- DND KIT IMPORTS ---
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
  TouchSensor,
  MouseSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { updateLeadStatus } from '@/app/actions/leads';

const KANBAN_COLUMNS = [
  { 
    id: 'ENTRANTE', 
    label: 'Entrantes', 
    accentColor: '#3b82f6',
    borderClass: 'border-blue-500/30',
    headerBg: 'bg-blue-50/50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300',
    dotColor: 'bg-blue-500'
  },
  { 
    id: 'QUALIFICADO', 
    label: 'Qualificados', 
    accentColor: '#8b5cf6',
    borderClass: 'border-purple-500/30',
    headerBg: 'bg-purple-50/50 dark:bg-purple-950/20 text-purple-700 dark:text-purple-300',
    dotColor: 'bg-purple-500'
  },
  { 
    id: 'AGENDADO_COTACAO', 
    label: 'Em Cotação', 
    accentColor: '#f59e0b',
    borderClass: 'border-amber-500/30',
    headerBg: 'bg-amber-50/50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-300',
    dotColor: 'bg-amber-500'
  },
  { 
    id: 'PROPOSTA_ENVIADA', 
    label: 'Proposta Enviada', 
    accentColor: '#f97316',
    borderClass: 'border-orange-500/30',
    headerBg: 'bg-orange-50/50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-300',
    dotColor: 'bg-orange-500'
  },
  { 
    id: 'VENDA_REALIZADA', 
    label: 'Vendas Fechadas', 
    accentColor: '#10b981',
    borderClass: 'border-emerald-500/30',
    headerBg: 'bg-emerald-50/50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300',
    dotColor: 'bg-emerald-500'
  },
];

export function LeadsKanban({ data }: { data: Lead[] }) {
  const router = useRouter();
  const [leads, setLeads] = useState<Lead[]>(data);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedChatLead, setSelectedChatLead] = useState<Lead | null>(null);

  // Sincronizar leads se o data inicial for atualizado
  useEffect(() => {
    setLeads(data);
  }, [data]);

  // Paginação individual de colunas
  const [pagination, setPagination] = useState<Record<string, { page: number, hasMore: boolean, loading: boolean }>>(() => {
    const initial: any = {};
    KANBAN_COLUMNS.forEach(c => initial[c.id] = { page: 2, hasMore: true, loading: false });
    return initial;
  });

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } })
  );

  // Leads agrupados por coluna
  const groupedLeads = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col.id] = leads
      .filter(l => l.status === col.id)
      .sort((a, b) => {
        const timeA = a.dataRenovacao ? new Date(a.dataRenovacao).getTime() : Infinity;
        const timeB = b.dataRenovacao ? new Date(b.dataRenovacao).getTime() : Infinity;
        return timeA - timeB;
      });
    return acc;
  }, {} as Record<string, Lead[]>);

  // Infinite scroll para carregar mais leads por coluna
  const loadMoreLeads = useCallback(async (status: string) => {
    const state = pagination[status];
    if (!state.hasMore || state.loading) return;

    setPagination(prev => ({
      ...prev,
      [status]: { ...prev[status], loading: true }
    }));

    try {
      const res = await fetch(`/api/leads?status=${status}&page=${state.page}&limit=12`);
      if (!res.ok) throw new Error("Falha ao carregar leads da coluna");
      const newLeads: Lead[] = await res.json();

      if (newLeads.length === 0) {
        setPagination(prev => ({
          ...prev,
          [status]: { ...prev[status], hasMore: false, loading: false }
        }));
      } else {
        setLeads(prev => {
          const existingIds = new Set(prev.map(l => l.id));
          const uniqueLeads = newLeads.filter(l => !existingIds.has(l.id));
          return [...prev, ...uniqueLeads];
        });
        setPagination(prev => ({
          ...prev,
          [status]: { 
            page: prev[status].page + 1, 
            hasMore: newLeads.length === 12,
            loading: false 
          }
        }));
      }
    } catch (error) {
      console.error(error);
      setPagination(prev => ({
        ...prev,
        [status]: { ...prev[status], loading: false }
      }));
    }
  }, [pagination]);

  // Drag & Drop
  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const leadId = active.id as string;
    const newStatus = over.id as string;
    const currentLead = leads.find(l => l.id === leadId);

    if (!currentLead || currentLead.status === newStatus) return;

    setLeads((prev) => 
      prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l)
    );

    const result = await updateLeadStatus(leadId, newStatus);

    if (result.success) {
      const colName = KANBAN_COLUMNS.find(c => c.id === newStatus)?.label || newStatus;
      toast.success(`Lead movido para "${colName}"`);
    } else {
      setLeads((prev) => 
        prev.map(l => l.id === leadId ? { ...l, status: currentLead.status } : l)
      );
      toast.error('Erro ao atualizar status do lead');
    }
  }

  const activeLead = leads.find(l => l.id === activeId);

  return (
    <>
      <DndContext 
        sensors={sensors} 
        onDragStart={handleDragStart} 
        onDragEnd={handleDragEnd}
      >
        <div className="flex h-[calc(100vh-250px)] min-h-[580px] gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin">
          {KANBAN_COLUMNS.map((col) => (
            <KanbanColumn 
              key={col.id} 
              col={col} 
              leads={groupedLeads[col.id] || []} 
              onLoadMore={() => loadMoreLeads(col.id)}
              isLoading={pagination[col.id]?.loading}
              hasMore={pagination[col.id]?.hasMore}
              onOpenChat={(lead) => setSelectedChatLead(lead)}
            />
          ))}
        </div>

        <DragOverlay>
          {activeLead ? (
            <div className="rotate-2 cursor-grabbing opacity-95 scale-105 shadow-2xl">
              <KanbanCard lead={activeLead} isOverlay />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Modal de Chat WhatsApp Integrado */}
      <Dialog open={!!selectedChatLead} onOpenChange={(open) => !open && setSelectedChatLead(null)}>
        <DialogContent className="max-w-4xl p-0 border-0 bg-transparent shadow-2xl overflow-hidden sm:rounded-2xl">
          {selectedChatLead && (
            <LeadChatWhatsApp 
              lead={selectedChatLead} 
              onRefreshLead={() => router.refresh()} 
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// --- COLUNA COM CABEÇALHO GLASSMORPHISM ---

function KanbanColumn({ col, leads, onLoadMore, isLoading, hasMore, onOpenChat }: { 
  col: any, 
  leads: Lead[],
  onLoadMore: () => void,
  isLoading?: boolean,
  hasMore?: boolean,
  onOpenChat?: (lead: Lead) => void
}) {
  const { setNodeRef } = useDroppable({ id: col.id });
  const observerRef = useRef<IntersectionObserver | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting && hasMore && !isLoading) {
        onLoadMore();
      }
    }, { threshold: 0.1 });

    if (triggerRef.current) observerRef.current.observe(triggerRef.current);

    return () => observerRef.current?.disconnect();
  }, [hasMore, isLoading, onLoadMore]);

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "min-w-[310px] w-[310px] flex flex-col snap-center h-full rounded-2xl",
        "glass-panel border border-slate-200/80 dark:border-slate-800/80 shadow-xs",
        "transition-all duration-200 overflow-hidden"
      )}
    >
      {/* Top Accent Line */}
      <div 
        className="h-1.5 w-full" 
        style={{ backgroundColor: col.accentColor }} 
      />

      {/* Cabeçalho da Coluna */}
      <div className={cn("flex items-center justify-between px-4 py-3 border-b border-slate-200/60 dark:border-slate-800/60", col.headerBg)}>
        <div className="flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", col.dotColor)} />
          <span className="font-bold text-xs uppercase tracking-wider text-slate-800 dark:text-slate-100">
            {col.label}
          </span>
        </div>

        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white/80 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-700 dark:text-slate-200 shadow-2xs">
          {leads.length}{hasMore ? '+' : ''}
        </span>
      </div>

      {/* Lista de Cards da Coluna */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto scrollbar-thin">
        {leads.map((lead) => (
          <DraggableKanbanCard 
            key={lead.id} 
            lead={lead} 
            onOpenChat={onOpenChat}
          />
        ))}
        
        {leads.length === 0 && !isLoading && (
          <div className="h-32 flex flex-col items-center justify-center text-xs text-slate-400 dark:text-slate-500 border-2 border-dashed border-slate-200/80 dark:border-slate-800/80 rounded-2xl p-4 text-center">
            <p className="font-medium">Nenhum lead nesta etapa</p>
            <p className="text-[11px] mt-0.5 text-slate-400">Arraste um card para cá</p>
          </div>
        )}

        <div ref={triggerRef} className="py-2 flex justify-center w-full h-8">
          {isLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
        </div>
      </div>
    </div>
  );
}

function DraggableKanbanCard({ lead, onOpenChat }: { lead: Lead, onOpenChat?: (lead: Lead) => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  if (isDragging) {
    return (
      <div ref={setNodeRef} style={style} className="opacity-25 grayscale blur-[1px]">
        <KanbanCard lead={lead} />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <KanbanCard lead={lead} onOpenChat={onOpenChat} />
    </div>
  );
}

// --- CARD INDIVIDUAL DO KANBAN COM ORGANIZAÇÃO DE TAGS IMPECÁVEL ---

function KanbanCard({ lead, isOverlay, onOpenChat }: { lead: Lead, isOverlay?: boolean, onOpenChat?: (lead: Lead) => void }) {
  const urgency = getRenewalUrgency(lead.dataRenovacao);
  const initials = lead.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div 
      className={cn(
        "rounded-2xl glass-card p-3.5 space-y-3 transition-all duration-200 select-none",
        "border border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/70",
        isOverlay 
          ? "cursor-grabbing shadow-2xl ring-2 ring-blue-500/30" 
          : "cursor-grab hover:border-blue-500/40 hover:shadow-md"
      )}
    >
      {/* 1. Header do Card: Avatar/Iniciais, Nome e Ações */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-7 w-7 rounded-lg bg-linear-to-tr from-blue-600 to-indigo-600 text-white font-bold text-[11px] flex items-center justify-center shrink-0 shadow-xs">
            {initials}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate" title={lead.name}>
              {lead.name}
            </h4>
            <div className="flex items-center gap-1 text-[11px] text-slate-500 font-mono">
              <Phone className="h-3 w-3 text-slate-400" />
              <span>{lead.contato}</span>
            </div>
          </div>
        </div>
        
        {!isOverlay && (
          <div className="flex items-center gap-1 shrink-0">
            {onOpenChat && (
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 rounded-lg text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/50"
                onClick={(e) => {
                  e.stopPropagation();
                  onOpenChat(lead);
                }}
                title="Abrir WhatsApp"
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </Button>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-7 w-7 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-3.5 w-3.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-panel text-xs">
                <DropdownMenuLabel>Ações Rápidas</DropdownMenuLabel>
                {onOpenChat && (
                  <DropdownMenuItem onClick={() => onOpenChat(lead)} className="text-emerald-600 font-medium">
                    <MessageSquare className="mr-2 h-3.5 w-3.5" /> Abrir Chat WhatsApp
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/leads/${lead.id}`}>
                    <ExternalLink className="mr-2 h-3.5 w-3.5" /> Ver Detalhes do Lead
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      {/* 2. Organização Hierárquica das Tags */}
      <div className="space-y-2 pt-1 border-t border-slate-100 dark:border-slate-800/60">
        
        {/* Linha 1: Urgência da Renovação e Abordagem IA */}
        <div className="flex flex-wrap items-center gap-1.5">
          {lead.dataRenovacao && (
            <Badge 
              variant="outline" 
              className={cn("text-[10px] px-2 py-0.5 border font-semibold gap-1", urgency.badgeClass)}
            >
              <Calendar className="h-3 w-3" />
              {urgency.label}
            </Badge>
          )}

          {lead.firstContactSent ? (
            <Badge 
              variant="outline" 
              className="text-[10px] px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 gap-1 font-medium"
            >
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              Abordado
            </Badge>
          ) : (
            <Badge 
              variant="outline" 
              className="text-[10px] px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 gap-1 font-medium"
            >
              <Zap className="h-3 w-3 text-blue-500" />
              Pronto para IA
            </Badge>
          )}

          {lead.prioridade && lead.prioridade === '1' && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0.5 font-bold">
              Prio 1
            </Badge>
          )}
        </div>

        {/* Linha 2: Produto / Ramo de Interesse */}
        {(lead.ramo || lead.interestedInProduct) && (
          <div className="flex items-center gap-1.5">
            <Badge 
              variant="outline" 
              className="text-[10px] font-normal bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/60 truncate max-w-full"
            >
              <Shield className="mr-1 h-2.5 w-2.5 text-blue-500" />
              {lead.ramo || lead.interestedInProduct?.name || 'Seguro'}
            </Badge>
          </div>
        )}
      </div>

      {/* 3. Rodapé do Card: Data relativa e data de renovação */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/60 flex items-center justify-between text-[10px] text-slate-400">
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true, locale: ptBR })}
        </span>
        
        {lead.dataRenovacao && (
          <span className="font-mono text-[10px] text-slate-500 dark:text-slate-400">
            Venc: {new Date(lead.dataRenovacao).toLocaleDateString('pt-BR')}
          </span>
        )}
      </div>
    </div>
  );
}