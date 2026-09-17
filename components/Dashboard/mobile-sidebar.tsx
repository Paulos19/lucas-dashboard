'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet';
import { Button } from '../ui/button';
import { 
  Menu, LayoutDashboard, Users, ShieldCheck, Home as HomeIcon, 
  Calendar, Settings, LogOut, Sparkles, Sun, Moon 
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useSession, signOut } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { Logo } from '../ui/logo';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Visão Geral' },
  { href: '/dashboard/leads', icon: Users, label: 'Meus Leads' },
  { href: '/dashboard/products', icon: ShieldCheck, label: 'Seguros' },
  { href: '/dashboard/properties', icon: HomeIcon, label: 'Imóveis' },
  { href: '/dashboard/agenda', icon: Calendar, label: 'Agenda' },
  { href: '/dashboard/settings', icon: Settings, label: 'Configurações' },
];

export function MobileSidebar() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden text-slate-700 dark:text-slate-300">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-80 p-0 flex flex-col glass-panel border-r border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-2xl">
        <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
        
        {/* Header Logo */}
        <div className="p-6 border-b border-slate-200/60 dark:border-slate-800/60">
          <Logo />
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1.5 overflow-y-auto">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all",
                  isActive
                    ? "bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-semibold border border-blue-200/60 dark:border-blue-800/50"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
                )}
              >
                <Icon className={cn("h-4 w-4", isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400")} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User Card & Settings on Mobile */}
        <div className="p-4 border-t border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/40 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-linear-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-xs shadow-md">
              {session?.user?.name?.charAt(0) || "U"}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                {session?.user?.name || "Corretor"}
              </p>
              <p className="text-xs text-blue-600 dark:text-blue-400 font-medium truncate flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Corretor Pro
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-slate-200/50 dark:border-slate-800/50">
            <Button
              variant="outline"
              size="sm"
              className="text-xs gap-1.5 h-8"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            >
              {theme === 'dark' ? <Sun className="h-3.5 w-3.5 text-amber-500" /> : <Moon className="h-3.5 w-3.5 text-blue-500" />}
              {theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 h-8 gap-1.5"
              onClick={() => signOut()}
            >
              <LogOut className="h-3.5 w-3.5" /> Sair
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}