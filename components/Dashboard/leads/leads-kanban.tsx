'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Lead } from './leads-table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Phone, MoreHorizontal, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import Link from 'next/link';
import { toast } from 'sonner';

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
  { id: 'ENTRANTE', label: 'Entrante', color: 'bg-blue-500/10 border-blue-200 text-blue-700' },
  { id: 'QUALIFICADO', label: 'Qualificado', color: 'bg-purple-500/10 border-purple-200 text-purple-700' },
  { id: 'AGENDADO_COTACAO', label: 'Cotação', color: 'bg-amber-500/10 border-amber-200 text-amber-700' },
  { id: 'PROPOSTA_ENVIADA', label: 'Proposta', color: 'bg-orange-500/10 border-orange-200 text-orange-700' },
  { id: 'VENDA_REALIZADA', label: 'Venda Fechada', color: 'bg-green-500/10 border-green-200 text-green-700' },
];

export function LeadsKanban({ data }: { data: Lead[] }) {
  const [leads, setLeads] = useState<Lead[]>(data);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Estado de paginação individual para cada coluna
  // Começamos na página 2 porque a página 1 já veio do servidor (initialData)
  const [pagination, setPagination] = useState<Record<string, { page: number, hasMore: boolean, loading: boolean }>>(() => {
    const initial: any = {};
    KANBAN_COLUMNS.forEach(c => initial[c.id] = { page: 2, hasMore: true, loading: false });
    return initial;
  });

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  // Derivação dos leads agrupados (Memória local)
  const groupedLeads = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col.id] = leads.filter(l => l.status === col.id);
    return acc;
  }, {} as Record<string, Lead[]>);

  // --- LÓGICA DE INFINITE SCROLL ---
  const loadMoreLeads = useCallback(async (status: string) => {
    const state = pagination[status];
    if (!state.hasMore || state.loading) return;

    // 1. Marca como carregando
    setPagination(prev => ({
        ...prev,
        [status]: { ...prev[status], loading: true }
    }));

    try {
        // 2. Busca API
        const res = await fetch(`/api/leads?status=${status}&page=${state.page}&limit=10`);
        if (!res.ok) throw new Error("Falha na API");
        const newLeads: Lead[] = await res.json();

        // 3. Processa resultados
        if (newLeads.length === 0) {
            setPagination(prev => ({
                ...prev,
                [status]: { ...prev[status], hasMore: false, loading: false }
            }));
        } else {
            setLeads(prev => {
                // Deduplicação: Garante que não adicionamos leads que já existem
                const existingIds = new Set(prev.map(l => l.id));
                const uniqueLeads = newLeads.filter(l => !existingIds.has(l.id));
                return [...prev, ...uniqueLeads];
            });
            
            setPagination(prev => ({
                ...prev,
                [status]: { 
                    page: prev[status].page + 1, 
                    hasMore: newLeads.length === 10, // Se veio menos que o limite, acabou
                    loading: false 
                }
            }));
        }
    } catch (error) {
        console.error(error);
        setPagination(prev => ({
            ...prev,
            [status]: { ...prev[status], loading: false } // Permite tentar de novo
        }));
    }
  }, [pagination]);

  // --- LÓGICA DE DRAG & DROP ---
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

    // Update Otimista Local
    setLeads((prev) => 
      prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l)
    );

    // Persistência no Servidor
    const result = await updateLeadStatus(leadId, newStatus);

    if (result.success) {
      toast.success(`Movido para ${KANBAN_COLUMNS.find(c => c.id === newStatus)?.label}`);
    } else {
      // Rollback
      setLeads((prev) => 
        prev.map(l => l.id === leadId ? { ...l, status: currentLead.status } : l)
      );
      toast.error('Erro ao mover lead');
    }
  }

  const activeLead = leads.find(l => l.id === activeId);

  return (
    <DndContext 
      sensors={sensors} 
      onDragStart={handleDragStart} 
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-[calc(100vh-220px)] gap-4 overflow-x-auto pb-4 snap-x">
        {KANBAN_COLUMNS.map((col) => (
          <KanbanColumn 
            key={col.id} 
            col={col} 
            leads={groupedLeads[col.id] || []} 
            onLoadMore={() => loadMoreLeads(col.id)}
            isLoading={pagination[col.id]?.loading}
            hasMore={pagination[col.id]?.hasMore}
          />
        ))}
      </div>

      <DragOverlay>
        {activeLead ? (
          <div className="rotate-2 cursor-grabbing opacity-90 scale-105">
            <KanbanCard lead={activeLead} isOverlay />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// --- COLUNA COM DETECÇÃO DE SCROLL ---

function KanbanColumn({ col, leads, onLoadMore, isLoading, hasMore }: { 
    col: any, 
    leads: Lead[],
    onLoadMore: () => void,
    isLoading?: boolean,
    hasMore?: boolean
}) {
  const { setNodeRef } = useDroppable({ id: col.id });
  const observerRef = useRef<IntersectionObserver | null>(null);
  const triggerRef = useRef<HTMLDivElement | null>(null);

  // Setup do Observer
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
      className="min-w-[300px] w-[300px] flex flex-col snap-center h-full rounded-lg bg-slate-50/50 dark:bg-slate-900/20 border border-transparent hover:border-slate-200 transition-colors"
    >
      <div className={`flex items-center justify-between p-3 rounded-t-lg border-b-2 ${col.color} bg-white dark:bg-slate-900 border`}>
        <span className="font-semibold text-sm">{col.label}</span>
        <Badge variant="secondary" className="bg-white/50 dark:bg-black/20">
          {leads.length}{hasMore ? '+' : ''}
        </Badge>
      </div>

      <div className="flex-1 p-2 space-y-3 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        {leads.map((lead) => (
          <DraggableKanbanCard key={lead.id} lead={lead} />
        ))}
        
        {leads.length === 0 && !isLoading && (
           <div className="h-24 flex items-center justify-center text-xs text-muted-foreground opacity-40 border-2 border-dashed border-slate-200 rounded-lg">
             Vazio
           </div>
        )}

        {/* Elemento Sentinela para Trigger de Loading */}
        <div ref={triggerRef} className="py-2 flex justify-center w-full h-8">
            {isLoading && <Loader2 className="h-5 w-5 animate-spin text-slate-400" />}
        </div>
      </div>
    </div>
  );
}

