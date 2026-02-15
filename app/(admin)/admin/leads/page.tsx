import { PrismaClient, Prisma } from '@prisma/client';
import { Card, CardContent } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, FileX } from 'lucide-react';
import Link from 'next/link';
import { SearchInput } from '@/components/ui/search-input'; // Importe o novo componente

const prisma = new PrismaClient();
const ITEMS_PER_PAGE = 15;

type Props = {
  searchParams: Promise<{ 
    page?: string;
    query?: string;
  }>;
};

export default async function AdminLeadsPage(props: Props) {
  const searchParams = await props.searchParams;
  const currentPage = Number(searchParams.page) || 1;
  const query = searchParams.query || '';
  const skip = (currentPage - 1) * ITEMS_PER_PAGE;

  // Construção do Filtro Dinâmico
  const whereClause: Prisma.LeadWhereInput = query ? {
    OR: [
      { name: { contains: query, mode: 'insensitive' } }, // Busca por nome
      { contato: { contains: query, mode: 'insensitive' } }, // Busca por telefone
      { user: { name: { contains: query, mode: 'insensitive' } } } // Busca pelo nome do corretor
    ]
  } : {};

  // Busca Otimizada em Paralelo
  const [totalLeads, leads] = await Promise.all([
    prisma.lead.count({ where: whereClause }),
    prisma.lead.findMany({
      where: whereClause,
      skip: skip,
      take: ITEMS_PER_PAGE,
      include: {
        user: { select: { name: true, email: true } },
        interestedInProduct: { select: { name: true } }
      },
      orderBy: { updatedAt: 'desc' },
    })
  ]);

  const totalPages = Math.ceil(totalLeads / ITEMS_PER_PAGE);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  return (
    <div className="h-[calc(100vh-80px)] flex flex-col space-y-4">
      {/* Header com Busca */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0 bg-white dark:bg-slate-900 p-4 rounded-lg border shadow-sm">
         <div>
            <h1 className="text-2xl font-bold tracking-tight">Gestão de Leads</h1>
            <p className="text-sm text-muted-foreground">
               Gerencie e monitore todos os leads da plataforma.
            </p>
         </div>
         <div className="flex items-center gap-2 w-full md:w-auto">
            <SearchInput placeholder="Buscar por nome, telefone ou corretor..." />
         </div>
      </div>

      {/* Área da Tabela */}
      <Card className="flex-1 flex flex-col overflow-hidden shadow-md border-slate-200 dark:border-slate-800">
        <CardContent className="p-0 flex-1 overflow-auto relative">
          <Table>
            <TableHeader className="sticky top-0 bg-slate-50 dark:bg-slate-950 z-20 border-b">
              <TableRow>
                <TableHead className="w-[30%] min-w-[200px]">Lead</TableHead>
                <TableHead className="w-[15%]">Status</TableHead>
                <TableHead className="w-[25%] hidden md:table-cell">Produto</TableHead>
                <TableHead className="w-[20%] hidden md:table-cell">Corretor</TableHead>
                <TableHead className="text-right w-[10%]">Atualização</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {leads.length > 0 ? (
                leads.map((lead) => (
                  <TableRow key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                    <TableCell>
                      <div className="font-semibold text-slate-900 dark:text-slate-100">{lead.name}</div>
                      <div className="text-xs text-muted-foreground font-mono mt-0.5">{lead.contato}</div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="secondary" 
                        className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium border-slate-200 dark:border-slate-700"
                      >
                          {lead.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-slate-600 dark:text-slate-400">
                        {lead.interestedInProduct?.name || <span className="text-slate-300 italic">Sem produto</span>}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6 ring-1 ring-slate-200 dark:ring-slate-700">
                              <AvatarFallback className="text-[10px] bg-indigo-50 text-indigo-600 font-bold">
                                  {lead.user.name?.charAt(0) || 'U'}
                              </AvatarFallback>
                          </Avatar>
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate max-w-[120px]">
                            {lead.user.name}
                          </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                      {new Date(lead.updatedAt).toLocaleDateString('pt-BR')}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                    <TableCell colSpan={5} className="h-48 text-center">
                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <FileX className="h-8 w-8 mb-2 opacity-50" />
                            <p>Nenhum lead encontrado.</p>
                            {query && <p className="text-xs mt-1">Tente buscar com outros termos.</p>}
                        </div>
                    </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>

        {/* Rodapé Fixo com Paginação e Resumo */}
        <div className="border-t p-3 flex items-center justify-between bg-white dark:bg-slate-950 shrink-0">
            <div className="text-xs text-muted-foreground hidden sm:block">
                {query ? (
                    <span>Encontrados <strong>{totalLeads}</strong> resultados para "{query}"</span>
                ) : (
                    <span>Total de <strong>{totalLeads}</strong> leads cadastrados</span>
                )}
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={!hasPrevPage}
                    asChild={hasPrevPage}
                >
                    {hasPrevPage ? (
                        <Link href={`/admin/leads?page=${currentPage - 1}&query=${query}`}>
                            <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                        </Link>
                    ) : (
                        <span className="opacity-50 cursor-not-allowed"><ChevronLeft className="h-4 w-4 mr-1" /> Anterior</span>
                    )}
                </Button>
                
                <span className="text-xs font-medium px-2 sm:hidden">
                    {currentPage} / {totalPages || 1}
                </span>

                <Button 
                    variant="outline" 
                    size="sm" 
                    disabled={!hasNextPage}
                    asChild={hasNextPage}
                >
                    {hasNextPage ? (
                        <Link href={`/admin/leads?page=${currentPage + 1}&query=${query}`}>
                            Próximo <ChevronRight className="h-4 w-4 ml-1" />
                        </Link>
                    ) : (
                        <span className="opacity-50 cursor-not-allowed">Próximo <ChevronRight className="h-4 w-4 ml-1" /></span>
                    )}
                </Button>
            </div>
        </div>
      </Card>
    </div>
  );
}