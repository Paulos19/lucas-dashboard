// components/Dashboard/sidebar.tsx
'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, Users, ShieldCheck, Calendar, 
  Settings, ChevronLeft, LogOut
} from 'lucide-react';
import { motion } from 'framer-motion';
import { signOut } from 'next-auth/react';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Visão Geral' },
  { href: '/dashboard/leads', icon: Users, label: 'Meus Leads' },
  { href: '/dashboard/products', icon: ShieldCheck, label: 'Seguros' }, // Ícone de Escudo
  { href: '/dashboard/agenda', icon: Calendar, label: 'Agenda' },
  { href: '/dashboard/settings', icon: Settings, label: 'Configurações' },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 260 }}
      className="hidden md:flex flex-col h-screen sticky top-0 border-r bg-card z-50 shadow-sm transition-all duration-300"
    >
      <div className="h-20 flex items-center justify-between px-4 border-b bg-red-50 dark:bg-red-950/10"> {/* Toque vermelho Bradesco/CSB */}
        <div className="flex items-center gap-2 overflow-hidden w-full">
          <div className="p-2 bg-red-600 rounded-lg shrink-0 shadow-sm">
            <ShieldCheck className="h-6 w-6 text-white" />
          </div>
          {!isCollapsed && (
            <motion.span 
                initial={{ opacity: 0 }} 
                animate={{ opacity: 1 }} 
                className="font-bold text-lg text-red-900 dark:text-red-100"
            >
                CSB Seguros
            </motion.span>
          )}
        </div>
        
        <Button variant="ghost" size="icon" onClick={() => setIsCollapsed(!isCollapsed)}>
            <ChevronLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
        </Button>
      </div>

      <div className="flex-1 py-6 px-3 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href} className="relative block group">
              {isActive && (
                <div className="absolute inset-0 bg-red-50 dark:bg-red-900/20 rounded-lg border-l-4 border-red-600" />
              )}
              <div className={cn(
                "relative flex items-center gap-3 px-3 py-3 rounded-lg transition-all",
                isActive ? "text-red-700 dark:text-red-300 font-medium" : "text-muted-foreground hover:bg-muted"
              )}>
                <item.icon className="h-5 w-5 shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t">
        <Button variant="outline" className="w-full justify-start gap-3 hover:text-red-600 hover:bg-red-50" onClick={() => signOut()}>
            <LogOut className="h-4 w-4" />
            {!isCollapsed && "Sair"}
        </Button>
      </div>
    </motion.aside>
  );
}