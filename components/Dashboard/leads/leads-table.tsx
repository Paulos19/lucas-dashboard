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
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  ArrowUpDown, 
  Search, 
  MessageSquare,
  CalendarClock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Link from 'next/link'; // <--- Importação adicionada
import { AddLeadDialog } from '@/components/Dashboard/add-lead-dialog';

export type Lead = {
  id: string;
  name: string;
  contato: string;
  status: string;
  updatedAt: Date;
  segmentacao?: string | null;
  interestedInProduct?: { name: string } | null;
};

// Definição das Colunas
export const columns: ColumnDef<Lead>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="-ml-4 hover:bg-transparent"
        >
          Nome do Lead
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium text-slate-900 dark:text-slate-100">
          {row.getValue('name')}
        </span>
        <span className="text-xs text-muted-foreground md:hidden">
          {row.original.contato}
        </span>
      </div>
    ),
  },
  {
    accessorKey: 'contato',
    header: 'Contato',
    cell: ({ row }) => (
      <div className="font-mono text-xs text-muted-foreground">
        {row.getValue('contato')}
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      
      const colors: Record<string, string> = {
        'ENTRANTE': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800',
        'QUALIFICADO': 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800',
        'AGENDADO_COTACAO': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800',
        'PROPOSTA_ENVIADA': 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800',
        'VENDA_REALIZADA': 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200 dark:border-green-800',
        'PERDIDO': 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800',
        'ARQUIVADO': 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700',
      };

      return (
        <Badge variant="outline" className={`${colors[status] || 'bg-gray-100'} border`}>
          {status.replace('_', ' ')}
        </Badge>
      );
    },
  },
  {
    accessorKey: 'interestedInProduct',
    header: 'Interesse',
    cell: ({ row }) => {
      const product = row.original.interestedInProduct;
      return product ? (
        <span className="text-sm truncate max-w-[150px] inline-block" title={product.name}>
          {product.name}
        </span>
      ) : (
        <span className="text-muted-foreground text-xs italic">-</span>
      );
    },
  },
  {
    accessorKey: 'updatedAt',
    header: () => <div className="text-right">Última Ação</div>,
    cell: ({ row }) => {
      return (
        <div className="text-right text-xs text-muted-foreground flex items-center justify-end gap-1">
          <CalendarClock className="h-3 w-3" />
          {formatDistanceToNow(new Date(row.getValue('updatedAt')), {
            addSuffix: true,
            locale: ptBR,
          })}
        </div>
      );
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const lead = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Abrir menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Ações</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(lead.contato)}
            >
              Copiar Telefone
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => window.open(`https://wa.me/${lead.contato}`, '_blank')}>
                <MessageSquare className="mr-2 h-4 w-4" /> Abrir WhatsApp
            </DropdownMenuItem>
            
            {/* --- MUDANÇA AQUI: Link para Detalhes --- */}
            <DropdownMenuItem asChild>
              <Link href={`/dashboard/leads/${lead.id}`} className="cursor-pointer w-full">
                Ver Detalhes
              </Link>
            </DropdownMenuItem>
            
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export function LeadsTable({ data }: { data: Lead[] }) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

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
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
            placeholder="Filtrar leads..."
            value={globalFilter ?? ''}
            onChange={(event) => setGlobalFilter(event.target.value)}
            className="pl-9 h-10 bg-white dark:bg-slate-900/50"
            />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
            <AddLeadDialog onSuccess={() => window.location.reload()} />
        </div>
      </div>

      {/* Tabela */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50 dark:bg-slate-900">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id}>
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
                  className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
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
                  className="h-24 text-center text-muted-foreground"
                >
                  Nenhum lead encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Paginação */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Próximo
        </Button>
      </div>
    </div>
  );
}