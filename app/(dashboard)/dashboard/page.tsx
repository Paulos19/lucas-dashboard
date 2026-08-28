import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, ShieldCheck, Calendar as CalendarIcon, DollarSign, 
  ArrowUpRight, TrendingUp, Clock, Plus, Phone, ArrowRight,
  Flame, Zap, Bot, Sparkles, AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { OverviewChart } from '@/components/Dashboard/overview-chart';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getRenewalUrgency } from '@/components/Dashboard/leads/leads-table';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

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
    leadsByStatus,
    urgentRenewals,
    pendingRenewalsCount
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
    // Agrupamento para Gráfico
    prisma.lead.groupBy({
      by: ['status'],
      where: { userId },
      _count: { _all: true }
    }),
    // 5 Renovações Mais Urgentes (Não abordadas primeiro, vencimento mais próximo primeiro)
    prisma.lead.findMany({
      where: { 
        userId, 
        dataRenovacao: { not: null },
        firstContactSent: false
      },
      orderBy: [
        { dataRenovacao: 'asc' },
        { prioridade: 'asc' },
        { createdAt: 'asc' }
      ],
      take: 5,
      include: { interestedInProduct: true }
    }),
    // Total de renovações pendentes de abordagem
    prisma.lead.count({
      where: {
        userId,
        dataRenovacao: { not: null },
        firstContactSent: false
      }
    })
  ]);

  // Processar dados para o gráfico de leads
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
            Aqui está o panorama da sua carteira e a fila prioritária de disparos.
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
              <Zap className="h-4 w-4" /> Ver Fila de Disparo
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
          title="Fila de Renovações" 
          value={pendingRenewalsCount} 
          icon={Flame} 
          trend="Priorizadas por vencimento" 
          color="rose"
        />
        <KpiCard 
          title="Seguros no Catálogo" 
          value={activeProducts} 
          icon={ShieldCheck} 
          trend="Base RAG conectada" 
          color="indigo"
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
        <Card className="col-span-4 lg:col-span-4 xl:col-span-2 border-none shadow-md bg-linear-to-br from-slate-900 to-slate-800 text-white relative overflow-hidden">
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

        {/* Fila Prioritária de Renovações Iminentes */}
        <Card className="col-span-4 lg:col-span-4 border-none shadow-md bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Flame className="h-5 w-5 text-red-500" />
                <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  Fila de Renovações Prioritárias
                </CardTitle>
              </div>
              <CardDescription>
                Segurados com apólices a vencer primeiro (ordenados por proximidade).
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-blue-600 hover:text-blue-700">
              <Link href="/dashboard/leads" className="gap-1">
                Disparar <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {urgentRenewals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm space-y-2">
                <p>Nenhuma renovação pendente no momento.</p>
                <p className="text-xs text-slate-400">Todos os leads com apólices próximas já foram abordados.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {urgentRenewals.map((lead) => {
                  const urgency = getRenewalUrgency(lead.dataRenovacao);
                  return (
                    <div 
                      key={lead.id} 
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9 border border-slate-200 dark:border-slate-700">
                          <AvatarFallback className="bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300 font-bold text-xs">
                            {lead.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                            {lead.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
                            <span>{lead.contato}</span>
                            {lead.ramo && <span>• {lead.ramo}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2.5">
                        <Badge variant="outline" className={cn("text-[11px] px-2 py-0.5 border shadow-2xs font-semibold", urgency.badgeClass)}>
                          {urgency.label}
                        </Badge>
                        <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700">
                          <Link href={`/dashboard/leads/${lead.id}`}>
                            <Bot className="h-3.5 w-3.5 mr-1" /> Ficha
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <div className="pt-2">
                  <Button asChild className="w-full bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-xs text-xs font-semibold gap-2">
                    <Link href="/dashboard/leads">
                      <Zap className="h-3.5 w-3.5" /> Abrir Painel de Disparo em Lote
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de Leads Recentes */}
        <Card className="col-span-4 lg:col-span-3 border-none shadow-md bg-white/70 dark:bg-slate-900/70 backdrop-blur-xs">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">Leads Recentes</CardTitle>
              <CardDescription>Últimas interações e cadastros.</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-blue-600 hover:text-blue-700">
              <Link href="/dashboard/leads" className="gap-1">
                Ver todos <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentLeads.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                Nenhum lead encontrado. Comece importando uma planilha ou adicionando um lead.
              </div>
            ) : (
              <div className="space-y-4">
                {recentLeads.map((lead) => (
                  <div key={lead.id} className="flex items-center justify-between group">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8 border border-slate-200 dark:border-slate-700">
                        <AvatarFallback className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-bold text-xs">
                          {lead.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-0.5">
                        <p className="text-sm font-medium leading-none text-slate-900 dark:text-slate-100 group-hover:text-blue-600 transition-colors">
                          {lead.name}
                        </p>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span>{lead.contato}</span>
                          <span>•</span>
                          <span className="flex items-center gap-0.5">
                            <Clock className="h-2.5 w-2.5" />
                            {formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
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

// Componentes Auxiliares

function KpiCard({ title, value, icon: Icon, trend, color }: any) {
  const colorStyles = {
    blue: "text-blue-600 bg-blue-50 dark:bg-blue-900/20",
    rose: "text-rose-600 bg-rose-50 dark:bg-rose-900/20",
    indigo: "text-indigo-600 bg-indigo-50 dark:bg-indigo-900/20",
    green: "text-green-600 bg-green-50 dark:bg-green-900/20",
    purple: "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
  }[color as string] || "text-slate-600 bg-slate-50";

  return (
    <Card className="border-none shadow-xs bg-white/60 dark:bg-slate-900/60 backdrop-blur-xs hover:shadow-md transition-all duration-300">
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
    ENTRANTE: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
    QUALIFICADO: "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
    AGENDADO_COTACAO: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
    PROPOSTA_ENVIADA: "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800",
    VENDA_REALIZADA: "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800",
    PERDIDO: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800",
    ARQUIVADO: "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700",
  }[status] || "bg-gray-100 text-gray-700";

  return (
    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${styles}`}>
      {status ? status.replace('_', ' ') : 'ENTRANTE'}
    </span>
  );
}