'use client';

import { useState } from 'react';
import { Lead, LeadsTable } from './leads-table';
import { LeadsKanban } from './leads-kanban';
import { LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddLeadDialog } from '../add-lead-dialog';
import { LeadsImportDialog } from './leads-import-dialog'; // <--- Nova Importação
import { cn } from '@/lib/utils'; 

interface LeadsViewProps {
  initialData: Lead[];
}

export function LeadsView({ initialData }: LeadsViewProps) {
  const [view, setView] = useState<'kanban' | 'table'>('kanban');

  return (
    <div className="space-y-4">
      
      {/* Barra de Controle Superior */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Switcher de Visualização (Estilo Segmented Control) */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView('kanban')}
            className={cn(
              "gap-2 transition-all",
              view === 'kanban' 
                ? "bg-white text-slate-950 shadow-sm hover:bg-white dark:bg-slate-950 dark:text-slate-50" 
                : "text-muted-foreground hover:text-slate-900 dark:hover:text-slate-50"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">Kanban</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setView('table')}
            className={cn(
              "gap-2 transition-all",
              view === 'table' 
                ? "bg-white text-slate-950 shadow-sm hover:bg-white dark:bg-slate-950 dark:text-slate-50" 
                : "text-muted-foreground hover:text-slate-900 dark:hover:text-slate-50"
            )}
          >
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Lista</span>
          </Button>
        </div>

        {/* Ações (Importação + Novo Lead) */}
        <div className="flex gap-2 w-full sm:w-auto">
             <LeadsImportDialog /> {/* <--- Botão de Importar Planilha */}
             <AddLeadDialog onSuccess={() => window.location.reload()} />
        </div>
      </div>

      {/* Renderização Condicional */}
      <div className="min-h-[500px] animate-in fade-in zoom-in-95 duration-300">
        {view === 'kanban' ? (
           <LeadsKanban data={initialData} />
        ) : (
           <LeadsTable data={initialData} />
        )}
      </div>
    </div>
  );
}