'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/logo';
import { 
  LayoutDashboard, Users, ShieldCheck, Database, 
  Settings, ChevronLeft, LogOut, Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';

// Itens exclusivos do Admin
const adminNavItems = [
  { href: '/admin', icon: LayoutDashboard, label: 'Admin Geral' },
  { href: '/admin/users', icon: Users, label: 'Gerenciar Usuários' },
  { href: '/admin/leads', icon: Database, label: 'Todos os Leads' },
  { href: '/admin/settings', icon: Settings, label: 'Configurações Sistema' },
];

export function AdminSidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-[260px] h-screen bg-slate-950" />;

  const sidebarWidth = isCollapsed ? 80 : 280;

  return (
    <motion.aside
      initial={{ width: sidebarWidth }}
      animate={{ width: sidebarWidth }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "hidden md:flex flex-col h-screen sticky top-0 z-50",
        "bg-slate-900 text-white border-r border-slate-800", // Estilo Dark forçado para diferenciar do Dashboard comum
        "shadow-lg"
      )}
    >
      <div className="h-20 flex items-center justify-between px-5 relative">
        {/* Logo Diferente ou com Badge Admin */}
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
             {!isCollapsed && <span className="text-red-500">ADMIN</span>}
             <Logo iconOnly={isCollapsed} />
        </div>
        
        <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-3 top-8 bg-slate-800 border border-slate-700 rounded-full p-1.5 text-slate-400 hover:text-white transition-all hover:scale-110 z-50"
        >
            <ChevronLeft className={cn("h-3 w-3 transition-transform duration-300", isCollapsed && "rotate-180")} />
        </button>
      </div>

      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        <div className="px-3 mb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
            {!isCollapsed ? 'Painel de Controle' : '•••'}
        </div>
        {adminNavItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className="block relative group">
              <div
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                  isActive ? "bg-red-600 text-white" : "text-slate-400 hover:bg-slate-800 hover:text-white"
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <AnimatePresence mode="wait">
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="whitespace-nowrap"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
                {isCollapsed && (
                    <div className="absolute left-full ml-4 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 z-50">
                        {item.label}
                    </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-slate-800 bg-slate-900">
        <div className={cn("flex items-center gap-3", isCollapsed ? "justify-center" : "")}>
            <div className="h-9 w-9 rounded-full bg-red-600 flex items-center justify-center text-white font-bold text-xs shrink-0">
                A
            </div>
            {!isCollapsed && (
                <div className="flex-1 overflow-hidden">
                    <p className="text-sm font-semibold truncate text-slate-200">{session?.user?.name}</p>
                    <p className="text-xs text-slate-500 truncate">Administrador</p>
                </div>
            )}
             {!isCollapsed && (
                <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-500" onClick={() => signOut()}>
                    <LogOut className="h-4 w-4" />
                </Button>
            )}
        </div>
      </div>
    </motion.aside>
  );
}