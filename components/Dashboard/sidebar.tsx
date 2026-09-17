'use client';

import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/logo';
import { 
  LayoutDashboard, Users, ShieldCheck, Home as HomeIcon, 
  Calendar, Settings, ChevronLeft, LogOut, Sparkles,
  Sun, Moon, Shield, Clock, ChevronUp, Check, ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { signOut, useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Visão Geral', badge: null },
  { href: '/dashboard/leads', icon: Users, label: 'Meus Leads', badge: 'Novo' },
  { href: '/dashboard/products', icon: ShieldCheck, label: 'Seguros', badge: null },
  { href: '/dashboard/properties', icon: HomeIcon, label: 'Imóveis', badge: null },
  { href: '/dashboard/agenda', icon: Calendar, label: 'Agenda', badge: null },
  { href: '/dashboard/settings', icon: Settings, label: 'Configurações', badge: null },
];

export function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [sessionTime, setSessionTime] = useState('0m');
  const [userAvatar, setUserAvatar] = useState<string | null>(session?.user?.image || null);
  const [userName, setUserName] = useState<string | null>(session?.user?.name || null);

  // Previne hidratação incorreta inicial
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (session?.user?.image) setUserAvatar(session.user.image);
    if (session?.user?.name) setUserName(session.user.name);
  }, [session?.user?.image, session?.user?.name]);

  useEffect(() => {
    // Busca foto e dados atualizados do banco ao carregar
    fetch('/api/settings/profile')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.image) setUserAvatar(data.image);
        if (data?.name) setUserName(data.name);
      })
      .catch(() => {});

    // Sincronização em tempo real via evento local
    const handleProfileSync = (e: any) => {
      if (e.detail?.image) setUserAvatar(e.detail.image);
      if (e.detail?.name) setUserName(e.detail.name);
    };

    window.addEventListener('profile-updated', handleProfileSync as EventListener);
    return () => window.removeEventListener('profile-updated', handleProfileSync as EventListener);
  }, []);

  useEffect(() => {
    setMounted(true);
    // Timer de sessão ativa a cada minuto
    const start = Date.now();
    const timer = setInterval(() => {
      const minutes = Math.floor((Date.now() - start) / 60000);
      if (minutes < 60) {
        setSessionTime(`${minutes}m`);
      } else {
        const hours = Math.floor(minutes / 60);
        const remMinutes = minutes % 60;
        setSessionTime(`${hours}h ${remMinutes}m`);
      }
    }, 60000);

    return () => clearInterval(timer);
  }, []);

  if (!mounted) return <div className="w-[280px] h-screen bg-slate-50/50 dark:bg-slate-950/50" />;

  const sidebarWidth = isCollapsed ? 84 : 280;

  return (
    <motion.aside
      initial={{ width: sidebarWidth }}
      animate={{ width: sidebarWidth }}
      transition={{ type: "spring", stiffness: 320, damping: 32 }}
      className={cn(
        "hidden md:flex flex-col h-screen sticky top-0 z-40 select-none",
        "bg-white/80 dark:bg-slate-950/80 backdrop-blur-2xl border-r border-slate-200/80 dark:border-slate-800/80",
        "shadow-[1px_0_30px_0_rgba(0,0,0,0.03)] dark:shadow-[1px_0_30px_0_rgba(0,0,0,0.35)]",
        "transition-colors duration-300"
      )}
    >
      {/* Header / Logo */}
      <div className="h-20 flex items-center justify-between px-5 relative border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="overflow-hidden">
          <Logo iconOnly={isCollapsed} />
        </div>
        
        {/* Toggle Collapse Button com efeito glassmorphism e glow */}
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label={isCollapsed ? "Expandir barra lateral" : "Recolher barra lateral"}
          className={cn(
            "absolute -right-3.5 top-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700",
            "rounded-full p-1.5 shadow-md text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400",
            "hover:scale-115 active:scale-95 transition-all duration-200 z-50",
            "hover:border-blue-500/50 hover:shadow-[0_0_12px_rgba(59,130,246,0.3)]"
          )}
        >
          <ChevronLeft className={cn("h-3.5 w-3.5 transition-transform duration-300", isCollapsed && "rotate-180")} />
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 py-6 px-3 space-y-1.5 overflow-y-auto overflow-x-hidden scrollbar-thin">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;
          
          return (
            <Link key={item.href} href={item.href} className="block relative group">
              <motion.div
                whileHover={{ x: isCollapsed ? 0 : 3 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "relative flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl transition-all duration-200",
                  isActive 
                    ? "text-blue-600 dark:text-blue-400 font-semibold shadow-xs" 
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100/60 dark:hover:bg-slate-800/40"
                )}
              >
                {/* Active Indicator Sliding Pill */}
                {isActive && (
                  <motion.div
                    layoutId="activeSidebarPill"
                    className="absolute inset-0 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200/70 dark:border-blue-800/60 rounded-xl"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  />
                )}

                {/* Animated Icon Container */}
                <div className={cn(
                  "relative z-10 flex items-center justify-center h-8 w-8 rounded-lg transition-transform duration-200 group-hover:scale-110",
                  isActive 
                    ? "bg-blue-600 text-white shadow-[0_0_14px_rgba(59,130,246,0.5)]" 
                    : "text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 bg-slate-100/60 dark:bg-slate-800/50"
                )}>
                  <Icon className="h-4 w-4" />
                </div>

                {/* Label & Badge */}
                <AnimatePresence mode="wait">
                  {!isCollapsed && (
                    <motion.div
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      transition={{ duration: 0.15 }}
                      className="flex items-center justify-between flex-1 relative z-10 overflow-hidden"
                    >
                      <span className="text-sm tracking-tight truncate">{item.label}</span>
                      {item.badge && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/60 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50">
                          {item.badge}
                        </span>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Tooltip for Collapsed State */}
                {isCollapsed && (
                  <div className="absolute left-full ml-3 px-2.5 py-1.5 bg-slate-900/95 dark:bg-slate-800/95 text-white text-xs font-medium rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-1 group-hover:translate-x-0 pointer-events-none z-50 border border-slate-700/50 whitespace-nowrap backdrop-blur-md">
                    {item.label}
                  </div>
                )}
              </motion.div>
            </Link>
          );
        })}
      </div>

      {/* Interactive User Card & Status Section */}
      <div className="p-3 border-t border-slate-200/60 dark:border-slate-800/60 relative">
        
        {/* User Card Interactive Popover / Expansion */}
        <AnimatePresence>
          {userMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="absolute bottom-full left-3 right-3 mb-2 p-3.5 rounded-2xl glass-panel border border-slate-200/80 dark:border-slate-700/60 shadow-2xl z-50 space-y-3"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-800/60">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Preferências
                </span>
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  Sessão: {sessionTime}
                </div>
              </div>

              {/* Theme Selector Light / Dark */}
              <div className="space-y-1.5">
                <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">Aparência do Sistema</p>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100/70 dark:bg-slate-900/70 p-1 rounded-xl border border-slate-200/50 dark:border-slate-800/50">
                  <button
                    onClick={() => setTheme('light')}
                    className={cn(
                      "flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg text-xs font-medium transition-all",
                      theme === 'light' 
                        ? "bg-white text-slate-900 shadow-xs" 
                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    )}
                  >
                    <Sun className="h-3.5 w-3.5 text-amber-500" /> Claro
                  </button>
                  <button
                    onClick={() => setTheme('dark')}
                    className={cn(
                      "flex items-center justify-center gap-2 py-1.5 px-2 rounded-lg text-xs font-medium transition-all",
                      theme === 'dark' 
                        ? "bg-slate-800 text-white shadow-xs" 
                        : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                    )}
                  >
                    <Moon className="h-3.5 w-3.5 text-blue-400" /> Escuro
                  </button>
                </div>
              </div>

              {/* Quick Profile Link & Logout */}
              <div className="pt-1 flex flex-col gap-1">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  asChild 
                  className="w-full justify-start text-xs h-8 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/60"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Link href="/dashboard/settings">
                    <Settings className="h-3.5 w-3.5 mr-2" /> Minha Conta
                  </Link>
                </Button>

                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="w-full justify-start text-xs h-8 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:text-rose-700"
                  onClick={() => signOut()}
                >
                  <LogOut className="h-3.5 w-3.5 mr-2" /> Desconectar
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* User Card Trigger */}
        <div
          onClick={() => setUserMenuOpen(!userMenuOpen)}
          className={cn(
            "relative rounded-xl p-2.5 transition-all duration-300 cursor-pointer",
            "bg-slate-100/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800/80",
            "hover:border-blue-500/40 hover:bg-white dark:hover:bg-slate-900/90 hover:shadow-lg",
            "flex items-center gap-3",
            isCollapsed ? "justify-center" : "",
            userMenuOpen && "border-blue-500/60 ring-2 ring-blue-500/20"
          )}
        >
          {/* Avatar com halo gradiente e ponto pulsante de status */}
          <div className="relative shrink-0">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName || "Corretor"}
                className="h-9 w-9 rounded-full object-cover shadow-md ring-2 ring-blue-500/40"
              />
            ) : (
              <div className="h-9 w-9 rounded-full bg-linear-to-tr from-blue-600 via-indigo-500 to-cyan-400 flex items-center justify-center shadow-md ring-2 ring-white dark:ring-slate-950 text-white font-bold text-xs">
                {userName?.charAt(0) || session?.user?.name?.charAt(0) || "L"}
              </div>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-950 animate-pulse" />
          </div>

          {/* User Details */}
          {!isCollapsed && (
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
                  {userName || session?.user?.name || "Lorenzzetti"}
                </p>
              </div>
              <p className="text-[11px] text-blue-600 dark:text-blue-400 font-medium truncate flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Corretor Pro
              </p>
            </div>
          )}

          {!isCollapsed && (
            <ChevronUp className={cn("h-4 w-4 text-slate-400 transition-transform duration-200", userMenuOpen && "rotate-180")} />
          )}
        </div>
      </div>
    </motion.aside>
  );
}