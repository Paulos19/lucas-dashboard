'use client';

import { useState, useMemo } from 'react';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  SortingState,
  ColumnFiltersState,
  RowSelectionState,
} from '@tanstack/react-table';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MoreHorizontal,
  ArrowUpDown,
  Search,
  MessageSquare,
  CalendarClock,
  Send,
  Bot,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Sparkles,
  Flame,
  Clock,
  Calendar,
  Filter,
  Check,
  AlertTriangle,
  Zap,
  Phone,
  Shield,
  ChevronsLeft,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  X
} from 'lucide-react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AddLeadDialog } from '@/components/Dashboard/add-lead-dialog';
import { LeadChatWhatsApp } from './lead-chat-whatsapp';
import { cn } from '@/lib/utils';
import { getRenewalUrgency, type RenewalUrgencyStatus, type RenewalUrgencyInfo } from '@/lib/renewal';
import { motion, AnimatePresence } from 'framer-motion';

export { getRenewalUrgency, type RenewalUrgencyStatus, type RenewalUrgencyInfo };

export type Lead = {
  id: string;
  name: string;
  contato: string;
  status: string;
  updatedAt: Date | string;
  segmentacao?: string | null;
  interestedInProduct?: { name: string } | null;
  prioridade?: string | null;
  ramo?: string | null;
  campanha?: string | null;
  agencia?: string | null;
  dataRenovacao?: Date | string | null;
  telefoneFixo?: string | null;
  corretorNome?: string | null;
  firstContactSent?: boolean;
  resumoDaConversa?: string | null;
  historicoCompleto?: any;
  agendamento?: any;
  dynamicData?: any;
};

interface LeadsTableProps {
  data: Lead[];
}

