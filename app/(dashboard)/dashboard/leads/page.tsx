import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { LeadsView } from '@/components/Dashboard/leads/leads-view';

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
  // Buscamos os leads priorizando renovações que vencerão primeiro
  const promises = KANBAN_STATUSES.map(status => {
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
      take: 50, // Amostra expressiva para carregar as renovações prioritárias
      include: {
        interestedInProduct: { select: { name: true } }
      }
    });
  });

  const results = await Promise.all(promises);
  
  // Flatten: Junta todos os arrays em um único array de leads
  const initialLeads = results.flat();

  return (
    <div className="container mx-auto py-8 max-w-7xl animate-in fade-in duration-500">
      <div className="flex flex-col mb-8 gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Meus Leads
        </h1>
        <p className="text-muted-foreground">
            Gerencie seus contatos e acompanhe o funil de vendas.
        </p>
      </div>

      <LeadsView initialData={initialLeads} />
    </div>
  );
}