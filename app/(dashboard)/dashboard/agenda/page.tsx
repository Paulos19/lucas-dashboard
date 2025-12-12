import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PrismaClient } from '@prisma/client';
import { AgendaView } from '@/components/Dashboard/agenda/agenda-view';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export default async function AgendaPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  // Busca dados em paralelo
  const [agendamentos, slots] = await Promise.all([
    // Agendamentos (passados e futuros para histórico)
    prisma.agendamento.findMany({
        where: { userId: session.user.id },
        include: { lead: true },
        orderBy: { dataHora: 'asc' }
    }),
    // Slots futuros (para gestão)
    prisma.availabilitySlot.findMany({
        where: { 
            userId: session.user.id,
            startTime: { gte: new Date() } // Apenas futuros
        },
        orderBy: { startTime: 'asc' }
    })
  ]);

  return (
    <div className="container mx-auto py-8 max-w-7xl animate-in fade-in duration-500">
      <div className="flex flex-col mb-8 gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Minha Agenda
        </h1>
        <p className="text-muted-foreground">
            Gerencie sua disponibilidade para o Lucas e visualize seus compromissos.
        </p>
      </div>

      <AgendaView agendamentos={agendamentos} slots={slots} />
    </div>
  );
}