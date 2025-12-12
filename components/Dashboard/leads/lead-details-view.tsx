'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'; // Instalar se não tiver
import { 
  Phone, Calendar, Mail, MapPin, Trash2, Edit, ArrowLeft, 
  MessageSquare, User, FileText, Activity 
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { LeadFormDialog } from './lead-form-dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface LeadDetailsViewProps {
  lead: any;
}

export function LeadDetailsView({ lead }: LeadDetailsViewProps) {
  const router = useRouter();

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja excluir este lead? Essa ação não pode ser desfeita.')) return;

    try {
      const res = await fetch(`/api/leads/${lead.id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Lead excluído.');
        router.push('/dashboard/leads');
        router.refresh();
      } else {
        throw new Error();
      }
    } catch (e) {
      toast.error('Erro ao excluir.');
    }
  };

  const getStatusColor = (status: string) => {
    // Reutilizar lógica de cores ou importar de um utilitário
    const map: any = {
        'ENTRANTE': 'bg-blue-500',
        'QUALIFICADO': 'bg-purple-500',
        'VENDA_REALIZADA': 'bg-green-500',
        'PERDIDO': 'bg-red-500'
    };
    return map[status] || 'bg-slate-500';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* Navegação e Ações */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Button variant="ghost" className="pl-0 gap-2 hover:bg-transparent hover:text-blue-600" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" /> Voltar para lista
        </Button>
        <div className="flex gap-2">
            <Button variant="destructive" size="sm" className="gap-2" onClick={handleDelete}>
                <Trash2 className="h-4 w-4" /> Excluir
            </Button>
            <LeadFormDialog 
                lead={lead} 
                trigger={
                    <Button variant="outline" size="sm" className="gap-2">
                        <Edit className="h-4 w-4" /> Editar
                    </Button>
                } 
            />
        </div>
      </div>

      {/* Cabeçalho do Lead */}
      <div className="flex flex-col md:flex-row gap-6 items-start bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
        <Avatar className="h-24 w-24 border-4 border-slate-50 dark:border-slate-800">
            <AvatarFallback className="text-3xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white">
                {lead.name.substring(0, 2).toUpperCase()}
            </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{lead.name}</h1>
                <Badge className={`${getStatusColor(lead.status)} text-white border-0`}>
                    {lead.status.replace('_', ' ')}
                </Badge>
                {lead.segmentacao && (
                    <Badge variant="outline" className="text-muted-foreground">
                        {lead.segmentacao}
                    </Badge>
                )}
            </div>
            
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                <div className="flex items-center gap-1.5">
                    <Phone className="h-4 w-4" /> {lead.contato}
                </div>
                <div className="flex items-center gap-1.5">
                    <Calendar className="h-4 w-4" /> 
                    Criado {formatDistanceToNow(new Date(lead.createdAt), { addSuffix: true, locale: ptBR })}
                </div>
                {lead.interestedInProduct && (
                    <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                        <Activity className="h-4 w-4" /> Interesse: {lead.interestedInProduct.name}
                    </div>
                )}
            </div>
        </div>

        <div className="w-full md:w-auto flex flex-col gap-2">
            <Button className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={() => window.open(`https://wa.me/${lead.contato}`, '_blank')}>
                <MessageSquare className="h-4 w-4" /> Conversar no WhatsApp
            </Button>
        </div>
      </div>

      {/* Conteúdo Principal (Tabs) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Coluna Esquerda - Informações Rápidas */}
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Detalhes do Cliente</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div>
                        <span className="text-muted-foreground block mb-1">Classificação IA</span>
                        <p className="font-medium">{lead.classificacao || "Ainda não classificado"}</p>
                    </div>
                    <div className="h-px bg-slate-100 dark:bg-slate-800" />
                    <div>
                        <span className="text-muted-foreground block mb-1">Potencial (Estimado)</span>
                        <p className="font-medium text-lg text-green-600 dark:text-green-400">
                            {lead.faturamentoEstimado ? `R$ ${lead.faturamentoEstimado}` : "Não informado"}
                        </p>
                    </div>
                    <div className="h-px bg-slate-100 dark:bg-slate-800" />
                    <div>
                        <span className="text-muted-foreground block mb-1">Atividade Principal</span>
                        <p className="font-medium">{lead.atividadePrincipal || "-"}</p>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Coluna Direita - Histórico e IA */}
        <div className="lg:col-span-2">
            <Tabs defaultValue="resumo" className="w-full">
                <TabsList className="w-full justify-start bg-transparent border-b rounded-none h-auto p-0 mb-4 gap-6">
                    <TabsTrigger value="resumo" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-0 pb-2">
                        Resumo IA
                    </TabsTrigger>
                    <TabsTrigger value="historico" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-0 pb-2">
                        Histórico Completo
                    </TabsTrigger>
                    <TabsTrigger value="dados" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-600 data-[state=active]:bg-transparent px-0 pb-2">
                        Dados Coletados
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="resumo">
                    <Card className="border-none shadow-sm bg-blue-50/50 dark:bg-blue-900/10">
                        <CardHeader>
                            <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
                                <FileText className="h-5 w-5" /> Resumo da Conversa
                            </CardTitle>
                            <CardDescription>Gerado automaticamente pelo Lucas com base no WhatsApp.</CardDescription>
                        </CardHeader>
                        <CardContent className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                            {lead.resumoDaConversa || "Nenhum resumo gerado ainda. Inicie uma conversa para que a IA possa analisar o perfil do cliente."}
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="historico">
                    <Card>
                        <CardContent className="pt-6">
                            {/* Aqui você renderizaria lead.historicoCompleto (array de mensagens) */}
                            <div className="text-center py-10 text-muted-foreground">
                                <MessageSquare className="h-10 w-10 mx-auto mb-3 opacity-20" />
                                <p>Histórico de mensagens detalhado em breve.</p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="dados">
                    <Card>
                        <CardHeader>
                            <CardTitle>Dados Dinâmicos</CardTitle>
                            <CardDescription>Respostas capturadas durante a qualificação.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <pre className="bg-slate-950 text-slate-50 p-4 rounded-lg overflow-x-auto text-xs">
                                {JSON.stringify(lead.dynamicData || {}, null, 2)}
                            </pre>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
      </div>
    </div>
  );
}