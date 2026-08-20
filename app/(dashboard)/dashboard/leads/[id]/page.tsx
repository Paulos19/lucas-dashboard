import { auth } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { LeadDetailsView } from '@/components/Dashboard/leads/lead-details-view';

export const dynamic = 'force-dynamic';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LeadPage({ params }: PageProps) {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  const { id } = await params;

  const whereClause: any = { id };
  // Se não for admin, só pode ver seus próprios leads
  if (session.user.role !== 'ADMIN') {
    whereClause.userId = session.user.id;
  }

  // Busca o Lead com todas as relações
  const lead = await prisma.lead.findFirst({
    where: whereClause,
    include: {
      user: {
        select: { id: true, name: true, email: true, phone: true }
      },
      interestedInProduct: true,
      agendamento: true,
      attachments: {
        orderBy: { createdAt: 'desc' }
      }
    }
  });

  if (!lead) {
    notFound();
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <LeadDetailsView lead={lead} />
    </div>
  );
}