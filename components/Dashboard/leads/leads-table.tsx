'use client';

import { useState } from 'react';
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
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link';
import { toast } from 'sonner';
import { AddLeadDialog } from '@/components/Dashboard/add-lead-dialog';

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
};

interface LeadsTableProps {
  data: Lead[];
}

export function LeadsTable({ data }: LeadsTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  
  // Estados para Disparo
  const [isDispatching, setIsDispatching] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [singleDispatchLead, setSingleDispatchLead] = useState<Lead | null>(null);

  // Executa o disparo para uma lista de IDs
  const executeDispatch = async (leadIds: string[]) => {
    if (leadIds.length === 0) return;

    setIsDispatching(true);
    const toastId = toast.loading(`Iniciando disparo com Lucas para ${leadIds.length} lead(s)...`);

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
      toast.success(`Sucesso! ${result.dispatchedCount} lead(s) enviados para a automação do Lucas.`);
      
      setRowSelection({});
      setConfirmDialogOpen(false);
      setSingleDispatchLead(null);
      
      // Recarrega para atualizar status visual
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

  const columns: ColumnDef<Lead>[] = [
    // 1. Coluna de Seleção com Checkbox
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
    // 2. Nome do Lead & Telefone
    {
      accessorKey: 'name',
      header: ({ column }) => (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4 hover:bg-transparent font-semibold"
        >
          Nome do Lead
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => (
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {row.getValue('name')}
            </span>
            {row.original.firstContactSent && (
              <span className="inline-flex items-center gap-0.5 text-[10px] bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.2 rounded font-medium">
                <CheckCircle2 className="h-2.5 w-2.5" /> Abordado
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
    // 3. Ramo / Produto & Campanha
    {
      accessorKey: 'ramo',
      header: 'Ramo / Campanha',
      cell: ({ row }) => {
        const ramo = row.original.ramo;
        const product = row.original.interestedInProduct?.name;
        const display = ramo || product || '-';
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
                className="text-[10px] text-muted-foreground truncate max-w-[150px] mt-0.5"
                title={row.original.campanha}
              >
                {row.original.campanha}
              </span>
            )}
          </div>
        );
      },
    },
    // 4. Status do Funil
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
    // 5. Data de Renovação
    {
      accessorKey: 'dataRenovacao',
      header: 'Vencimento',
      cell: ({ row }) => {
        const data = row.original.dataRenovacao;
        if (!data) return <span className="text-muted-foreground text-xs italic">-</span>;
        return (
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            {new Date(data).toLocaleDateString('pt-BR')}
          </span>
        );
      },
    },
    // 6. Última Ação
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
            {/* Botão de Disparo Individual Rápido */}
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50 gap-1"
              onClick={() => {
                setSingleDispatchLead(lead);
                setConfirmDialogOpen(true);
              }}
              title="Disparar abordagem com IA (Lucas)"
            >
              <Bot className="h-3.5 w-3.5" />
              <span className="hidden xl:inline">Disparar</span>
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
                  <MessageSquare className="mr-2 h-4 w-4 text-green-600" /> Abrir no WhatsApp
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
    data,
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
  });

  const selectedRows = table.getSelectedRowModel().rows;
  const selectedCount = selectedRows.length;

  return (
    <div className="space-y-4">
      
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
                Pronto para iniciar o disparo inteligente com Lucas no WhatsApp.
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
                  Nenhum lead encontrado.
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
              data.length
            )}
          </span>{' '}
          de <span className="font-medium text-slate-900 dark:text-slate-100">{data.length}</span> leads
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

      {/* Diálogo de Confirmação de Disparo */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900 dark:text-slate-100">
              <Bot className="h-5 w-5 text-blue-600" /> Confirmar Disparo com IA
            </DialogTitle>
            <DialogDescription>
              {singleDispatchLead ? (
                <span>
                  Você está prestes a iniciar a abordagem automática do Lucas para o lead{' '}
                  <strong className="text-slate-900 dark:text-slate-100">{singleDispatchLead.name}</strong> ({singleDispatchLead.contato}).
                </span>
              ) : (
                <span>
                  Você está prestes a enviar{' '}
                  <strong className="text-slate-900 dark:text-slate-100">{selectedCount} leads selecionados</strong> para a esteira de disparo inteligente do Lucas.
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs space-y-2">
            <p className="font-semibold text-slate-800 dark:text-slate-200">Como funciona o disparo:</p>
            <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
              <li>O Lucas personalizará a mensagem com base na campanha e vencimento da apólice.</li>
              <li>As mensagens serão enviadas de forma fracionada com simulação de digitação antiban.</li>
              <li>Quando o cliente responder, o Lucas dará continuidade ao atendimento.</li>
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
                  const ids = selectedRows.map((r) => r.original.id);
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