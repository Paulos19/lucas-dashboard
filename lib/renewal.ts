import { differenceInDays } from 'date-fns';

export type RenewalUrgencyStatus = 'expired' | 'urgent' | 'warning' | 'upcoming' | 'future' | 'none';

export interface RenewalUrgencyInfo {
  label: string;
  status: RenewalUrgencyStatus;
  days: number | null;
  badgeClass: string;
}

/**
 * Calcula a urgência e formatação do vencimento da apólice
 */
export function getRenewalUrgency(dataRenovacao: Date | string | null | undefined): RenewalUrgencyInfo {
  if (!dataRenovacao) {
    return {
      label: 'Sem data',
      status: 'none',
      days: null,
      badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700',
    };
  }

  const renewalDate = new Date(dataRenovacao);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  renewalDate.setHours(0, 0, 0, 0);

  const diffDays = differenceInDays(renewalDate, today);

  if (diffDays < 0) {
    const absDays = Math.abs(diffDays);
    return {
      label: absDays === 1 ? 'Venceu ontem' : `Vencida há ${absDays}d`,
      status: 'expired',
      days: diffDays,
      badgeClass: 'bg-rose-100 dark:bg-rose-950/70 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-800 font-semibold',
    };
  }

  if (diffDays === 0) {
    return {
      label: 'Vence HOJE 🚨',
      status: 'urgent',
      days: 0,
      badgeClass: 'bg-red-600 text-white border-red-700 font-bold animate-pulse shadow-xs',
    };
  }

  if (diffDays <= 7) {
    return {
      label: `Vence em ${diffDays}d 🔥`,
      status: 'urgent',
      days: diffDays,
      badgeClass: 'bg-red-100 dark:bg-red-950/70 text-red-700 dark:text-red-300 border-red-300 dark:border-red-800 font-bold',
    };
  }

  if (diffDays <= 15) {
    return {
      label: `Vence em ${diffDays}d ⚡`,
      status: 'warning',
      days: diffDays,
      badgeClass: 'bg-amber-100 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800 font-semibold',
    };
  }

  if (diffDays <= 30) {
    return {
      label: `Vence em ${diffDays}d`,
      status: 'upcoming',
      days: diffDays,
      badgeClass: 'bg-yellow-100 dark:bg-yellow-950/70 text-yellow-800 dark:text-yellow-200 border-yellow-300 dark:border-yellow-700 font-medium',
    };
  }

  return {
    label: `Vence em ${diffDays}d`,
    status: 'future',
    days: diffDays,
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
  };
}