// Os componentes DraggableKanbanCard e KanbanCard permanecem iguais ao original...
function DraggableKanbanCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  if (isDragging) {
    return (
      <div ref={setNodeRef} style={style} className="opacity-30 grayscale blur-[1px]">
        <KanbanCard lead={lead} />
      </div>
    );
  }

  return (
    <div ref={setNodeRef} style={style} {...listeners} {...attributes}>
      <KanbanCard lead={lead} />
    </div>
  );
}

function KanbanCard({ lead, isOverlay }: { lead: Lead, isOverlay?: boolean }) {
  return (
    <Card className={`shadow-sm transition-all group border-l-4 border-l-transparent hover:border-l-blue-500 ${isOverlay ? 'cursor-grabbing' : 'cursor-grab hover:shadow-md'}`}>
      <CardContent className="p-3 space-y-2">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <h4 className="text-sm font-semibold line-clamp-1 select-none">{lead.name}</h4>
            <div className="flex items-center text-xs text-muted-foreground gap-1 select-none">
              <Phone className="h-3 w-3" />
              {lead.contato}
            </div>
          </div>
          
          {!isOverlay && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                  <DropdownMenuItem asChild>
                      <Link href={`/dashboard/leads/${lead.id}`}>Ver Detalhes</Link>
                  </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex flex-wrap gap-2 mt-2">
            {lead.interestedInProduct && (
                <Badge variant="outline" className="text-[10px] h-5 bg-slate-50 select-none">
                    {lead.interestedInProduct.name}
                </Badge>
            )}
        </div>

        <div className="pt-2 border-t flex items-center justify-between text-[10px] text-muted-foreground mt-2 select-none">
            <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true, locale: ptBR })}
            </span>
        </div>
      </CardContent>
    </Card>
  );
}