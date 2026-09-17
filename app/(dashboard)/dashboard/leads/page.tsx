import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { LeadsView } from '@/components/Dashboard/leads/leads-view';
import { Users, Flame, ShieldAlert, Sparkles } from 'lucide-react';

// Status que usamos no Kanban
const KANBAN_STATUSES = [
  'ENTRANTE', 'QUALIFICADO', 'AGENDADO_COTACAO', 'PROPOSTA_ENVIADA', 'VENDA_REALIZADA'
];

export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const userId = session.user.id;
  const isAdmin = session.user.role === 'ADMIN';

  // --- OTIMIZAÇÃO DE CARGA INICIAL ---
  const whereBase: any = {};
  if (!isAdmin) {
    whereBase.userId = userId;
  }

  // Buscamos contadores rápidos para cabeçalho
  const [totalLeadsCount, urgentRenewalsCount, ...results] = await Promise.all([
    prisma.lead.count({ where: whereBase }),
    prisma.lead.count({ 
      where: { 
        ...whereBase, 
        dataRenovacao: { not: null },
        firstContactSent: false 
      } 
    }),
    ...KANBAN_COLUMNS_QUERIES(userId, isAdmin)
  ]);

  const initialLeads = results.flat();

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500 pb-10">
      
      {/* Header com Glassmorphism e Stat Chips */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Gestão de Leads & Funil
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60">
              <Sparkles className="h-3 w-3" /> Fila Ativa
            </span>
          </div>
          <p className="text-xs md:text-sm text-slate-500 dark:text-slate-400">
            Acompanhe o funil de vendas, priorize renovações iminentes e acione abordagens inteligentes.
          </p>
        </div>

        {/* Mini Stat Chips */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-panel border border-slate-200/80 dark:border-slate-800/80 text-xs">
            <Users className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-slate-500 dark:text-slate-400">Total:</span>
            <strong className="text-slate-900 dark:text-white font-bold">{totalLeadsCount}</strong>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl glass-panel border border-rose-200/80 dark:border-rose-900/60 text-xs bg-rose-50/40 dark:bg-rose-950/20">
            <Flame className="h-3.5 w-3.5 text-rose-500 animate-pulse" />
            <span className="text-rose-700 dark:text-rose-300">Renovações:</span>
            <strong className="text-rose-700 dark:text-rose-200 font-bold">{urgentRenewalsCount}</strong>
          </div>
        </div>
      </div>

      <LeadsView initialData={initialLeads} />
    </div>
  );
}

function KANBAN_COLUMNS_QUERIES(userId: string, isAdmin: boolean) {
  return KANBAN_STATUSES.map(status => {
    const whereClause: any = { status: status as any };
    if (!isAdmin) {
      whereClause.userId = userId;
    }

    return prisma.lead.findMany({
      where: whereClause,
      orderBy: [
        { dataRenovacao: { sort: 'asc', nulls: 'last' } },
        { prioridade: 'asc' },
        { updatedAt: 'desc' }
      ],
      take: 50,
      include: {
        interestedInProduct: { select: { name: true } }
      }
    });
  });
}