'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/logo';
import { 
  LayoutDashboard, Users, ShieldCheck, Calendar, 
  Settings, ChevronLeft, LogOut, PanelLeftClose, PanelLeftOpen
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Visão Geral' },
  { href: '/dashboard/leads', icon: Users, label: 'Meus Leads' },
  { href: '/dashboard/products', icon: ShieldCheck, label: 'Seguros' },
  { href: '/dashboard/properties', icon: HomeIcon, label: 'Imóveis' }, // Adicionei HomeIcon abaixo
  { href: '/dashboard/agenda', icon: Calendar, label: 'Agenda' },
  { href: '/dashboard/settings', icon: Settings, label: 'Configurações' },
];

import { Home as HomeIcon } from 'lucide-react';

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  // Previne hidratação incorreta inicial
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <div className="w-[260px] h-screen bg-slate-50/50" />;

  const sidebarWidth = isCollapsed ? 80 : 280;

  return (
    <motion.aside
      initial={{ width: sidebarWidth }}
      animate={{ width: sidebarWidth }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "hidden md:flex flex-col h-screen sticky top-0 z-50",
        "bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-r border-slate-200 dark:border-slate-800",
        "shadow-sm transition-colors duration-300"
      )}
    >
      {/* Header / Logo */}
      <div className="h-20 flex items-center justify-between px-5 relative">
        <div className="overflow-hidden">
           <Logo iconOnly={isCollapsed} />
        </div>
        
        {/* Toggle Button - Absolute para centralizar quando colapsado ou ficar na ponta */}
        <button 
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
                "absolute -right-3 top-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full p-1.5 shadow-sm text-slate-500 hover:text-blue-600 transition-all",
                "hover:scale-110 active:scale-95 z-50"
            )}
        >
            <ChevronLeft className={cn("h-3 w-3 transition-transform duration-300", isCollapsed && "rotate-180")} />
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-6 px-3 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-800">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link key={item.href} href={item.href} className="block relative group">
              <div
                className={cn(
                  "relative flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                  "hover:bg-slate-100 dark:hover:bg-slate-800/50",
                  isActive ? "text-blue-600 dark:text-blue-400 font-medium" : "text-slate-500 dark:text-slate-400"
                )}
              >
                {/* Active Indicator (Background Light) */}
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute inset-0 bg-blue-50 dark:bg-blue-900/20 rounded-xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  />
                )}

                {/* Icon */}
                <item.icon className={cn("h-5 w-5 shrink-0 relative z-10", isActive && "stroke-[2.5px]")} />

                {/* Label */}
                <AnimatePresence mode="wait">
                  {!isCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.2 }}
                      className="whitespace-nowrap relative z-10"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>

                {/* Tooltip for Collapsed State (Simple CSS approach or use Tooltip comp) */}
                {isCollapsed && (
                    <div className="absolute left-full ml-4 px-2 py-1 bg-slate-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
                        {item.label}
                    </div>
                )}
              </div>
            </Link>
          );
        })}
      </div>

      {/* User Profile / Footer */}
      <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <div className={cn("flex items-center gap-3", isCollapsed ? "justify-center" : "")}>
            
            {/* Avatar Placeholder */}
            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shrink-0 shadow-md ring-2 ring-white dark:ring-slate-950">
                <span className="text-white font-bold text-xs">
                    {session?.user?.name?.charAt(0) || "U"}
                </span>
            </div>

            {!isCollapsed && (
                <motion.div 
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    className="flex-1 overflow-hidden"
                >
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                        {session?.user?.name || "Corretor"}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                        {session?.user?.email || "usuario@csb.com"}
                    </p>
                </motion.div>
            )}

            {!isCollapsed && (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => signOut()}
                >
                    <LogOut className="h-4 w-4" />
                </Button>
            )}
        </div>
        
        {/* SignOut Button for Collapsed Mode */}
        {isCollapsed && (
             <div className="mt-4 flex justify-center">
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-slate-400 hover:text-red-600"
                    onClick={() => signOut()}
                >
                    <LogOut className="h-4 w-4" />
                </Button>
             </div>
        )}
      </div>
    </motion.aside>
  );
}