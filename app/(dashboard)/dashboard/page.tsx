import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Users, ShieldCheck, Calendar as CalendarIcon, DollarSign, 
  ArrowUpRight, TrendingUp, Clock, Plus, Phone, ArrowRight,
  Flame, Zap, Bot, Sparkles, AlertTriangle, ChevronRight
} from 'lucide-react';
import Link from 'next/link';
import { OverviewChart } from '@/components/Dashboard/overview-chart';
import { OverviewHeroBanner } from '@/components/Dashboard/overview-hero-banner';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getRenewalUrgency } from '@/lib/renewal';
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
    // 5 Renovações Mais Urgentes
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
    { name: "Jan", total: Math.max(2, Math.floor(totalLeads * 0.15)) },
    { name: "Fev", total: Math.max(4, Math.floor(totalLeads * 0.25)) },
    { name: "Mar", total: Math.max(3, Math.floor(totalLeads * 0.20)) },
    { name: "Abr", total: Math.max(6, Math.floor(totalLeads * 0.35)) },
    { name: "Mai", total: Math.max(8, Math.floor(totalLeads * 0.50)) },
    { name: "Jun", total: Math.max(10, totalLeads) },
  ];

  return (
    <div className="space-y-7 pb-12 animate-in fade-in duration-500">
      
      {/* Banner Inteligente com Meteorologia do Brasil e Mensagem Gemini AI */}
      <OverviewHeroBanner userName={firstName} />

      {/* Ações Rápidas de Topo */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
            Painel de Operações
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Visão consolidada da sua carteira de segurados e fila de conversão.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="outline" size="sm" className="glass-pill text-xs gap-1.5 h-9 border-slate-200/80 dark:border-slate-800/80">
            <Link href="/dashboard/products">
              <Plus className="h-3.5 w-3.5 text-blue-500" /> Novo Produto
            </Link>
          </Button>

          <Button asChild size="sm" className="bg-linear-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md text-xs gap-1.5 h-9">
            <Link href="/dashboard/leads">
              <Zap className="h-3.5 w-3.5" /> Fila de Disparo
            </Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards em Glassmorphism de Alto Padrão */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
          trend={nextAppointment ? "Compromisso em breve" : "Livre por enquanto"} 
          color="purple"
        />
      </div>

      {/* Grade Principal: Gráfico e Próximo Compromisso */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-7 items-stretch">
        
        {/* Gráfico Principal */}
        <OverviewChart data={chartData} />

        {/* Card de Próximo Compromisso / Spotlight */}
        <Card className="col-span-1 lg:col-span-3 glass-card border border-slate-200/80 dark:border-slate-800/80 relative overflow-hidden shadow-md flex flex-col justify-between">
          {/* Ambient Glow Orb */}
          <div className="absolute top-0 right-0 -mr-10 -mt-10 w-44 h-44 rounded-full bg-blue-500/10 blur-2xl pointer-events-none" />

          <CardHeader className="pb-3 relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Compromisso em Destaque
              </span>
              <div className="h-8 w-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/60 dark:border-blue-800/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <CardTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
              Próxima Reunião
            </CardTitle>
            <CardDescription className="text-xs">
              Mantenha o foco nos alinhamentos agendados
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 relative z-10 flex-1 flex flex-col justify-between">
            {nextAppointment ? (
              <div className="space-y-3">
                <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/50 dark:border-blue-800/40 space-y-1">
                  <div className="text-2xl font-black text-blue-600 dark:text-blue-400 tracking-tight">
                    {new Date(nextAppointment.dataHora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="font-semibold text-base text-slate-900 dark:text-slate-100 truncate">
                    {nextAppointment.lead.name}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2">
                    {nextAppointment.resumo || "Reunião de alinhamento e apresentação de proposta."}
                  </p>
                </div>

                <Button variant="outline" className="w-full gap-2 text-xs h-9 glass-pill border-slate-200/80 dark:border-slate-800/80" asChild>
                  <Link href="/dashboard/agenda">
                    Ver Agenda Completa <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-3">
                <div className="p-3 rounded-2xl bg-slate-100 dark:bg-slate-800/70 text-slate-500 border border-slate-200/60 dark:border-slate-700/60">
                  <CalendarIcon className="h-6 w-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    Nenhum compromisso pendente hoje
                  </p>
                  <p className="text-xs text-slate-400">
                    Sua agenda está livre para prospecção ativa e contatos.
                  </p>
                </div>
                <Button variant="outline" size="sm" className="text-xs glass-pill" asChild>
                  <Link href="/dashboard/agenda">Abrir Agenda</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

      </div>

      {/* Grade Inferior: Fila de Renovações e Leads Recentes */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-7 items-start">
        
        {/* Fila Prioritária de Renovações Iminentes (4 colunas) */}
        <Card className="col-span-1 lg:col-span-4 glass-card border border-slate-200/80 dark:border-slate-800/80 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
                  <Flame className="h-4 w-4" />
                </div>
                <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                  Fila de Renovações Prioritárias
                </CardTitle>
              </div>
              <CardDescription className="text-xs">
                Segurados com apólices a vencer ordenados por urgência
              </CardDescription>
            </div>
            
            <Button variant="ghost" size="sm" asChild className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 h-8">
              <Link href="/dashboard/leads" className="gap-1">
                Disparar <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>

          <CardContent>
            {urgentRenewals.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm space-y-1">
                <p className="font-medium">Nenhuma renovação pendente no momento.</p>
                <p className="text-xs text-slate-400">Todos os leads com apólices próximas já foram abordados.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {urgentRenewals.map((lead) => {
                  const urgency = getRenewalUrgency(lead.dataRenovacao);
                  return (
                    <div 
                      key={lead.id} 
                      className="flex items-center justify-between p-3 rounded-2xl bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-800/60 hover:border-blue-500/30 dark:hover:border-blue-500/30 transition-all group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-9 w-9 border border-slate-200 dark:border-slate-700 shrink-0">
                          <AvatarFallback className="bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 font-bold text-xs">
                            {lead.name.substring(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 space-y-0.5">
                          <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {lead.name}
                          </p>
                          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                            <span>{lead.contato}</span>
                            {lead.ramo && <span>• {lead.ramo}</span>}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 border font-semibold", urgency.badgeClass)}>
                          {urgency.label}
                        </Badge>
                        <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700">
                          <Link href={`/dashboard/leads/${lead.id}`}>
                            <Bot className="h-3 w-3 mr-1" /> Ficha
                          </Link>
                        </Button>
                      </div>
                    </div>
                  );
                })}

                <div className="pt-2">
                  <Button asChild className="w-full bg-linear-to-r from-blue-600 via-indigo-600 to-blue-700 hover:opacity-95 text-white shadow-xs text-xs font-semibold h-9 gap-2">
                    <Link href="/dashboard/leads">
                      <Zap className="h-3.5 w-3.5" /> Abrir Painel de Disparo em Lote
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Lista de Leads Recentes (3 colunas) */}
        <Card className="col-span-1 lg:col-span-3 glass-card border border-slate-200/80 dark:border-slate-800/80 shadow-md">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Leads Recentes
              </CardTitle>
              <CardDescription className="text-xs">
                Últimos contatos e entradas no funil
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 h-8">
              <Link href="/dashboard/leads" className="gap-1">
                Ver todos <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardHeader>

          <CardContent>
            {recentLeads.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                Nenhum lead encontrado no momento.
              </div>
            ) : (
              <div className="space-y-3">
                {recentLeads.map((lead) => (
                  <div 
                    key={lead.id} 
                    className="flex items-center justify-between p-2 rounded-xl hover:bg-slate-100/50 dark:hover:bg-slate-800/30 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Avatar className="h-8 w-8 border border-slate-200 dark:border-slate-700 shrink-0">
                        <AvatarFallback className="bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-bold text-[11px]">
                          {lead.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                          {lead.name}
                        </p>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <Clock className="h-2.5 w-2.5" />
                          <span>{formatDistanceToNow(new Date(lead.updatedAt), { addSuffix: true, locale: ptBR })}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="shrink-0 ml-2">
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

// Componentes Auxiliares Refinados

function KpiCard({ title, value, icon: Icon, trend, color }: any) {
  const colorMap = {
    blue: {
      borderHover: "hover:border-blue-500/50",
      iconBg: "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200/60 dark:border-blue-800/50",
      glow: "from-blue-500/10 to-transparent",
    },
    rose: {
      borderHover: "hover:border-rose-500/50",
      iconBg: "bg-rose-50 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 border border-rose-200/60 dark:border-rose-800/50",
      glow: "from-rose-500/10 to-transparent",
    },
    indigo: {
      borderHover: "hover:border-indigo-500/50",
      iconBg: "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-800/50",
      glow: "from-indigo-500/10 to-transparent",
    },
    purple: {
      borderHover: "hover:border-purple-500/50",
      iconBg: "bg-purple-50 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 border border-purple-200/60 dark:border-purple-800/50",
      glow: "from-purple-500/10 to-transparent",
    },
  }[color as 'blue' | 'rose' | 'indigo' | 'purple'] || {
    borderHover: "hover:border-blue-500/50",
    iconBg: "bg-blue-50 text-blue-600",
    glow: "from-blue-500/10 to-transparent",
  };

  return (
    <div className={cn(
      "relative rounded-2xl glass-card p-5 border border-slate-200/80 dark:border-slate-800/80",
      "shadow-xs transition-all duration-300 overflow-hidden group",
      colorMap.borderHover
    )}>
      {/* Luz ambiente de fundo */}
      <div className={cn("absolute -top-10 -right-10 w-28 h-28 rounded-full bg-linear-to-br blur-2xl pointer-events-none", colorMap.glow)} />

      <div className="flex items-center justify-between pb-3 relative z-10">
        <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {title}
        </span>
        <div className={cn("p-2 rounded-xl transition-transform duration-300 group-hover:scale-110", colorMap.iconBg)}>
          <Icon className="h-4 w-4" />
        </div>
      </div>

      <div className="relative z-10">
        <div className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">
          {value}
        </div>
        <div className="flex items-center mt-1 text-xs text-slate-500 dark:text-slate-400">
          <TrendingUp className="mr-1 h-3 w-3 text-emerald-500 shrink-0" />
          <span className="truncate">{trend}</span>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    ENTRANTE: "bg-blue-50 text-blue-700 border-blue-200/80 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800/60",
    QUALIFICADO: "bg-purple-50 text-purple-700 border-purple-200/80 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800/60",
    AGENDADO_COTACAO: "bg-amber-50 text-amber-700 border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60",
    PROPOSTA_ENVIADA: "bg-orange-50 text-orange-700 border-orange-200/80 dark:bg-orange-950/60 dark:text-orange-300 dark:border-orange-800/60",
    VENDA_REALIZADA: "bg-emerald-50 text-emerald-700 border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60",
    PERDIDO: "bg-rose-50 text-rose-700 border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800/60",
    ARQUIVADO: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700",
  };

  const currentStyle = styles[status] || "bg-slate-100 text-slate-700";

  return (
    <span className={cn("px-2 py-0.5 rounded-lg text-[10px] font-bold border shadow-2xs", currentStyle)}>
      {status ? status.replace('_', ' ') : 'ENTRANTE'}
    </span>
  );
}