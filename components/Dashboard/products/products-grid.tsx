'use client';

import { useState, useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter 
} from '@/components/ui/dialog';
import { 
  Search, MoreVertical, Wrench, Shield, Trash2, Edit2, Loader2, 
  Megaphone, Users, LayoutGrid, List, Eye, Sparkles, Bot, 
  Layers, Check, X, ShieldAlert, ArrowUpDown, Plus, HelpCircle
} from 'lucide-react';
import { ProductFormDialog } from './product-form-dialog';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface ProductItem {
  id: string;
  name: string;
  description: string;
  monthlyPremium: number;
  assistances?: string[] | any;
  coverages?: string | any;
  status: string;
  isPostSales: boolean;
  createdAt: string | Date;
  _count?: {
    leads: number;
  };
}

export function ProductsGrid({ products }: { products: ProductItem[] }) {
  const [search, setSearch] = useState('');
  const [segmentFilter, setSegmentFilter] = useState<'ALL' | 'STANDARD' | 'POST_SALES'>('ALL');
  const [sortBy, setSortBy] = useState<'recent' | 'price_asc' | 'price_desc' | 'name_asc' | 'leads_desc'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  
  // Modais de ação
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteProduct, setConfirmDeleteProduct] = useState<ProductItem | null>(null);
  const [inspectProduct, setInspectProduct] = useState<ProductItem | null>(null);
  
  const router = useRouter();

  // Filtragem e Ordenação
  const filteredProducts = useMemo(() => {
    let list = products.filter(p => {
      // Filtro de texto
      const term = search.toLowerCase();
      const nameMatch = p.name?.toLowerCase().includes(term);
      const descMatch = p.description?.toLowerCase().includes(term);
      const coverageMatch = typeof p.coverages === 'string' && p.coverages.toLowerCase().includes(term);
      const assistMatch = Array.isArray(p.assistances) && p.assistances.some(a => String(a).toLowerCase().includes(term));
      
      const matchesSearch = !term || nameMatch || descMatch || coverageMatch || assistMatch;

      // Filtro de segmento
      let matchesSegment = true;
      if (segmentFilter === 'STANDARD') {
        matchesSegment = !p.isPostSales;
      } else if (segmentFilter === 'POST_SALES') {
        matchesSegment = p.isPostSales;
      }

      return matchesSearch && matchesSegment;
    });

    // Ordenação
    list.sort((a, b) => {
      if (sortBy === 'price_asc') return a.monthlyPremium - b.monthlyPremium;
      if (sortBy === 'price_desc') return b.monthlyPremium - a.monthlyPremium;
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'leads_desc') return (b._count?.leads || 0) - (a._count?.leads || 0);
      // 'recent'
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return list;
  }, [products, search, segmentFilter, sortBy]);

  // Contagens por aba
  const counts = useMemo(() => ({
    all: products.length,
    standard: products.filter(p => !p.isPostSales).length,
    postSales: products.filter(p => p.isPostSales).length,
  }), [products]);

  const handleDelete = async () => {
    if (!confirmDeleteProduct) return;
    const id = confirmDeleteProduct.id;
    setDeletingId(id);
    
    try {
      const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success("Plano arquivado com sucesso!");
      setConfirmDeleteProduct(null);
      router.refresh();
    } catch (e) {
      toast.error("Erro ao arquivar produto.");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Barra de Controles: Busca, Filtros, Ordenação e Visualização */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Campo de Busca com Clear Button */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400 pointer-events-none" />
          <Input 
            placeholder="Buscar por nome, cobertura, assistência ou argumento..." 
            className="pl-10 pr-9 bg-white/70 dark:bg-slate-900/60 border-slate-200/80 dark:border-slate-800/80 focus-visible:ring-blue-500 rounded-xl text-xs sm:text-sm" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {search && (
            <button 
              onClick={() => setSearch('')}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Filtros em Segmented Pill */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          
          <div className="flex p-1 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 shrink-0">
            
            <button
              onClick={() => setSegmentFilter('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                segmentFilter === 'ALL'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>Todos</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                segmentFilter === 'ALL' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {counts.all}
              </span>
            </button>

            <button
              onClick={() => setSegmentFilter('STANDARD')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                segmentFilter === 'STANDARD'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-50 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <span>Residencial Padrão</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                segmentFilter === 'STANDARD' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {counts.standard}
              </span>
            </button>

            <button
              onClick={() => setSegmentFilter('POST_SALES')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                segmentFilter === 'POST_SALES'
                  ? 'bg-white dark:bg-slate-800 text-indigo-700 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Megaphone className="w-3 h-3 text-indigo-500" />
              <span>Pós-Venda IA</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                segmentFilter === 'POST_SALES' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {counts.postSales}
              </span>
            </button>

          </div>

          {/* Seletor de Ordenação */}
          <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200 dark:border-slate-800 shrink-0">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer focus:outline-hidden pr-2"
            >
              <option value="recent" className="dark:bg-slate-900">Mais Recentes</option>
              <option value="price_asc" className="dark:bg-slate-900">Menor Preço</option>
              <option value="price_desc" className="dark:bg-slate-900">Maior Preço</option>
              <option value="name_asc" className="dark:bg-slate-900">Nome (A - Z)</option>
              <option value="leads_desc" className="dark:bg-slate-900">Mais Leads</option>
            </select>
          </div>

          {/* Alternador de Modo: Grade vs Linhas */}
          <div className="flex p-1 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              title="Visualização em Grade de Cards"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              title="Visualização em Tabela Compacta"
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                  : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

      {/* Exibição dos Produtos */}
      {filteredProducts.length === 0 ? (
        <div className="text-center py-20 px-4 glass-panel rounded-3xl border-dashed border-2 border-slate-300 dark:border-slate-800 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 flex items-center justify-center mx-auto shadow-inner">
            <Shield className="h-8 w-8" />
          </div>
          <div className="max-w-md mx-auto space-y-1">
            <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {search || segmentFilter !== 'ALL' ? 'Nenhum plano corresponde aos filtros' : 'Nenhum seguro cadastrado'}
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              {search || segmentFilter !== 'ALL'
                ? 'Tente ajustar os termos de pesquisa ou remover os filtros de segmento.'
                : 'Cadastre os planos de seguro da Bradesco para que o Lucas AI ofereça aos clientes nas conversas.'}
            </p>
          </div>
          
          <div className="pt-2">
            {search || segmentFilter !== 'ALL' ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setSearch(''); setSegmentFilter('ALL'); }}
                className="cursor-pointer text-xs"
              >
                Limpar Filtros de Busca
              </Button>
            ) : (
              <ProductFormDialog 
                trigger={
                  <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer text-xs gap-2">
                    <Plus className="w-4 h-4" /> Cadastrar Meu Primeiro Plano
                  </Button>
                }
              />
            )}
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        
        /* MODO GRADE (GLASS CARDS) */
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredProducts.map((prod) => {
            const assistancesList: string[] = Array.isArray(prod.assistances) 
              ? prod.assistances 
              : (typeof prod.assistances === 'string' ? prod.assistances.split(',').map((s: string) => s.trim()) : []);

            const coveragesText = typeof prod.coverages === 'string' ? prod.coverages : '';
            const leadsCount = prod._count?.leads || 0;

            return (
              <div 
                key={prod.id} 
                className="glass-card group relative p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-500/40 transition-all duration-300 flex flex-col justify-between overflow-hidden"
              >
                {/* Glow decorativo no hover */}
                <div className="absolute -top-16 -right-16 w-36 h-36 bg-blue-500/10 rounded-full blur-2xl group-hover:bg-blue-500/20 transition-all duration-500 pointer-events-none" />

                <div className="space-y-4">
                  {/* Linha de Badges e Menu Superior */}
                  <div className="flex justify-between items-start gap-2">
                    
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Badge de Categoria */}
                      <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/80 font-semibold text-[11px] px-2.5 py-0.5">
                        <Layers className="w-3 h-3 mr-1" />
                        Residencial
                      </Badge>
                      
                      {/* Badge de Pós-Venda */}
                      {prod.isPostSales && (
                        <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/80 font-semibold text-[11px] px-2.5 py-0.5 gap-1">
                          <Megaphone className="h-3 w-3 animate-pulse" /> Pós-Venda IA
                        </Badge>
                      )}
                    </div>
                    
                    {/* Menu de Ações */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem 
                          onClick={() => setInspectProduct(prod)}
                          className="gap-2 text-xs cursor-pointer font-medium"
                        >
                          <Eye className="h-3.5 w-3.5 text-blue-500" /> Ver Dossiê & RAG
                        </DropdownMenuItem>

                        <ProductFormDialog 
                          product={prod} 
                          trigger={
                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="gap-2 text-xs cursor-pointer font-medium">
                              <Edit2 className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" /> Editar Plano
                            </DropdownMenuItem>
                          } 
                        />

                        <DropdownMenuSeparator />

                        <DropdownMenuItem 
                          className="text-rose-600 dark:text-rose-400 gap-2 text-xs cursor-pointer font-medium focus:bg-rose-50 dark:focus:bg-rose-950/30"
                          onClick={() => setConfirmDeleteProduct(prod)}
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Arquivar Plano
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>

                  </div>

                  {/* Nome do Seguro e Leads Vinculados */}
                  <div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {prod.name}
                    </h3>
                    
                    {leadsCount > 0 && (
                      <div className="inline-flex items-center gap-1.5 mt-1.5 px-2 py-0.5 rounded-md text-[11px] font-medium bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300 border border-cyan-200/60 dark:border-cyan-800/60">
                        <Users className="w-3 h-3" />
                        <span>{leadsCount} {leadsCount === 1 ? 'lead interessado' : 'leads interessados'}</span>
                      </div>
                    )}
                  </div>

                  {/* Card RAG IA (Argumento de Venda) */}
                  <div className="p-3 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 space-y-1">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Bot className="w-3.5 h-3.5 text-blue-500" />
                        <span>Argumentos do Lucas AI</span>
                      </div>
                      <button 
                        onClick={() => setInspectProduct(prod)}
                        className="text-blue-600 dark:text-blue-400 hover:underline text-[10px] cursor-pointer"
                      >
                        Ver completo
                      </button>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                      {prod.description}
                    </p>
                  </div>

                  {/* Coberturas Resumidas */}
                  {coveragesText && (
                    <div className="text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2">
                      <Shield className="w-3.5 h-3.5 text-blue-500 shrink-0 mt-0.5" />
                      <span className="line-clamp-1">
                        <strong className="font-semibold text-slate-700 dark:text-slate-300">Coberturas:</strong> {coveragesText}
                      </span>
                    </div>
                  )}

                  {/* Assistências Inclusas */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Wrench className="w-3 h-3 text-slate-400" /> 
                      <span>Assistências ({assistancesList.length})</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {assistancesList.slice(0, 3).map((feat, i) => (
                        <Badge 
                          key={i} 
                          variant="secondary" 
                          className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-700 dark:bg-slate-800/70 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60 font-medium"
                        >
                          {feat}
                        </Badge>
                      ))}
                      {assistancesList.length > 3 && (
                        <button 
                          onClick={() => setInspectProduct(prod)}
                          className="text-[10px] text-blue-600 dark:text-blue-400 self-center font-semibold hover:underline cursor-pointer px-1"
                        >
                          +{assistancesList.length - 3} mais
                        </button>
                      )}
                    </div>
                  </div>

                </div>

                {/* Footer do Card com Prêmio Mensal e Botões */}
                <div className="pt-4 mt-5 border-t border-slate-200/60 dark:border-slate-800/60 flex justify-between items-center">
                  <div>
                    <div className="text-[10px] uppercase font-semibold tracking-wider text-slate-400">
                      Prêmio Mensal
                    </div>
                    <div className="flex items-baseline gap-1 text-slate-900 dark:text-slate-50 font-black text-2xl tracking-tight">
                      <span className="text-xs font-semibold text-slate-400">R$</span>
                      <span>{prod.monthlyPremium?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="text-[10px] font-normal text-slate-400">/mês</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => setInspectProduct(prod)}
                      className="text-xs text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer h-8 px-2.5"
                    >
                      <Eye className="w-3.5 h-3.5 mr-1" />
                      Dossiê
                    </Button>
                    
                    <ProductFormDialog 
                      product={prod} 
                      trigger={
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-xs border-slate-200 dark:border-slate-800 hover:border-blue-500/50 cursor-pointer h-8 px-2.5"
                        >
                          <Edit2 className="w-3.5 h-3.5 mr-1" />
                          Editar
                        </Button>
                      } 
                    />
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      ) : (

        /* MODO TABELA COMPACTA (LIST ROWS) */
        <div className="glass-panel rounded-3xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/70 dark:bg-slate-900/50 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <th className="py-3.5 px-6">Plano de Seguro</th>
                  <th className="py-3.5 px-4">Segmento</th>
                  <th className="py-3.5 px-4">Prêmio Mensal</th>
                  <th className="py-3.5 px-4">Assistências & Coberturas</th>
                  <th className="py-3.5 px-4">Leads</th>
                  <th className="py-3.5 px-6 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/60 dark:divide-slate-800/60 text-xs">
                {filteredProducts.map((prod) => {
                  const assistancesList: string[] = Array.isArray(prod.assistances) 
                    ? prod.assistances 
                    : (typeof prod.assistances === 'string' ? prod.assistances.split(',').map((s: string) => s.trim()) : []);

                  return (
                    <tr key={prod.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                      
                      {/* Nome e RAG */}
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                          {prod.name}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1 max-w-sm mt-0.5">
                          {prod.description}
                        </div>
                      </td>

                      {/* Badges de Tipo */}
                      <td className="py-4 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span className="inline-flex items-center text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-md border border-blue-200/60 dark:border-blue-800/60">
                            Residencial
                          </span>
                          {prod.isPostSales && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md border border-indigo-200/60 dark:border-indigo-800/60">
                              <Megaphone className="w-2.5 h-2.5" /> Pós-Venda
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Preço */}
                      <td className="py-4 px-4 font-bold text-slate-900 dark:text-slate-100 text-sm">
                        R$ {prod.monthlyPremium?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        <span className="text-[10px] font-normal text-slate-400 block">por mês</span>
                      </td>

                      {/* Coberturas & Assistências */}
                      <td className="py-4 px-4 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {assistancesList.slice(0, 2).map((a, i) => (
                            <span key={i} className="text-[10px] px-1.5 py-0.2 rounded-sm bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                              {a}
                            </span>
                          ))}
                          {assistancesList.length > 2 && (
                            <span className="text-[10px] text-slate-400">+{assistancesList.length - 2}</span>
                          )}
                        </div>
                      </td>

                      {/* Leads Vinculados */}
                      <td className="py-4 px-4">
                        <div className="inline-flex items-center gap-1 text-slate-700 dark:text-slate-300 font-semibold text-xs">
                          <Users className="w-3.5 h-3.5 text-cyan-500" />
                          <span>{prod._count?.leads || 0}</span>
                        </div>
                      </td>

                      {/* Ações */}
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setInspectProduct(prod)}
                            title="Ver Dossiê e RAG"
                            className="h-8 w-8 text-slate-500 hover:text-blue-600 cursor-pointer"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>

                          <ProductFormDialog 
                            product={prod} 
                            trigger={
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                title="Editar Plano"
                                className="h-8 w-8 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                            } 
                          />

                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setConfirmDeleteProduct(prod)}
                            title="Arquivar Plano"
                            className="h-8 w-8 text-slate-400 hover:text-rose-600 cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

      )}

      {/* DIALOG: DOSSIÊ COMPLETO DO PRODUTO / RAG DA IA */}
      <Dialog open={!!inspectProduct} onOpenChange={(open) => !open && setInspectProduct(null)}>
        <DialogContent className="sm:max-w-[620px] p-0 overflow-hidden border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl">
          {inspectProduct && (
            <div className="flex flex-col">
              
              {/* Header do Dossiê */}
              <div className="p-6 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 space-y-3">
                <div className="flex justify-between items-start gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className="bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/80 text-[10px]">
                        Residencial
                      </Badge>
                      {inspectProduct.isPostSales && (
                        <Badge className="bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200/80 dark:border-indigo-800/80 text-[10px] gap-1">
                          <Megaphone className="h-2.5 w-2.5" /> Pós-Venda Automático
                        </Badge>
                      )}
                    </div>
                    <DialogTitle className="text-2xl font-black text-slate-900 dark:text-slate-50">
                      {inspectProduct.name}
                    </DialogTitle>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-[10px] uppercase font-semibold text-slate-400">Prêmio Mensal</div>
                    <div className="text-2xl font-black text-blue-600 dark:text-blue-400">
                      R$ {inspectProduct.monthlyPremium?.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      <span className="text-xs font-normal text-slate-400">/mês</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Corpo do Dossiê */}
              <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
                
                {/* Seção RAG IA */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Bot className="w-4 h-4 text-blue-500" />
                    <span>Argumentos de Venda (Base de Conhecimento RAG do Lucas AI)</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/70 dark:border-blue-800/60 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {inspectProduct.description}
                  </div>
                </div>

                {/* Coberturas */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Shield className="w-4 h-4 text-emerald-500" />
                    <span>Coberturas Inclusas</span>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200/70 dark:border-slate-800/70 text-xs text-slate-700 dark:text-slate-300">
                    {inspectProduct.coverages ? String(inspectProduct.coverages) : 'Nenhuma cobertura específica discriminada.'}
                  </div>
                </div>

                {/* Assistências Inclusas */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200">
                    <Wrench className="w-4 h-4 text-indigo-500" />
                    <span>Serviços e Assistências Cadastradas</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Array.isArray(inspectProduct.assistances) && inspectProduct.assistances.length > 0 ? (
                      inspectProduct.assistances.map((item: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-medium text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{item}</span>
                        </div>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">Nenhuma assistência cadastrada.</span>
                    )}
                  </div>
                </div>

                {/* Leads Vinculados */}
                <div className="p-3.5 rounded-2xl bg-cyan-50/50 dark:bg-cyan-950/20 border border-cyan-200/60 dark:border-cyan-800/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Users className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
                    <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                      Total de segurados com este plano no funil
                    </span>
                  </div>
                  <span className="text-sm font-bold text-cyan-700 dark:text-cyan-300">
                    {inspectProduct._count?.leads || 0} leads
                  </span>
                </div>

              </div>

              {/* Footer do Dossiê */}
              <div className="p-4 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-between">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setInspectProduct(null)}
                  className="cursor-pointer text-xs"
                >
                  Fechar
                </Button>

                <ProductFormDialog 
                  product={inspectProduct} 
                  onSuccess={() => setInspectProduct(null)}
                  trigger={
                    <Button 
                      size="sm" 
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white cursor-pointer text-xs gap-1.5"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Editar este Plano
                    </Button>
                  } 
                />
              </div>

            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* DIALOG DE CONFIRMAÇÃO PARA ARQUIVAR/EXCLUIR */}
      <Dialog open={!!confirmDeleteProduct} onOpenChange={(open) => !open && setConfirmDeleteProduct(null)}>
        <DialogContent className="sm:max-w-[420px] p-6 border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl">
          <div className="space-y-4 text-center sm:text-left">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20 flex items-center justify-center mx-auto sm:mx-0">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div className="space-y-1">
              <DialogTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                Arquivar Plano de Seguro?
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                Tem certeza que deseja arquivar o plano <strong className="text-slate-800 dark:text-slate-200">"{confirmDeleteProduct?.name}"</strong>? Ele deixará de ser oferecido pelo Lucas AI nas conversas. Os leads já vinculados continuarão com seu histórico preservado.
              </p>
            </div>

            <DialogFooter className="pt-2 flex items-center justify-end gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setConfirmDeleteProduct(null)}
                disabled={!!deletingId}
                className="cursor-pointer text-xs"
              >
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                size="sm"
                onClick={handleDelete}
                disabled={!!deletingId}
                className="bg-rose-600 hover:bg-rose-700 text-white cursor-pointer text-xs gap-1.5"
              >
                {deletingId ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Arquivando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Sim, Arquivar</span>
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
}