import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/Admin/admin-sidebar';
import { Role } from '@prisma/client';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  // Proteção da Rota: Só ADMIN entra
  if (!session || session.user.role !== Role.ADMIN) {
    redirect('/dashboard'); // Manda usuários normais de volta pro dashboard deles
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto h-screen">
        <div className="container mx-auto p-6 md:p-10 max-w-7xl">
          {children}
        </div>
      </main>
    </div>
  );
}