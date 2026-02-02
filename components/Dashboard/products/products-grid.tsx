'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Search, MoreVertical, Wrench, Shield, Trash2, Edit2, Loader2, Megaphone } from 'lucide-react';
import { ProductFormDialog } from './product-form-dialog';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export function ProductsGrid({ products }: { products: any[] }) {
  const [search, setSearch] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
        const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
        if (!res.ok) throw new Error();
        toast.success("Produto arquivado.");
        router.refresh();
    } catch (e) {
        toast.error("Erro ao remover produto.");
    } finally {
        setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input 
            placeholder="Buscar plano..." 
            className="pl-10 bg-white dark:bg-slate-900/50 border-red-100 dark:border-red-900/20 focus-visible:ring-red-500" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-xl border-dashed border-2">
            <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">Nenhum plano encontrado</h3>
            <p className="text-sm text-muted-foreground">Cadastre seguros para o Lucas oferecer.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((prod) => (
                <Card key={prod.id} className="group hover:shadow-lg transition-all duration-300 border-t-4 border-t-red-500 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm overflow-hidden">
                    <CardHeader className="pb-3 bg-gradient-to-b from-red-50/50 to-transparent dark:from-red-900/10 pt-5 relative">
                        <div className="flex justify-between items-start mb-2">
                            {/* Grupo de Badges */}
                            <div className="flex flex-wrap gap-2">
                                <Badge className="bg-red-100 text-red-700 hover:bg-red-200 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800">
                                    Residencial
                                </Badge>
                                
                                {/* Badge de Pós-Venda Condicional */}
                                {prod.isPostSales && (
                                    <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800 gap-1 pr-2.5">
                                        <Megaphone className="h-3 w-3" /> Pós-Venda
                                    </Badge>
                                )}
                            </div>
                            
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 text-muted-foreground hover:text-foreground">
                                        <MoreVertical className="h-4 w-4" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <ProductFormDialog 
                                        product={prod} 
                                        trigger={
                                            <DropdownMenuItem onSelect={(e) => e.preventDefault()} className="gap-2 cursor-pointer">
                                                <Edit2 className="h-4 w-4" /> Editar
                                            </DropdownMenuItem>
                                        } 
                                    />
                                    <DropdownMenuItem 
                                        className="text-red-600 gap-2 cursor-pointer focus:bg-red-50 dark:focus:bg-red-900/20"
                                        onClick={() => handleDelete(prod.id)}
                                        disabled={deletingId === prod.id}
                                    >
                                        {deletingId === prod.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                                        Excluir
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                        <CardTitle className="text-lg text-slate-900 dark:text-slate-100 font-bold leading-tight pr-4">
                            {prod.name}
                        </CardTitle>
                    </CardHeader>
                    
                    <CardContent className="pb-4 pt-4">
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-6 h-[60px]">
                            {prod.description}
                        </p>
                        
                        <div className="space-y-3">
                            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                <Wrench className="w-3 h-3" /> Inclusos
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {Array.isArray(prod.assistances) && prod.assistances.slice(0, 3).map((feat: string, i: number) => (
                                    <Badge key={i} variant="secondary" className="text-[10px] px-2 bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                                        {feat}
                                    </Badge>
                                ))}
                                {Array.isArray(prod.assistances) && prod.assistances.length > 3 && (
                                    <span className="text-[10px] text-muted-foreground self-center font-medium">+{prod.assistances.length - 3}</span>
                                )}
                            </div>
                        </div>
                    </CardContent>

                    <CardFooter className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/30">
                        <div className="text-xs text-muted-foreground">
                            Prêmio Mensal
                        </div>
                        <div className="flex items-baseline gap-1 text-red-700 dark:text-red-400 font-bold text-xl">
                            <span className="text-sm font-normal text-muted-foreground mr-0.5">R$</span>
                            {prod.monthlyPremium.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                    </CardFooter>
                </Card>
            ))}
        </div>
      )}
    </div>
  );
}