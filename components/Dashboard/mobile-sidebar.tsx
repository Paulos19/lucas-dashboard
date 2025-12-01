// components/Dashboard/mobile-sidebar.tsx
'use client';

import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'; // Adicionei SheetTitle para acessibilidade
import { Button } from '../ui/button';
import { Menu, LayoutDashboard, Users, Home, Calendar, Settings } from 'lucide-react';
import Link from 'next/link';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Visão Geral' },
  { href: '/dashboard/leads', icon: Users, label: 'Leads' },
  { href: '/dashboard/properties', icon: Home, label: 'Imóveis' },
  { href: '/dashboard/agenda', icon: Calendar, label: 'Agenda' },
  { href: '/dashboard/settings', icon: Settings, label: 'Configurações' },
];

export function MobileSidebar() {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Menu className="h-6 w-6" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72">
        <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
        <div className="flex items-center gap-2 mb-8 px-2">
            <span className="font-bold text-xl text-blue-700">LUCAS.ai</span>
        </div>
        <nav className="flex flex-col gap-2">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-4 py-3 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </nav>
      </SheetContent>
    </Sheet>
  );
}