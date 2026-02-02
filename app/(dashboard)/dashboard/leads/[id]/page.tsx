import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { PrismaClient } from '@prisma/client';
import { LeadDetailsView } from '@/components/Dashboard/leads/lead-details-view';

const prisma = new PrismaClient();

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id } = await params;

  // Busca o Lead com anexos
  const lead = await prisma.lead.findUnique({
    where: {
      id,
      userId: session.user.id
    },
    include: {
      interestedInProduct: true,
      agendamento: true,
      attachments: {          // <--- ADICIONADO
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!lead) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <LeadDetailsView lead={lead} />
    </div>
  );
}