import { Sidebar } from "@/components/Dashboard/sidebar";
import { MobileSidebar } from "@/components/Dashboard/mobile-sidebar";
import { ThreeBackground } from "@/components/ui/three-background";
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
    <div className="relative flex min-h-screen w-full bg-slate-50/70 dark:bg-slate-950/80 transition-colors duration-300">
      {/* Background 3D Procedural Interativo com Three.js */}
      <ThreeBackground />

      {/* Sidebar Desktop Redesenhada */}
      <Sidebar />

      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        {/* Header Mobile e Título */}
        <header className="flex h-16 items-center justify-between border-b border-slate-200/60 dark:border-slate-800/60 glass-panel px-4 md:hidden">
          <div className="flex items-center gap-3">
            <MobileSidebar />
            <span className="font-bold text-lg tracking-tight">LUCAS<span className="text-blue-600">.ai</span></span>
          </div>
        </header>

        {/* Conteúdo Principal com scroll suave */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}