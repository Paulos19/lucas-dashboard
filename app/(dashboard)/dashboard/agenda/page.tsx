import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { AgendaView } from '@/components/Dashboard/agenda/agenda-view';
import { Clock, Video, Sparkles, CheckCircle2, Bot } from 'lucide-react';
import { isSameDay, addDays, isFuture } from 'date-fns';

export const dynamic = 'force-dynamic';

export default async function AgendaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const now = new Date();

  // Busca dados em paralelo
  const [agendamentos, slots] = await Promise.all([
    // Agendamentos (reservas feitas pelos leads via Lucas AI / n8n)
    prisma.agendamento.findMany({
      where: { userId: session.user.id },
      include: { 
        lead: {
          select: {
            id: true,
            name: true,
            contato: true,
            ramo: true,
            numeroApolice: true,
            status: true,
            agencia: true,
            corretorNome: true,
          }
        } 
      },
      orderBy: { dataHora: 'asc' }
    }),
    // Slots de disponibilidade futuros
    prisma.availabilitySlot.findMany({
      where: { 
        userId: session.user.id,
        startTime: { gte: now }
      },
      orderBy: { startTime: 'asc' }
    })
  ]);

  // Métricas de Disponibilidade & Reservas
  const inSevenDays = addDays(now, 7);
  const slotsLivres = slots.filter(s => !s.isBooked).length;
  const reunioesHoje = agendamentos.filter(a => isSameDay(new Date(a.dataHora), now) && a.status !== 'CANCELADO').length;
  const totalReservadosFuturos = agendamentos.filter(a => isFuture(new Date(a.dataHora)) && a.status !== 'CANCELADO').length;
  const proximaReuniao = agendamentos.find(a => new Date(a.dataHora) >= now && a.status !== 'CANCELADO');

  return (
    <div className="container mx-auto py-6 max-w-7xl space-y-8 animate-in fade-in duration-500">
      
      {/* Header Principal Glassmorphic */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-lg shadow-slate-950/5 relative overflow-hidden">
        {/* Glow de fundo sutil */}
        <div className="absolute -right-24 -top-24 w-96 h-96 bg-gradient-to-br from-emerald-500/10 via-blue-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-gradient-to-tr from-cyan-500/10 via-emerald-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 backdrop-blur-md">
              <Bot className="w-3.5 h-3.5" />
              <span>Disponibilidade & Agendamento Automatizado (Lucas AI)</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
              Minha Disponibilidade
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              Ative ou feche seus horários de atendimento. Quando um lead demonstrar interesse pelo WhatsApp, o Lucas AI consultará esses horários em tempo real e o cliente escolherá quando quer ser atendido.
            </p>
          </div>

          {/* Destaque do Próximo Atendimento */}
          {proximaReuniao && (
            <div className="glass-pill px-4 py-3 rounded-2xl border border-blue-200/80 dark:border-blue-800/80 bg-blue-50/50 dark:bg-blue-950/30 flex items-center gap-3 shrink-0 max-w-sm">
              <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-xs">
                <Video className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase font-bold text-blue-600 dark:text-blue-400 tracking-wider flex items-center gap-1">
                  <span>Próximo Atendimento</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                </div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                  {proximaReuniao.lead?.name || 'Cliente'}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400">
                  {new Date(proximaReuniao.dataHora).toLocaleString('pt-BR', { 
                    weekday: 'short', 
                    day: '2-digit', 
                    month: 'short', 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Spotlight KPI Chips */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-200/60 dark:border-slate-800/60">
          
          {/* Horários Livres no Ar */}
          <div className="glass-pill p-3.5 rounded-2xl flex items-center gap-3 border border-slate-200/70 dark:border-slate-800/70 transition-all hover:translate-y-[-2px]">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Horários Livres para a IA</div>
              <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{slotsLivres}</div>
            </div>
          </div>

          {/* Reuniões Reservadas pelos Leads */}
          <div className="glass-pill p-3.5 rounded-2xl flex items-center gap-3 border border-slate-200/70 dark:border-slate-800/70 transition-all hover:translate-y-[-2px]">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Reservas de Leads</div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{totalReservadosFuturos}</div>
            </div>
          </div>

          {/* Atendimentos Hoje */}
          <div className="glass-pill p-3.5 rounded-2xl flex items-center gap-3 border border-slate-200/70 dark:border-slate-800/70 transition-all hover:translate-y-[-2px]">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Atendimentos Hoje</div>
              <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{reunioesHoje}</div>
            </div>
          </div>

          {/* Total Histórico de Agendamentos */}
          <div className="glass-pill p-3.5 rounded-2xl flex items-center gap-3 border border-slate-200/70 dark:border-slate-800/70 transition-all hover:translate-y-[-2px]">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Agendado pela IA</div>
              <div className="text-xl font-bold text-cyan-600 dark:text-cyan-400">{agendamentos.length}</div>
            </div>
          </div>

        </div>
      </div>

      {/* Componente Interativo de Disponibilidade & Grade Horária */}
      <AgendaView 
        agendamentos={agendamentos} 
        slots={slots} 
      />

    </div>
  );
}