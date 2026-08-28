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
} from 'lucide-react';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { AddLeadDialog } from '@/components/Dashboard/add-lead-dialog';
import { LeadChatWhatsApp } from './lead-chat-whatsapp';
import { cn } from '@/lib/utils';

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

/**
 * Calcula a urgência e formatação do vencimento da apólice
 */
export function getRenewalUrgency(dataRenovacao: Date | string | null | undefined) {
  if (!dataRenovacao) {
    return {
      label: 'Sem data',
      status: 'none' as const,
      days: null,
      badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    };
  }

  const renewalDate = new Date(dataRenovacao);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  renewalDate.setHours(0, 0, 0, 0);

  const diffDays = differenceInDays(renewalDate, today);

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return {
      label: absDays === 1 ? 'Venceu ontem' : `Vencida há ${absDays}d`,
      status: 'expired' as const,
      days: diffDays,
      badgeClass: 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-semibold',
    };
  }

  if (diffDays === 0) {
    return {
      label: 'Vence HOJE 🚨',
      status: 'urgent' as const,
      days: 0,
      badgeClass: 'bg-red-600 text-white border-red-700 font-bold animate-pulse shadow-xs',
    };
  }

  if (diffDays <= 7) {
    return {
      label: `Vence em ${diffDays}d 🔥`,
      status: 'urgent' as const,
      days: diffDays,
      badgeClass: 'bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800 font-bold',
    };
  }

  if (diffDays <= 15) {
    return {
      label: `Vence em ${diffDays}d ⚡`,
      status: 'warning' as const,
      days: diffDays,
      badgeClass: 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-semibold',
    };
  }

  if (diffDays <= 30) {
    return {
      label: `Vence em ${diffDays}d`,
      status: 'upcoming' as const,
      days: diffDays,
      badgeClass: 'bg-yellow-100 dark:bg-yellow-950/70 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700 font-medium',
    };
  }

  return {
    label: `Vence em ${diffDays}d`,
    status: 'future' as const,
    days: diffDays,
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  };
}

