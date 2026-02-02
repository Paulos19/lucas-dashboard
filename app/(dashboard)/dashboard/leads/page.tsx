import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PrismaClient } from '@prisma/client';
// IMPORTANTE: Agora importamos o gerenciador de visualização, não apenas a tabela
import { LeadsView } from '@/components/Dashboard/leads/leads-view';

const prisma = new PrismaClient();

// Força dynamic rendering para que os dados sejam sempre frescos ao acessar
export const dynamic = 'force-dynamic';

export default async function LeadsPage() {
  // 1. Verificação de Autenticação no Servidor
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const userId = session.user.id;

  // 2. Busca de Dados Otimizada (Server Side)
  // Incluímos 'interestedInProduct' pois o Kanban exibe essa tag nos cards
  const leads = await prisma.lead.findMany({
    where: { userId },
    orderBy: { updatedAt: 'desc' },
    include: {
        interestedInProduct: {
            select: { name: true }
        }
    }
  });

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

      {/* 3. Renderiza o componente Híbrido (Kanban + Tabela) */}
      <LeadsView initialData={leads} />
    </div>
  );
}