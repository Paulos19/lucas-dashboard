import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PrismaClient } from '@prisma/client';
import { SettingsView } from '@/components/Dashboard/settings/settings-view';

const prisma = new PrismaClient();
export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  // Busca dados atuais do usuário
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        creci: true,
        image: true // Campo novo
    }
  });

  if (!user) redirect('/login');

  return (
    <div className="container mx-auto py-8 max-w-4xl animate-in fade-in duration-500">
      <div className="flex flex-col mb-8 gap-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Configurações
        </h1>
        <p className="text-muted-foreground">
            Gerencie seu perfil e preferências de conta.
        </p>
      </div>

      <SettingsView user={user} />
    </div>
  );
}