export function LeadsTable({ data }: LeadsTableProps) {
  const router = useRouter();
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'dataRenovacao', desc: false }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  
  // Filtro Rápido por Abas
  const [activeTab, setActiveTab] = useState<'all' | 'urgent' | 'uncontacted' | 'contacted'>('all');

  // Estados para Disparo
  const [isDispatching, setIsDispatching] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [singleDispatchLead, setSingleDispatchLead] = useState<Lead | null>(null);
  
  // Estado para Modal de Chat WhatsApp
  const [selectedChatLead, setSelectedChatLead] = useState<Lead | null>(null);

  // Estatísticas Rápidas
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let urgentCount = 0;
    let uncontactedCount = 0;
    let contactedCount = 0;

    data.forEach(lead => {
      if (!lead.firstContactSent) uncontactedCount++;
      else contactedCount++;

      if (lead.dataRenovacao) {
        const d = new Date(lead.dataRenovacao);
        d.setHours(0, 0, 0, 0);
        const diff = differenceInDays(d, today);
        if (diff >= 0 && diff <= 30) {
          urgentCount++;
        }
      }
    });

    return {
      total: data.length,
      urgentCount,
      uncontactedCount,
      contactedCount
    };
  }, [data]);

  // Filtragem dos dados de acordo com a aba ativa
  const filteredData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return data.filter(lead => {
      if (activeTab === 'urgent') {
        if (!lead.dataRenovacao) return false;
        const d = new Date(lead.dataRenovacao);
        d.setHours(0, 0, 0, 0);
        const diff = differenceInDays(d, today);
        return diff >= 0 && diff <= 30;
      }
      if (activeTab === 'uncontacted') {
        return !lead.firstContactSent;
      }
      if (activeTab === 'contacted') {
        return lead.firstContactSent;
      }
      return true;
    });
  }, [data, activeTab]);

  // Executar disparo com a IA Lucas
  const executeDispatch = async (leadIds: string[]) => {
    if (leadIds.length === 0) return;

    setIsDispatching(true);
    const toastId = toast.loading(`Iniciando esteira do Lucas para ${leadIds.length} lead(s)...`);

    try {
      const res = await fetch('/api/automations/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadIds }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Erro ao processar disparo.');
      }

      toast.dismiss(toastId);
      toast.success(`Sucesso! ${result.dispatchedCount} lead(s) enviados para abordagem com prioridade.`);
      
      setRowSelection({});
      setConfirmDialogOpen(false);
      setSingleDispatchLead(null);
      
      setTimeout(() => {
        window.location.reload();
      }, 800);

    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error(error.message || 'Ocorreu um erro durante o disparo.');
    } finally {
      setIsDispatching(false);
    }
  };

  // Disparo das 10 renovações mais urgentes
  const handleSelectTopUrgentRenewals = () => {
    const uncontactedWithDates = [...data]
      .filter(l => !l.firstContactSent)
      .sort((a, b) => {
        const timeA = a.dataRenovacao ? new Date(a.dataRenovacao).getTime() : Infinity;
        const timeB = b.dataRenovacao ? new Date(b.dataRenovacao).getTime() : Infinity;
        return timeA - timeB;
      });

    const top10 = uncontactedWithDates.slice(0, 10);

    if (top10.length === 0) {
      toast.info('Não há leads pendentes de disparo no momento.');
      return;
    }

    const newSelection: RowSelectionState = {};
    top10.forEach((lead) => {
      const rowIndex = filteredData.findIndex(d => d.id === lead.id);
      if (rowIndex !== -1) {
        newSelection[rowIndex] = true;
      }
    });

    setRowSelection(newSelection);
    setSingleDispatchLead(null);
    setConfirmDialogOpen(true);
  };

  // --- COLUNAS DA TABELA ---
  const columns: ColumnDef<Lead>[] = [
    // 1. Checkbox
    {
      id: 'select',
      header: ({ table }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
            }
            onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
            aria-label="Selecionar todos"
            className="rounded-md"
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Selecionar linha"
            className="rounded-md"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    // 2. Segurado (Avatar + Nome + Telefone)
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-3 hover:bg-transparent font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300"
        >
          Segurado
          <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-60" />
        </Button>
      ),
      cell: ({ row }) => {
        const initials = row.original.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase();
        return (
          <div className="flex items-center gap-3 py-1">
            <div className="h-8 w-8 rounded-xl bg-linear-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
              {initials}
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                  {row.getValue('name')}
                </span>
                {row.original.prioridade && row.original.prioridade === '1' && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300">
                    Prio 1
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-mono">
                <Phone className="h-3 w-3 text-slate-400" />
                <span>{row.original.contato}</span>
              </div>
            </div>
          </div>
        );
      },
    },
    // 3. Vencimento / Renovação
    {
      accessorKey: 'dataRenovacao',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-3 hover:bg-transparent font-bold text-xs uppercase tracking-wider text-slate-600 dark:text-slate-300"
        >
          <Calendar className="mr-1.5 h-3.5 w-3.5 text-blue-500" />
          Renovação
          <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-60" />
        </Button>
      ),
      sortingFn: (rowA, rowB) => {
        const dateA = rowA.original.dataRenovacao ? new Date(rowA.original.dataRenovacao).getTime() : Infinity;
        const dateB = rowB.original.dataRenovacao ? new Date(rowB.original.dataRenovacao).getTime() : Infinity;
        return dateA - dateB;
      },
      cell: ({ row }) => {
        const rawDate = row.original.dataRenovacao;
        const urgency = getRenewalUrgency(rawDate);

        return (
          <div className="flex flex-col gap-1 items-start">
            <Badge
              variant="outline"
              className={cn("text-[11px] px-2 py-0.5 border shadow-2xs font-semibold gap-1", urgency.badgeClass)}
            >
              <Calendar className="h-3 w-3" />
              {urgency.label}
            </Badge>
            {rawDate && (
              <span className="text-xs text-slate-500 font-mono">
                {new Date(rawDate).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        );
      },
    },
    // 4. Produto / Ramo
    {
      accessorKey: 'ramo',
      header: () => <span className="text-xs uppercase font-bold tracking-wider text-slate-600 dark:text-slate-300">Produto & Ramo</span>,
      cell: ({ row }) => {
        const ramo = row.original.ramo;
        const product = row.original.interestedInProduct?.name;
        const display = ramo || product || 'Seguro';
        return (
          <div className="flex flex-col items-start gap-0.5">
            <Badge
              variant="outline"
              className="text-xs font-medium bg-slate-50/80 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/60 gap-1.5"
            >
              <Shield className="h-3 w-3 text-blue-500" />
              {display}
            </Badge>
            {row.original.campanha && (
              <span className="text-[11px] text-slate-400 truncate max-w-[150px]">
                {row.original.campanha}
              </span>
            )}
          </div>
        );
      },
    },
    // 5. Status do Funil
    {
      accessorKey: 'status',
      header: () => <span className="text-xs uppercase font-bold tracking-wider text-slate-600 dark:text-slate-300">Status</span>,
      cell: ({ row }) => {
        const status = row.getValue('status') as string;

        const colors: Record<string, { bg: string, dot: string, label: string }> = {
          ENTRANTE: { 
            bg: 'bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60',
            dot: 'bg-blue-500',
            label: 'Entrante' 
          },
          QUALIFICADO: { 
            bg: 'bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60',
            dot: 'bg-purple-500',
            label: 'Qualificado' 
          },
          AGENDADO_COTACAO: { 
            bg: 'bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60',
            dot: 'bg-amber-500',
            label: 'Cotação' 
          },
          PROPOSTA_ENVIADA: { 
            bg: 'bg-orange-50 text-orange-700 border-orange-200/80 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60',
            dot: 'bg-orange-500',
            label: 'Proposta' 
          },
          VENDA_REALIZADA: { 
            bg: 'bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60',
            dot: 'bg-emerald-500',
            label: 'Venda Fechada' 
          },
          PERDIDO: { 
            bg: 'bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60',
            dot: 'bg-rose-500',
            label: 'Perdido' 
          },
          ARQUIVADO: { 
            bg: 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700',
            dot: 'bg-slate-400',
            label: 'Arquivado' 
          },
        };

        const config = colors[status] || { 
          bg: 'bg-slate-100 text-slate-700', 
          dot: 'bg-slate-500', 
          label: status || 'Entrante' 
        };

        return (
          <Badge
            variant="outline"
            className={cn("px-2.5 py-0.5 border text-xs font-semibold gap-1.5 shadow-2xs", config.bg)}
          >
            <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
            {config.label}
          </Badge>
        );
      },
    },
    // 6. Abordagem da IA
    {
      id: 'aiStatus',
      header: () => <span className="text-xs uppercase font-bold tracking-wider text-slate-600 dark:text-slate-300">Esteira Lucas</span>,
      cell: ({ row }) => {
        const lead = row.original;
        return (
          <div>
            {lead.firstContactSent ? (
              <Badge variant="outline" className="text-[11px] px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 gap-1 font-medium">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                Abordado
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[11px] px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800 gap-1 font-medium">
                <Zap className="h-3 w-3 text-blue-500" />
                Pronto para IA
              </Badge>
            )}
          </div>
        );
      },
    },
    // 7. Última Ação
    {
      accessorKey: 'updatedAt',
      header: () => <div className="text-right text-xs uppercase font-bold tracking-wider text-slate-600 dark:text-slate-300">Última Ação</div>,
      cell: ({ row }) => (
        <div className="text-right text-xs text-slate-400 flex items-center justify-end gap-1">
          <Clock className="h-3 w-3 text-slate-400" />
          {formatDistanceToNow(new Date(row.getValue('updatedAt')), {
            addSuffix: true,
            locale: ptBR,
          })}
        </div>
      ),
    },
    // 8. Ações
    {
      id: 'actions',
      cell: ({ row }) => {
        const lead = row.original;
        return (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 relative"
              onClick={() => setSelectedChatLead(lead)}
              title="Visualizar Chat WhatsApp"
            >
              <MessageSquare className="h-4 w-4" />
              {Array.isArray(lead.historicoCompleto) && lead.historicoCompleto.length > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-emerald-500" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSingleDispatchLead(lead);
                setConfirmDialogOpen(true);
              }}
              className="h-8 px-2.5 text-xs font-semibold gap-1 text-blue-600 border-blue-200/80 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950/40 rounded-lg"
            >
              <Bot className="h-3.5 w-3.5" />
              <span>Disparar</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg text-slate-400 hover:text-slate-900 dark:hover:text-white">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="glass-panel text-xs">
                <DropdownMenuLabel>Ações do Lead</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => setSelectedChatLead(lead)}
                  className="text-emerald-600 dark:text-emerald-400 font-medium"
                >
                  <MessageSquare className="mr-2 h-3.5 w-3.5" /> Ver Chat WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSingleDispatchLead(lead);
                    setConfirmDialogOpen(true);
                  }}
                  className="text-blue-600 dark:text-blue-400 font-medium"
                >
                  <Bot className="mr-2 h-3.5 w-3.5" /> Disparar Lucas (IA)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => window.open(`https://wa.me/${lead.contato.replace(/\D/g, '')}`, '_blank')}
                >
                  <MessageSquare className="mr-2 h-3.5 w-3.5 text-emerald-600" /> Abrir no WhatsApp Web
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    navigator.clipboard.writeText(lead.contato);
                    toast.success('Telefone copiado!');
                  }}
                >
                  Copiar Telefone
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/leads/${lead.id}`} className="cursor-pointer w-full flex items-center">
                    <ExternalLink className="mr-2 h-3.5 w-3.5" /> Ver Detalhes do Lead
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  const table = useReactTable({
    data: filteredData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onGlobalFilterChange: setGlobalFilter,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      globalFilter,
      rowSelection,
    },
    initialState: {
      pagination: {
        pageSize: 15,
      },
    },
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCount = selectedRows.length;
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const pageCount = table.getPageCount();

  // Extrai lista ordenada dos leads selecionados para conferência
  const selectedLeadsToDispatch = useMemo(() => {
    if (singleDispatchLead) return [singleDispatchLead];
    return selectedRows.map(r => r.original).sort((a, b) => {
      const timeA = a.dataRenovacao ? new Date(a.dataRenovacao).getTime() : Infinity;
      const timeB = b.dataRenovacao ? new Date(b.dataRenovacao).getTime() : Infinity;
      return timeA - timeB;
    });
  }, [singleDispatchLead, selectedRows]);

  return (
    <div className="space-y-4">
      
      {/* 1. Barra Superior com Filtros por Abas e Ação de Destaque */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 p-2.5 rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        
        {/* Abas Rápidas */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => { setActiveTab('all'); setRowSelection({}); }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
              activeTab === 'all'
                ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs border border-slate-200/60 dark:border-slate-700/60"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            )}
          >
            Todos os Leads
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-mono">
              {stats.total}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('urgent'); setRowSelection({}); }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
              activeTab === 'urgent'
                ? "bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/60 shadow-xs"
                : "text-slate-500 hover:text-rose-600 dark:text-slate-400 dark:hover:text-rose-400"
            )}
          >
            <Flame className="h-3.5 w-3.5 text-rose-500" />
            Renovações Próximas (≤ 30d)
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-100 dark:bg-rose-900/50 text-rose-700 dark:text-rose-300 font-mono font-bold">
              {stats.urgentCount}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('uncontacted'); setRowSelection({}); }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
              activeTab === 'uncontacted'
                ? "bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 shadow-xs"
                : "text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400"
            )}
          >
            <Zap className="h-3.5 w-3.5 text-blue-500" />
            Fila de Disparo
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300 font-mono">
              {stats.uncontactedCount}
            </span>
          </button>

          <button
            onClick={() => { setActiveTab('contacted'); setRowSelection({}); }}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
              activeTab === 'contacted'
                ? "bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 shadow-xs"
                : "text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400"
            )}
          >
            <Check className="h-3.5 w-3.5 text-emerald-500" />
            Já Abordados
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 font-mono">
              {stats.contactedCount}
            </span>
          </button>
        </div>

        {/* Botão de Destaque: Disparar Top 10 Renovações */}
        <Button
          size="sm"
          onClick={handleSelectTopUrgentRenewals}
          className="h-9 px-3.5 text-xs bg-linear-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:opacity-95 text-white shadow-md gap-1.5 font-bold shrink-0 rounded-xl"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Disparar Top 10 Renovações
        </Button>
      </div>

      {/* 2. Barra de Busca e Seleção de Página */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome, telefone ou campanha..."
            value={globalFilter ?? ''}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-9 pr-8 h-9.5 rounded-xl glass-panel border border-slate-200/80 dark:border-slate-800/80 text-xs placeholder:text-slate-400"
          />
          {globalFilter && (
            <button
              onClick={() => setGlobalFilter('')}
              className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 justify-end">
          {selectedCount === 0 && table.getRowModel().rows.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.toggleAllPageRowsSelected(true)}
              className="gap-1.5 text-xs text-blue-600 dark:text-blue-400 glass-pill border-slate-200/80 dark:border-slate-800/80 h-9"
            >
              <Bot className="h-3.5 w-3.5" />
              Selecionar Página ({table.getRowModel().rows.length})
            </Button>
          )}
        </div>
      </div>

      {/* 3. Tabela Principal em Glassmorphism */}
      <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800/80 glass-panel overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-slate-50/80 dark:bg-slate-900/80 border-b border-slate-200/60 dark:border-slate-800/60">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-slate-200/60 dark:border-slate-800/60 hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="py-3 px-4">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && 'selected'}
                  className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors border-slate-100 dark:border-slate-800/60 data-[state=selected]:bg-blue-50/40 dark:data-[state=selected]:bg-blue-950/20"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3 px-4">
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-36 text-center text-slate-400"
                >
                  Nenhum lead encontrado com os filtros atuais.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* 4. Nova Paginação Completa e Moderna */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
        
        {/* Informações de Linhas e Seletor de Itens por Página */}
        <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
          <div>
            Mostrando{' '}
            <strong className="text-slate-900 dark:text-slate-100">
              {filteredData.length === 0 ? 0 : pageIndex * pageSize + 1}
            </strong>{' '}
            a{' '}
            <strong className="text-slate-900 dark:text-slate-100">
              {Math.min((pageIndex + 1) * pageSize, filteredData.length)}
            </strong>{' '}
            de <strong className="text-slate-900 dark:text-slate-100">{filteredData.length}</strong> leads
          </div>

          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Exibir:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(val) => table.setPageSize(Number(val))}
            >
              <SelectTrigger className="h-8 w-20 text-xs glass-pill">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="15">15</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Controles de Navegação por Página */}
        <div className="flex items-center gap-1.5">
          {/* Primeira Página */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            className="h-8 w-8 rounded-lg"
            title="Primeira página"
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>

          {/* Página Anterior */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="h-8 w-8 rounded-lg"
            title="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {/* Números das Páginas Interativos */}
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(5, pageCount) }, (_, i) => {
              // Calcular janela móvel em torno da página atual
              let p = pageIndex - 2 + i;
              if (pageIndex < 2) p = i;
              if (pageIndex > pageCount - 3) p = pageCount - 5 + i;
              if (p < 0 || p >= pageCount) return null;

              const isCurrent = p === pageIndex;
              return (
                <button
                  key={p}
                  onClick={() => table.setPageIndex(p)}
                  className={cn(
                    "h-8 min-w-[32px] px-2 rounded-lg text-xs font-semibold transition-all",
                    isCurrent
                      ? "bg-blue-600 text-white shadow-xs"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  )}
                >
                  {p + 1}
                </button>
              );
            })}
          </div>

          {/* Próxima Página */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="h-8 w-8 rounded-lg"
            title="Próxima página"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>

          {/* Última Página */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
            className="h-8 w-8 rounded-lg"
            title="Última página"
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 5. Barra Flutuante de Ações em Massa (Ao Selecionar Linhas) */}
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-[92%] max-w-2xl p-4 rounded-2xl glass-panel border border-blue-500/40 shadow-2xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl flex flex-col sm:flex-row items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-md">
                <Sparkles className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white">
                  {selectedCount} {selectedCount === 1 ? 'lead selecionado' : 'leads selecionados'}
                </p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Ordem de disparo automática por proximidade do vencimento.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRowSelection({})}
                disabled={isDispatching}
                className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-white"
              >
                Desmarcar todos
              </Button>

              <Button
                size="sm"
                className="bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md text-xs font-bold gap-2 h-9 px-4 rounded-xl"
                disabled={isDispatching}
                onClick={() => {
                  setSingleDispatchLead(null);
                  setConfirmDialogOpen(true);
                }}
              >
                {isDispatching ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Send className="h-3.5 w-3.5" />
                )}
                Disparar Esteira ({selectedCount})
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6. Diálogo de Confirmação de Disparo */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-lg glass-panel border border-slate-200 dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Bot className="h-5 w-5 text-blue-600" /> Confirmar Fila de Disparo Inteligente
            </DialogTitle>
            <DialogDescription className="text-xs">
              {singleDispatchLead ? (
                <span>
                  Você está prestes a iniciar a abordagem do Lucas para o lead{' '}
                  <strong className="text-slate-900 dark:text-slate-100">{singleDispatchLead.name}</strong> ({singleDispatchLead.contato}).
                </span>
              ) : (
                <span>
                  Você está prestes a enviar{' '}
                  <strong className="text-slate-900 dark:text-slate-100">{selectedLeadsToDispatch.length} leads</strong> para a esteira do Lucas. O processamento seguirá a ordem abaixo:
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {!singleDispatchLead && selectedLeadsToDispatch.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 bg-slate-50/70 dark:bg-slate-950/50">
              <p className="text-[11px] font-semibold text-slate-500 mb-1">
                Ordem de Execução (Vencimento mais próximo primeiro):
              </p>
              {selectedLeadsToDispatch.map((lead, idx) => {
                const urgency = getRenewalUrgency(lead.dataRenovacao);
                return (
                  <div key={lead.id} className="flex items-center justify-between text-xs py-1 px-2.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-[10px] text-slate-400 w-4">{idx + 1}.</span>
                      <span className="font-medium truncate max-w-[180px]">{lead.name}</span>
                    </div>
                    <Badge variant="outline" className={cn("text-[10px] h-5", urgency.badgeClass)}>
                      {urgency.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}

          <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/60 dark:border-slate-800/60 text-xs space-y-1.5 text-slate-600 dark:text-slate-400">
            <p className="font-semibold text-slate-900 dark:text-slate-200">Garantias do Lucas AI:</p>
            <ul className="list-disc pl-4 space-y-0.5">
              <li><strong>Prioridade de apólice:</strong> Quem vence primeiro recebe primeiro.</li>
              <li><strong>Proteção Antiban:</strong> Fracionamento de balões e digitação simulada.</li>
              <li><strong>RAG Contextualizado:</strong> Argumentos focados no plano atual do cliente.</li>
            </ul>
          </div>

          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              variant="outline"
              onClick={() => {
                setConfirmDialogOpen(false);
                setSingleDispatchLead(null);
              }}
              disabled={isDispatching}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                if (singleDispatchLead) {
                  executeDispatch([singleDispatchLead.id]);
                } else {
                  const ids = selectedLeadsToDispatch.map((l) => l.id);
                  executeDispatch(ids);
                }
              }}
              disabled={isDispatching}
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-bold text-xs"
            >
              {isDispatching ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Disparando...
                </>
              ) : (
                <>
                  <Send className="h-3.5 w-3.5" /> Confirmar e Disparar ({selectedLeadsToDispatch.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. Modal de Chat WhatsApp Rápido */}
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

    </div>
  );
}