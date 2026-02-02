'use client';

import { useState } from 'react';
import { Lead } from './leads-table';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Phone, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
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
import { updateLeadStatus } from '@/app/actions/leads'; // Nossa Server Action

// Configuração das Colunas
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

  // Configura sensores para funcionar bem em Mouse e Touch
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
  );

  // Agrupa leads dinamicamente baseado no estado local (para update otimista)
  const groupedLeads = KANBAN_COLUMNS.reduce((acc, col) => {
    acc[col.id] = leads.filter(l => l.status === col.id);
    return acc;
  }, {} as Record<string, Lead[]>);

  // Handler: Quando começa a arrastar
  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  // Handler: Quando solta o card
  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const leadId = active.id as string;
    const newStatus = over.id as string;
    const currentLead = leads.find(l => l.id === leadId);

    // Se soltou na mesma coluna, não faz nada
    if (!currentLead || currentLead.status === newStatus) return;

    // 1. Update Otimista (Atualiza a UI antes do servidor responder)
    setLeads((prev) => 
      prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l)
    );

    // 2. Chama Server Action
    const result = await updateLeadStatus(leadId, newStatus);

    if (result.success) {
      toast.success(`Lead movido para ${KANBAN_COLUMNS.find(c => c.id === newStatus)?.label}`);
    } else {
      // Rollback em caso de erro
      setLeads((prev) => 
        prev.map(l => l.id === leadId ? { ...l, status: currentLead.status } : l)
      );
      toast.error('Erro ao mover lead');
    }
  }

  // Encontra o lead sendo arrastado para desenhar o Overlay
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
          />
        ))}
      </div>

      {/* Overlay: O card "fantasma" que segue o mouse */}
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

// --- SUB-COMPONENTES ---

function KanbanColumn({ col, leads }: { col: any, leads: Lead[] }) {
  // A coluna inteira é uma área "Droppable"
  const { setNodeRef } = useDroppable({ id: col.id });

  return (
    <div 
      ref={setNodeRef}
      className="min-w-[300px] w-[300px] flex flex-col snap-center h-full rounded-lg bg-slate-50/50 dark:bg-slate-900/20 border border-transparent hover:border-slate-200 transition-colors"
    >
      {/* Header */}
      <div className={`flex items-center justify-between p-3 rounded-t-lg border-b-2 ${col.color} bg-white dark:bg-slate-900 border`}>
        <span className="font-semibold text-sm">{col.label}</span>
        <Badge variant="secondary" className="bg-white/50 dark:bg-black/20">
          {leads.length}
        </Badge>
      </div>

      {/* Área de Cards */}
      <div className="flex-1 p-2 space-y-3 overflow-y-auto">
        {leads.map((lead) => (
          <DraggableKanbanCard key={lead.id} lead={lead} />
        ))}
        {leads.length === 0 && (
           <div className="h-24 flex items-center justify-center text-xs text-muted-foreground opacity-40 border-2 border-dashed border-slate-200 rounded-lg">
             Arraste aqui
           </div>
        )}
      </div>
    </div>
  );
}

function DraggableKanbanCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
  });

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined;

  if (isDragging) {
    return (
      <div 
        ref={setNodeRef} 
        style={style} 
        className="opacity-30 grayscale blur-[1px]"
      >
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