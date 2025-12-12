'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
}

export function Logo({ className, iconOnly = false }: LogoProps) {
  return (
    <div className={cn("flex items-center gap-3 select-none", className)}>
      <div className="relative flex items-center justify-center w-10 h-10">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full text-blue-600 dark:text-blue-500"
        >
          {/* Fundo do Escudo */}
          <motion.path
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1, ease: "easeInOut" }}
            d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="stroke-current"
          />
          {/* Elemento interno (Gráfico/Tech) */}
          <motion.path
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5, type: "spring", stiffness: 200 }}
            d="M9 12L11 14L15 10"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        
        {/* Glow Effect (Subtle) */}
        <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full -z-10" />
      </div>

      {!iconOnly && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col"
        >
          <span className="font-bold text-xl tracking-tight text-slate-900 dark:text-white leading-none">
            LUCAS<span className="text-blue-600">.ai</span>
          </span>
          <span className="text-[10px] uppercase tracking-widest text-slate-500 font-medium ml-0.5">
            Intelligence
          </span>
        </motion.div>
      )}
    </div>
  );
}