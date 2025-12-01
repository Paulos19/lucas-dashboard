// app/(dashboard)/dashboard/properties/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MapPin, DollarSign, Home, Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { AddPropertyDialog } from '@/components/Dashboard/add-property-dialog';

export default function PropertiesPage() {
  const [properties, setProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchProperties = async () => {
    try {
      const res = await fetch('/api/properties');
      if (res.ok) setProperties(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const filtered = properties.filter(p => 
    p.title.toLowerCase().includes(search.toLowerCase()) || 
    p.location.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mx-auto py-8 max-w-7xl animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-blue-900 dark:text-blue-100">Meus Imóveis</h1>
            <p className="text-muted-foreground mt-1">
                Estes são os imóveis que o Lucas usará para ofertar aos leads.
            </p>
        </div>
        <AddPropertyDialog onSuccess={fetchProperties} />
      </div>

      {/* Filtros */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input 
            placeholder="Buscar por título ou localização..." 
            className="pl-10 h-10" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-xl border-dashed border-2">
            <Home className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">Nenhum imóvel encontrado</h3>
            <p className="text-sm text-muted-foreground">Cadastre seu primeiro imóvel para começar.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((prop) => (
                <Card key={prop.id} className="group hover:shadow-lg transition-all duration-300 border-t-4 border-t-blue-500">
                    <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                            <Badge variant="outline" className={prop.status === 'AVAILABLE' ? "bg-green-100 text-green-700 border-green-200" : "bg-gray-100"}>
                                {prop.status === 'AVAILABLE' ? 'Disponível' : prop.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground font-mono">ID: {prop.id.slice(-4)}</span>
                        </div>
                        <CardTitle className="text-lg line-clamp-1 group-hover:text-blue-600 transition-colors">{prop.title}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {prop.location}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pb-3">
                        <p className="text-sm text-muted-foreground line-clamp-3 mb-4 h-[60px]">
                            {prop.description}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {/* Renderiza tags se houver */}
                            {Array.isArray(prop.features) && prop.features.slice(0, 3).map((feat: string, i: number) => (
                                <Badge key={i} variant="secondary" className="text-[10px] bg-slate-100 dark:bg-slate-800">
                                    {feat}
                                </Badge>
                            ))}
                            {Array.isArray(prop.features) && prop.features.length > 3 && (
                                <span className="text-[10px] text-muted-foreground self-center">+{prop.features.length - 3}</span>
                            )}
                        </div>
                    </CardContent>
                    <CardFooter className="pt-3 border-t bg-muted/20 flex justify-between items-center">
                        <div className="flex items-center gap-1 text-blue-700 dark:text-blue-300 font-bold text-lg">
                            <DollarSign className="h-4 w-4" />
                            {prop.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </div>
                        <Button variant="ghost" size="sm" className="text-xs">Detalhes</Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
      )}
    </div>
  );
}