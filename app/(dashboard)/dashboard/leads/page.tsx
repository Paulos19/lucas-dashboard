// app/(dashboard)/dashboard/leads/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2, MessageSquare, Phone, User, CalendarClock } from 'lucide-react';
import { AddLeadDialog } from '@/components/Dashboard/add-lead-dialog';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function LeadsPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchLeads = async () => {
    try {
      const res = await fetch('/api/leads');
      if (res.ok) setLeads(await res.json());
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, []);

  // Filtra leads pelo nome ou telefone
  const filtered = leads.filter(lead => 
    lead.name.toLowerCase().includes(search.toLowerCase()) || 
    lead.contato.includes(search)
  );

  // Função para definir a cor do badge de status
  const getStatusColor = (status: string) => {
    switch (status) {
        case 'ENTRANTE': return 'bg-blue-100 text-blue-700 border-blue-200';
        case 'QUALIFICADO': return 'bg-purple-100 text-purple-700 border-purple-200';
        case 'AGENDADO_COTACAO': return 'bg-amber-100 text-amber-700 border-amber-200';
        case 'PROPOSTA_ENVIADA': return 'bg-orange-100 text-orange-700 border-orange-200';
        case 'VENDA_REALIZADA': return 'bg-green-100 text-green-700 border-green-200';
        case 'PERDIDO': return 'bg-red-100 text-red-700 border-red-200';
        default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-7xl animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">Gestão de Leads</h1>
            <p className="text-muted-foreground mt-1">
                Acompanhe o progresso do Lucas com seus clientes.
            </p>
        </div>
        <AddLeadDialog onSuccess={fetchLeads} />
      </div>

      {/* Barra de Pesquisa */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <Input 
            placeholder="Buscar por nome ou telefone..." 
            className="pl-10 h-10" 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center p-20"><Loader2 className="animate-spin text-blue-600" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 bg-muted/30 rounded-xl border-dashed border-2">
            <User className="h-10 w-10 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-medium">Nenhum lead encontrado</h3>
            <p className="text-sm text-muted-foreground">Cadastre um novo lead para o Lucas iniciar o atendimento.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((lead) => (
                <Card key={lead.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                        <div className="flex justify-between items-start">
                            <Badge variant="outline" className={getStatusColor(lead.status)}>
                                {lead.status.replace('_', ' ')}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                <CalendarClock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true, locale: ptBR })}
                            </span>
                        </div>
                        <CardTitle className="text-lg mt-2 truncate">{lead.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1 font-mono text-xs">
                            <Phone className="h-3 w-3" /> {lead.contato}
                        </CardDescription>
                    </CardHeader>
                    
                    <CardContent className="pb-3 text-sm space-y-2">
                        {lead.segmentacao && lead.segmentacao !== 'ENTRANTE' && (
                            <div className="flex justify-between border-b pb-1">
                                <span className="text-muted-foreground">Perfil:</span>
                                <span className="font-medium">{lead.segmentacao}</span>
                            </div>
                        )}
                        {lead.interestedInProduct && (
                            <div className="flex justify-between border-b pb-1">
                                <span className="text-muted-foreground">Interesse:</span>
                                <span className="font-medium truncate max-w-[150px]">{lead.interestedInProduct.name}</span>
                            </div>
                        )}
                        {lead.classificacao && (
                             <p className="text-xs text-muted-foreground italic mt-2 line-clamp-2 bg-slate-50 p-2 rounded">
                                "{lead.classificacao}"
                             </p>
                        )}
                    </CardContent>

                    <CardFooter className="pt-2 flex justify-between items-center">
                        <Button variant="ghost" size="sm" className="text-xs gap-1 w-full" onClick={() => window.open(`https://wa.me/${lead.contato}`, '_blank')}>
                            <MessageSquare className="h-3 w-3" /> Abrir WhatsApp
                        </Button>
                    </CardFooter>
                </Card>
            ))}
        </div>
      )}
    </div>
  );
}