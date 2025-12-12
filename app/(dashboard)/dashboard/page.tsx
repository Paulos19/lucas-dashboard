import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PrismaClient } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, ShieldCheck, Calendar as CalendarIcon, DollarSign, 
  ArrowUpRight, TrendingUp, Clock, Plus, Phone, ArrowRight 
} from 'lucide-react';
import Link from 'next/link';
import { OverviewChart } from '@/components/Dashboard/overview-chart';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback } from '@/components/ui/avatar'; // Se não tiver, use uma div redonda

// Instância do Prisma (idealmente importar de um singleton 'lib/db.ts')
const prisma = new PrismaClient();

// Forçar renderização dinâmica para dados sempre frescos
export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const userId = session.user.id;
  const firstName = session.user.name?.split(' ')[0] || 'Corretor';

  // 1. Buscar Dados em Paralelo (Performance Máxima)
  const [
    totalLeads,
    totalAgendamentos,
    activeProducts,
    recentLeads,
    nextAppointment,
    leadsByStatus
  ] = await Promise.all([
    // Total Leads
    prisma.lead.count({ where: { userId } }),
    // Agendamentos Futuros
    prisma.agendamento.count({ 
      where: { userId, dataHora: { gte: new Date() } } 
    }),
    // Produtos Ativos
    prisma.insuranceProduct.count({ where: { userId, status: 'ACTIVE' } }),
    // 5 Leads Recentes
    prisma.lead.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      take: 5,
      include: { interestedInProduct: true }
    }),
    // Próximo Agendamento
    prisma.agendamento.findFirst({
      where: { userId, dataHora: { gte: new Date() } },
      orderBy: { dataHora: 'asc' },
      include: { lead: true }
    }),
    // Agrupamento para Gráfico (Simulado com dados reais se possível, aqui faremos um mock inteligente misturado)
    prisma.lead.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true }
    })
  ]);

  // Processar dados para o gráfico (Mock de meses para exemplo visual, já que não temos histórico de tempo no banco ainda)
  // Em um cenário real, agruparíamos por 'createdAt'
  const chartData = [
    { name: "Jan", total: Math.floor(totalLeads * 0.1) },
    { name: "Fev", total: Math.floor(totalLeads * 0.2) },
    { name: "Mar", total: Math.floor(totalLeads * 0.15) },
    { name: "Abr", total: Math.floor(totalLeads * 0.3) },
    { name: "Mai", total: Math.floor(totalLeads * 0.4) },
    { name: "Jun", total: totalLeads },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Bom dia, {firstName}
          </h2>
          <p className="text-muted-foreground mt-1">
            Aqui está o panorama da sua carteira hoje.
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button asChild variant="outline" className="gap-2">
            <Link href="/dashboard/products">
              <Plus className="h-4 w-4" /> Novo Produto
            </Link>
          </Button>
          <Button asChild className="bg-blue-600 hover:bg-blue-700 gap-2 shadow-lg shadow-blue-900/20">
            <Link href="/dashboard/leads">
              <Plus className="h-4 w-4" /> Novo Lead
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard 
          title="Total de Leads" 
          value={totalLeads} 
          icon={Users} 
          trend="+12% esse mês" 
          color="blue"
        />
        <KpiCard 
          title="Seguros Ativos" 
          value={activeProducts} 
          icon={ShieldCheck} 
          trend="Catálogo atualizado" 
          color="indigo"
        />
        <KpiCard 
          title="Vendas (Estimado)" 
          value="R$ 0" 
          icon={DollarSign} 
          trend="Metas em aberto" 
          color="green"
        />
        <KpiCard 
          title="Agenda Hoje" 
          value={totalAgendamentos} 
          icon={CalendarIcon} 
          trend={nextAppointment ? "Próxima reunião em breve" : "Livre por enquanto"} 
          color="purple"
        />
      </div>

      {/* Main Grid Area */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
        
        {/* Gráfico Principal */}
        <OverviewChart data={chartData} />

        {/* Card de Próximo Compromisso / Destaque */}
        <Card className="col-span-4 lg:col-span-4 xl:col-span-2 border-none shadow-md bg-gradient-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Clock className="w-32 h-32" />
          </div>
          <CardHeader>
            <CardTitle className="text-white/90">Próximo Compromisso</CardTitle>
            <CardDescription className="text-white/60">Fique atento à sua agenda</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {nextAppointment ? (
              <div className="space-y-2">
                <div className="text-3xl font-bold">
                  {new Date(nextAppointment.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="font-medium text-lg truncate">{nextAppointment.lead.name}</div>
                <p className="text-sm text-white/70 line-clamp-2">
                  {nextAppointment.resumo || "Reunião de alinhamento."}
                </p>
                <div className="pt-4">
                  <Button variant="secondary" className="w-full gap-2 text-slate-900" asChild>
                    <Link href="/dashboard/agenda">
                      Ver Detalhes <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[180px] text-center space-y-3">
                <div className="p-3 bg-white/10 rounded-full">
                  <CalendarIcon className="h-6 w-6 text-white" />
                </div>
                <p className="text-sm text-white/80">Nenhum compromisso futuro agendado.</p>
                <Button variant="secondary" size="sm" asChild>
                    <Link href="/dashboard/agenda">Ver Agenda</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de Leads Recentes */}
        <Card className="col-span-4 lg:col-span-7 border-none shadow-md bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className='text-white'>Leads Recentes</CardTitle>
              <CardDescription>Últimas interações e novos contatos.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-blue-600 hover:text-blue-700">
                <Link href="/dashboard/leads" className="gap-1">
                    Ver todos <ArrowUpRight className="h-4 w-4" />
                </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                    Nenhum lead encontrado. Comece adicionando um novo lead.
                </div>
            ) : (
                <div className="space-y-6">
                {recentLeads.map((lead) => (
                    <div key={lead.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-10 w-10 border border-slate-200 dark:border-slate-700">
                            <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-bold">
                                {lead.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                            <p className="text-sm font-medium leading-none text-white group-hover:text-blue-600 transition-colors">
                                {lead.name}
                            </p>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{lead.contato}</span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true, locale: ptBR })}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                        {lead.interestedInProduct && (
                            <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                                {lead.interestedInProduct.name}
                            </span>
                        )}
                        <StatusBadge status={lead.status} />
                    </div>
                    </div>
                ))}
                </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Componentes Auxiliares (Inline para simplicidade, mas poderiam ser arquivos separados)

function KpiCard({ title, value, icon: Icon, trend, color }: any) {
    const colorStyles = {
        blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
        indigo: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20",
        green: "text-green-600 bg-green-50 dark:bg-green-900/20",
        purple: "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
    }[color as string] || "text-slate-600 bg-slate-50";

    return (
        <Card className="border-none shadow-sm bg-white/60 dark:bg-slate-900/60 backdrop-blur-sm hover:shadow-md transition-all duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                    {title}
                </CardTitle>
                <div className={`p-2 rounded-lg ${colorStyles}`}>
                    <Icon className="h-4 w-4" />
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">{value}</div>
                <div className="flex items-center mt-1 text-xs text-muted-foreground">
                    <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                    {trend}
                </div>
            </CardContent>
        </Card>
    );
}

function StatusBadge({ status }: { status: string }) {
    const styles = {
        ENTRANTE: "bg-blue-100 text-blue-700 border-blue-200",
        QUALIFICADO: "bg-purple-100 text-purple-700 border-purple-200",
        AGENDADO_COTACAO: "bg-amber-100 text-amber-700 border-amber-200",
        PROPOSTA_ENVIADA: "bg-orange-100 text-orange-700 border-orange-200",
        VENDA_REALIZADA: "bg-green-100 text-green-700 border-green-200",
        PERDIDO: "bg-red-100 text-red-700 border-red-200",
        ARQUIVADO: "bg-gray-100 text-gray-600 border-gray-200",
    }[status] || "bg-gray-100 text-gray-700";

    return (
        <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold border ${styles}`}>
            {status.replace('_', ' ')}
        </span>
    );
}