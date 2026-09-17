'use client';

import { useState } from 'react';
import { Lead, LeadsTable } from './leads-table';
import { LeadsKanban } from './leads-kanban';
import { LayoutGrid, List, Plus, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddLeadDialog } from '../add-lead-dialog';
import { LeadsImportDialog } from './leads-import-dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LeadsViewProps {
  initialData: Lead[];
}

export function LeadsView({ initialData }: LeadsViewProps) {
  const [view, setView] = useState<'kanban' | 'table'>('kanban');

  return (
    <div className="space-y-5">
      
      {/* Barra de Controle Superior em Vidro */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 p-2 rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        
        {/* Switcher de Visualização: Segmented Control com Indicador Deslizante */}
        <div className="relative flex items-center bg-slate-100/80 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/60 self-start sm:self-auto">
          <button
            onClick={() => setView('kanban')}
            className={cn(
              "relative z-10 flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-200",
              view === 'kanban' 
                ? "text-blue-600 dark:text-blue-400" 
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Funil Kanban</span>

            {view === 'kanban' && (
              <motion.div
                layoutId="viewSwitchIndicator"
                className="absolute inset-0 bg-white dark:bg-slate-800 rounded-lg shadow-xs -z-10 border border-slate-200/60 dark:border-slate-700/60"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
          </button>
          
          <button
            onClick={() => setView('table')}
            className={cn(
              "relative z-10 flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-200",
              view === 'table' 
                ? "text-blue-600 dark:text-blue-400" 
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            <List className="h-3.5 w-3.5" />
            <span>Visualização em Lista</span>

            {view === 'table' && (
              <motion.div
                layoutId="viewSwitchIndicator"
                className="absolute inset-0 bg-white dark:bg-slate-800 rounded-lg shadow-xs -z-10 border border-slate-200/60 dark:border-slate-700/60"
                transition={{ type: "spring", stiffness: 450, damping: 35 }}
              />
            )}
          </button>
        </div>

        {/* Ações (Importação + Novo Lead) */}
        <div className="flex items-center gap-2 justify-end">
          <LeadsImportDialog />
          <AddLeadDialog onSuccess={() => window.location.reload()} />
        </div>
      </div>

      {/* Renderização do Conteúdo com Transição */}
      <AnimatePresence mode="wait">
        {view === 'kanban' ? (
          <motion.div
            key="kanban"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="min-h-[550px]"
          >
            <LeadsKanban data={initialData} />
          </motion.div>
        ) : (
          <motion.div
            key="table"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.2 }}
            className="min-h-[550px]"
          >
            <LeadsTable data={initialData} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}