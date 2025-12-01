import { Sidebar } from "@/components/Dashboard/sidebar";
import { MobileSidebar } from "@/components/Dashboard/mobile-sidebar";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

// Força renderização dinâmica para evitar cache de usuário logado incorreto
export const dynamic = 'force-dynamic';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex min-h-screen w-full bg-slate-50 dark:bg-slate-950">
      {/* Sidebar Desktop */}
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header Mobile e Título */}
        <header className="flex h-16 items-center gap-4 border-b bg-background px-6 shadow-sm md:hidden">
          <MobileSidebar />
          <span className="font-semibold text-lg">Menu</span>
        </header>

        {/* Conteúdo Principal */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}