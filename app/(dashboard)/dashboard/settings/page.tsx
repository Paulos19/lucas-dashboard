import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { SettingsView } from '@/components/Dashboard/settings/settings-view';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  // Busca dados atuais do usuário com campos de Evolution API e UploadThing
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      creci: true,
      image: true,
      role: true,
      evoApiKey: true,
      evoInstance: true,
      evoApiUrl: true,
      createdAt: true
    } as any
  });

  if (!user) redirect('/login');

  return (
    <div className="container mx-auto py-8 max-w-5xl px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500">
      <SettingsView user={user as any} />
    </div>
  );
}