export function LeadsTable({ data }: LeadsTableProps) {
  const router = useRouter();
  // Ordenação padrão inicial: por data de renovação mais próxima (ascendente, datas reais primeiro)
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'dataRenovacao', desc: false }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  
  // Filtro Rápido de Visão
  const [activeTab, setActiveTab] = useState<'all' | 'urgent' | 'uncontacted' | 'contacted'>('all');

  // Estados para Disparo
  const [isDispatching, setIsDispatching] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [singleDispatchLead, setSingleDispatchLead] = useState<Lead | null>(null);
  
  // Estado para Modal de Chat WhatsApp
  const [selectedChatLead, setSelectedChatLead] = useState<Lead | null>(null);

  // Estatísticas Rápidas de Renovações
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let urgentCount = 0; // <= 30 dias
    let uncontactedCount = 0; // Não disparados
    let contactedCount = 0; // Já disparados

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

  // Filtra os dados de acordo com a aba ativa
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

  // Executa o disparo para uma lista de IDs
  const executeDispatch = async (leadIds: string[]) => {
    if (leadIds.length === 0) return;

    setIsDispatching(true);
    const toastId = toast.loading(`Iniciando disparo com Lucas para ${leadIds.length} lead(s) na ordem de vencimento...`);

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
      toast.success(`Sucesso! ${result.dispatchedCount} lead(s) enviados para a esteira do Lucas (prioridade por data de renovação).`);
      
      setRowSelection({});
      setConfirmDialogOpen(false);
      setSingleDispatchLead(null);
      
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (error: any) {
      toast.dismiss(toastId);
      toast.error(error.message || 'Ocorreu um erro durante o disparo.');
    } finally {
      setIsDispatching(false);
    }
  };

  // Ação rápida: Seleciona automaticamente as 10 renovações não contatadas mais urgentes
  const handleSelectTopUrgentRenewals = () => {
    // Filtra não contatados que possuem data de renovação
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

  const columns: ColumnDef<Lead>[] = [
    // 1. Checkbox de Seleção
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
          />
        </div>
      ),
      cell: ({ row }) => (
        <div className="flex items-center justify-center">
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Selecionar linha"
          />
        </div>
      ),
      enableSorting: false,
      enableHiding: false,
    },
    // 2. Data de Renovação & Urgência (COLUNA DESTACADA COM PRIORIDADE)
    {
      accessorKey: 'dataRenovacao',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4 hover:bg-transparent font-semibold text-blue-900 dark:text-blue-200"
        >
          <Calendar className="mr-1.5 h-4 w-4 text-blue-600 dark:text-blue-400" />
          Vencimento / Renovação
          <ArrowUpDown className="ml-1.5 h-3.5 w-3.5 opacity-70" />
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
              className={cn("text-[11px] px-2 py-0.5 border shadow-2xs transition-all", urgency.badgeClass)}
            >
              {urgency.label}
            </Badge>
            {rawDate && (
              <span className="text-xs text-muted-foreground font-mono">
                {new Date(rawDate).toLocaleDateString('pt-BR')}
              </span>
            )}
          </div>
        );
      },
    },
    // 3. Nome do Lead & Telefone
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4 hover:bg-transparent font-semibold"
        >
          Nome do Segurado
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-900 dark:text-slate-100">
              {row.getValue('name')}
            </span>
            {row.original.firstContactSent ? (
              <span className="inline-flex items-center gap-0.5 text-[10px] bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded font-medium">
                <CheckCircle2 className="h-2.5 w-2.5" /> Abordado
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5 text-[10px] bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 px-1.5 py-0.2 rounded font-medium">
                <Zap className="h-2.5 w-2.5" /> Pronto para Disparo
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-muted-foreground font-mono">
              {row.original.contato}
            </span>
            {row.original.prioridade && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                  row.original.prioridade === '1'
                    ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : row.original.prioridade === '6'
                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                    : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                Prio {row.original.prioridade}
              </span>
            )}
          </div>
        </div>
      ),
    },
    // 4. Ramo / Campanha & Agência
    {
      accessorKey: 'ramo',
      header: 'Ramo / Campanha',
      cell: ({ row }) => {
        const ramo = row.original.ramo;
        const product = row.original.interestedInProduct?.name;
        const display = ramo || product || 'Residencial';
        return (
          <div className="flex flex-col">
            <Badge
              variant="outline"
              className="w-fit text-xs font-normal bg-slate-50 dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700"
            >
              {display}
            </Badge>
            {row.original.campanha && (
              <span
                className="text-[10px] text-muted-foreground truncate max-w-[170px] mt-0.5"
                title={row.original.campanha}
              >
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
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string;

        const colors: Record<string, string> = {
          ENTRANTE:
            'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
          QUALIFICADO:
            'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
          AGENDADO_COTACAO:
            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
          PROPOSTA_ENVIADA:
            'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
          VENDA_REALIZADA:
            'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
          PERDIDO:
            'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
          ARQUIVADO:
            'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
        };

        return (
          <Badge
            variant="outline"
            className={`${colors[status] || 'bg-gray-100'} border text-xs`}
          >
            {status ? status.replace('_', ' ') : 'ENTRANTE'}
          </Badge>
        );
      },
    },
    // 6. Última Atualização
    {
      accessorKey: 'updatedAt',
      header: () => <div className="text-right">Última Ação</div>,
      cell: ({ row }) => (
        <div className="text-right text-xs text-muted-foreground flex items-center justify-end gap-1">
          <CalendarClock className="h-3 w-3" />
          {formatDistanceToNow(new Date(row.getValue('updatedAt')), {
            addSuffix: true,
            locale: ptBR,
          })}
        </div>
      ),
    },
    // 7. Ações
    {
      id: 'actions',
      cell: ({ row }) => {
        const lead = row.original;
        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 relative"
              onClick={() => setSelectedChatLead(lead)}
              title="Visualizar Chat WhatsApp"
            >
              <MessageSquare className="h-4 w-4" />
              {Array.isArray(lead.historicoCompleto) && lead.historicoCompleto.length > 0 && (
                <span className="absolute 0 top-0.5 right-0.5 h-2 w-2 rounded-full bg-emerald-500" />
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSingleDispatchLead(lead);
                setConfirmDialogOpen(true);
              }}
              className="h-8 px-2 text-xs font-semibold gap-1 text-blue-600 border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950/40"
            >
              <Bot className="h-3.5 w-3.5" />
              <span>Disparar</span>
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <span className="sr-only">Abrir menu</span>
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Ações do Lead</DropdownMenuLabel>
                <DropdownMenuItem
                  onClick={() => setSelectedChatLead(lead)}
                  className="text-emerald-600 dark:text-emerald-400 font-medium"
                >
                  <MessageSquare className="mr-2 h-4 w-4" /> Ver Chat WhatsApp
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setSingleDispatchLead(lead);
                    setConfirmDialogOpen(true);
                  }}
                  className="text-blue-600 dark:text-blue-400 font-medium"
                >
                  <Bot className="mr-2 h-4 w-4" /> Disparar Lucas (IA)
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => window.open(`https://wa.me/${lead.contato.replace(/\D/g, '')}`, '_blank')}
                >
                  <MessageSquare className="mr-2 h-4 w-4 text-green-600" /> Abrir no WhatsApp Web
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => navigator.clipboard.writeText(lead.contato)}
                >
                  Copiar Telefone
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/dashboard/leads/${lead.id}`} className="cursor-pointer w-full flex items-center">
                    <ExternalLink className="mr-2 h-4 w-4" /> Ver Detalhes do Lead
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

  // Extrai lista ordenada dos leads selecionados para conferência no modal
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
      
      {/* Abas Rápidas de Filtragem e Priorização */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-900/60 p-2 rounded-xl border border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setActiveTab('all'); setRowSelection({}); }}
            className={cn(
              "text-xs h-8 px-3 rounded-lg font-medium transition-all",
              activeTab === 'all'
                ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                : "text-muted-foreground hover:text-slate-900 dark:hover:text-white"
            )}
          >
            Todos os Leads ({stats.total})
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setActiveTab('urgent'); setRowSelection({}); }}
            className={cn(
              "text-xs h-8 px-3 rounded-lg font-medium gap-1.5 transition-all",
              activeTab === 'urgent'
                ? "bg-red-500 text-white shadow-xs hover:bg-red-600"
                : "text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
            )}
          >
            <Flame className="h-3.5 w-3.5" />
            Renovações Próximas (≤ 30d) ({stats.urgentCount})
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setActiveTab('uncontacted'); setRowSelection({}); }}
            className={cn(
              "text-xs h-8 px-3 rounded-lg font-medium gap-1.5 transition-all",
              activeTab === 'uncontacted'
                ? "bg-blue-600 text-white shadow-xs hover:bg-blue-700"
                : "text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30"
            )}
          >
            <Zap className="h-3.5 w-3.5" />
            Fila de Disparo ({stats.uncontactedCount})
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => { setActiveTab('contacted'); setRowSelection({}); }}
            className={cn(
              "text-xs h-8 px-3 rounded-lg font-medium gap-1.5 transition-all",
              activeTab === 'contacted'
                ? "bg-emerald-600 text-white shadow-xs hover:bg-emerald-700"
                : "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
            )}
          >
            <Check className="h-3.5 w-3.5" />
            Já Abordados ({stats.contactedCount})
          </Button>
        </div>

        {/* Botão de Disparo Rápido das 10 Mais Próximas */}
        <Button
          size="sm"
          onClick={handleSelectTopUrgentRenewals}
          className="h-8 text-xs bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs gap-1.5 font-semibold"
        >
          <Sparkles className="h-3.5 w-3.5" />
          Disparar Top 10 Renovações
        </Button>
      </div>

      {/* Barra de Ações em Massa (Aparece quando 1 ou mais leads estão selecionados) */}
      {selectedCount > 0 && (
        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 p-3 sm:p-4 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-2.5">
            <div className="bg-blue-600 text-white p-1.5 rounded-lg">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                {selectedCount} {selectedCount === 1 ? 'lead selecionado' : 'leads selecionados'}
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                O Lucas disparará as mensagens em ordem de vencimento da apólice (do mais próximo ao mais distante).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRowSelection({})}
              disabled={isDispatching}
              className="flex-1 sm:flex-initial text-xs"
            >
              Desmarcar
            </Button>
            <Button
              size="sm"
              className="flex-1 sm:flex-initial gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-xs text-xs font-semibold"
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
              Disparar Lucas ({selectedCount})
            </Button>
          </div>
        </div>
      )}

      {/* Toolbar Superior */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou campanha..."
            value={globalFilter ?? ''}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-9 h-10 bg-white dark:bg-slate-900/50"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* Botão de Disparar Todos da Página se nenhum estiver selecionado */}
          {selectedCount === 0 && table.getRowModel().rows.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.toggleAllPageRowsSelected(true)}
              className="gap-1.5 text-xs text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 hover:bg-blue-50 dark:hover:bg-blue-950/50"
            >
              <Bot className="h-3.5 w-3.5" />
              Selecionar Página ({table.getRowModel().rows.length})
            </Button>
          )}
          <AddLeadDialog onSuccess={() => window.location.reload()} />
        </div>
      </div>

      {/* Tabela Principal */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden shadow-xs">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-900">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="border-slate-200 dark:border-slate-800">
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} className="text-xs uppercase font-semibold text-muted-foreground">
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
                  className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors border-slate-100 dark:border-slate-800"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="py-3">
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
                  className="h-28 text-center text-muted-foreground"
                >
                  Nenhum lead encontrado com os filtros atuais.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-2">
        <div className="text-xs text-muted-foreground">
          Mostrando{' '}
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}
          </span>{' '}
          a{' '}
          <span className="font-medium text-slate-900 dark:text-slate-100">
            {Math.min(
              (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
              filteredData.length
            )}
          </span>{' '}
          de <span className="font-medium text-slate-900 dark:text-slate-100">{filteredData.length}</span> leads
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            className="text-xs h-8"
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            className="text-xs h-8"
          >
            Próximo
          </Button>
        </div>
      </div>

      {/* Diálogo de Confirmação de Disparo com Fila Ordenada */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Bot className="h-5 w-5 text-blue-600" /> Confirmar Fila de Disparo Prioritário
            </DialogTitle>
            <DialogDescription>
              {singleDispatchLead ? (
                <span>
                  Você está prestes a iniciar a abordagem do Lucas para o lead{' '}
                  <strong className="text-slate-900 dark:text-slate-100">{singleDispatchLead.name}</strong> ({singleDispatchLead.contato}).
                </span>
              ) : (
                <span>
                  Você está prestes a enviar{' '}
                  <strong className="text-slate-900 dark:text-slate-100">{selectedLeadsToDispatch.length} leads</strong> para a esteira do Lucas. O n8n processará na ordem abaixo:
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          {/* Pré-visualização da Fila Ordenada por Vencimento */}
          {!singleDispatchLead && selectedLeadsToDispatch.length > 0 && (
            <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-200 dark:border-slate-800 rounded-lg p-2.5 bg-slate-50/70 dark:bg-slate-950/50">
              <p className="text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Ordem de Execução no n8n (Mais próximo ao mais distante):
              </p>
              {selectedLeadsToDispatch.map((lead, idx) => {
                const urgency = getRenewalUrgency(lead.dataRenovacao);
                return (
                  <div key={lead.id} className="flex items-center justify-between text-xs py-1 px-2 bg-white dark:bg-slate-900 rounded border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2 truncate">
                      <span className="font-mono text-[10px] text-muted-foreground w-4">{idx + 1}.</span>
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

          <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <p className="font-semibold text-slate-800 dark:text-slate-200">Garantias do Disparo Automático:</p>
            <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
              <li><strong>Prioridade Imediata:</strong> Os segurados com apólice vencendo primeiro recebem a mensagem antes.</li>
              <li><strong>Antiban Ativo:</strong> Fracionamento de balões com <code className="text-blue-600 font-mono">|||</code> e simulação de digitação.</li>
              <li><strong>Contextualização RAG:</strong> O Lucas sabe a data de renovação e argumenta com base no plano correto.</li>
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
              className="bg-blue-600 hover:bg-blue-700 text-white gap-2 font-semibold"
            >
              {isDispatching ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Disparando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" /> Confirmar e Disparar ({selectedLeadsToDispatch.length})
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Chat WhatsApp Rápido */}
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