// app/(dashboard)/dashboard/products/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, DollarSign, Wrench, Loader2, Search } from 'lucide-react';
import { AddProductDialog } from '@/components/Dashboard/add-product-dialog';
import { Input } from '@/components/ui/input';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/products');
      if (res.ok) setProducts(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filtered = products.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mx-auto py-8 max-w-7xl animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-red-900 dark:text-red-100">Seguros Residenciais</h1>
            <p className="text-muted-foreground mt-1">
                Gerencie os planos da Bradesco Residencial que o Lucas irá oferecer.
            </p>
        </div>
        <AddProductDialog onSuccess={fetchProducts} />
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input 
            placeholder="Buscar plano..." 
            className="pl-10 h-10 border-red-100 focus-visible:ring-red-500" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center p-20"><Loader2 className="animate-spin text-red-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-xl border-dashed border-2">
            <Shield className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">Nenhum seguro cadastrado</h3>
            <p className="text-sm text-muted-foreground">Cadastre seu primeiro plano residencial.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((prod) => (
                <Card key={prod.id} className="group hover:shadow-lg transition-all duration-300 border-t-4 border-t-red-500">
                    <CardHeader className="pb-3 bg-gradient-to-br from-red-50 to-transparent dark:from-red-950/20">
                        <div className="flex justify-between items-start mb-2">
                            <Badge className="bg-red-600 hover:bg-red-700">Residencial</Badge>
                            <span className="text-xs text-muted-foreground font-mono">ID: {prod.id.slice(-4)}</span>
                        </div>
                        <CardTitle className="text-lg text-red-950 dark:text-red-100">{prod.name}</CardTitle>
                    </CardHeader>
                    <CardContent className="pb-3 pt-4">
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-4 h-[60px]">
                            {prod.description}
                        </p>
                        
                        <div className="space-y-2">
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                                <Wrench className="w-3 h-3" /> Assistências
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {Array.isArray(prod.assistances) && prod.assistances.slice(0, 3).map((feat: string, i: number) => (
                                    <Badge key={i} variant="secondary" className="text-[10px] bg-slate-100 dark:bg-slate-800">
                                        {feat}
                                    </Badge>
                                ))}
                                {/* CORREÇÃO AQUI: prod.assistances em vez de QN.assistances */}
                                {Array.isArray(prod.assistances) && prod.assistances.length > 3 && (
                                    <span className="text-[10px] text-muted-foreground self-center">+{prod.assistances.length - 3}</span>
                                )}
                            </div>
                        </div>
                    </CardContent>
                    <CardFooter className="pt-3 border-t bg-muted/20 flex justify-between items-center">
                        <div className="flex items-center gap-1 text-red-700 dark:text-red-300 font-bold text-lg">
                            <span className="text-xs text-muted-foreground font-normal mr-1">A partir de</span>
                            <DollarSign className="h-4 w-4" />
                            {prod.monthlyPremium.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            <span className="text-xs text-muted-foreground font-normal">/mês</span>
                        </div>
                    </CardFooter>
                </Card>
            ))}
        </div>
      )}
    </div>
  );
}