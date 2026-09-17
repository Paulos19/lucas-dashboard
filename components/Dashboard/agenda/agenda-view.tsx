'use client';

import { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  format,
  isSameDay,
  addHours,
  setHours,
  setMinutes,
  isFuture,
  isPast,
  isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Clock,
  CheckCircle2,
  CalendarDays,
  Phone,
  Sparkles,
  MessageSquare,
  Bot,
  Zap,
  Check,
  X,
  Plus,
  Loader2,
  ExternalLink,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

/* ═══════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════ */

interface LeadItem {
  id: string;
  name: string;
  contato: string;
  numeroApolice?: string | null;
  ramo?: string | null;
  status?: string | null;
  agencia?: string | null;
  corretorNome?: string | null;
}

interface AgendamentoItem {
  id: string;
  dataHora: string | Date;
  tipo: string;
  status: string;
  resumo?: string | null;
  leadId: string;
  lead?: LeadItem | null;
  createdAt: string | Date;
}

interface SlotItem {
  id: string;
  startTime: string | Date;
  endTime: string | Date;
  isBooked: boolean;
  leadId?: string | null;
}

interface AgendaViewProps {
  agendamentos: AgendamentoItem[];
  slots: SlotItem[];
}

const WORKING_HOURS = [
  '08:00', '09:00', '10:00', '11:00', '12:00', '13:00', 
  '14:00', '15:00', '16:00', '17:00', '18:00', '19:00'
];

/* ═══════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */

export function AgendaView({ agendamentos, slots }: AgendaViewProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [activeTab, setActiveTab] = useState<'daily-grid' | 'ai-reservations'>('daily-grid');
  const [loadingAction, setLoadingAction] = useState(false);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [selectedDaySlots, setSelectedDaySlots] = useState<string[]>([
    '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'
  ]);
  const [bulkWeeks, setBulkWeeks] = useState<number>(2);
  const [leadSearchTerm, setLeadSearchTerm] = useState('');

  const router = useRouter();

  /* ── Highlights do Calendário ──────────────────────────────── */
  const appointmentDates = useMemo(
    () => agendamentos.filter(a => a.status !== 'CANCELADO').map(a => new Date(a.dataHora)),
    [agendamentos]
  );

  const slotDates = useMemo(
    () => slots.filter(s => !s.isBooked).map(s => new Date(s.startTime)),
    [slots]
  );

  /* ── Dados do Dia Selecionado ──────────────────────────────── */
  const appointmentsToday = useMemo(
    () => agendamentos.filter(a => date && a.status !== 'CANCELADO' && isSameDay(new Date(a.dataHora), date)),
    [agendamentos, date]
  );

  const slotsToday = useMemo(
    () => slots.filter(s => date && !s.isBooked && isSameDay(new Date(s.startTime), date)),
    [slots, date]
  );

  /* ── Reservas Feitas pelos Leads Filtradas ──────────────────── */
  const filteredReservations = useMemo(() => {
    return agendamentos
      .filter(a => a.status !== 'CANCELADO')
      .filter(a => {
        if (!leadSearchTerm.trim()) return true;
        const t = leadSearchTerm.toLowerCase();
        return (
          a.lead?.name?.toLowerCase().includes(t) ||
          a.lead?.contato?.includes(t) ||
          a.tipo?.toLowerCase().includes(t) ||
          a.resumo?.toLowerCase().includes(t)
        );
      })
      .sort((a, b) => new Date(b.dataHora).getTime() - new Date(a.dataHora).getTime());
  }, [agendamentos, leadSearchTerm]);

  /* ── Salvar Horários Abertos para o Dia Selecionado ─────────── */
  const handleSaveDaySlots = async () => {
    if (!date) return;
    setLoadingAction(true);

    try {
      const slotsPayload = selectedDaySlots.map(hourStr => {
        const [h, m] = hourStr.split(':').map(Number);
        const start = setMinutes(setHours(date, h), m);
        const end = addHours(start, 1);
        return {
          startISO: start.toISOString(),
          endISO: end.toISOString()
        };
      });

      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: slotsPayload })
      });

      if (!res.ok) throw new Error();
      toast.success(`${slotsPayload.length} horários salvos para ${format(date, "dd/MM")}!`);
      setIsSlotModalOpen(false);
      router.refresh();
    } catch {
      toast.error("Erro ao salvar horários.");
    } finally {
      setLoadingAction(false);
    }
  };

  /* ── Excluir um Horário Específico ─────────────────────────── */
  const handleDeleteSlot = async (slotId: string) => {
    try {
      const res = await fetch(`/api/availability?id=${slotId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success("Horário fechado.");
      router.refresh();
    } catch {
      toast.error("Erro ao fechar horário.");
    }
  };

  /* ── Liberar Todo o Dia Comercial ──────────────────────────── */
  const handleOpenWholeDay = async () => {
    if (!date) return;
    setLoadingAction(true);

    try {
      const businessHours = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
      const slotsPayload = businessHours.map(hourStr => {
        const [h, m] = hourStr.split(':').map(Number);
        const start = setMinutes(setHours(date, h), m);
        const end = addHours(start, 1);
        return {
          startISO: start.toISOString(),
          endISO: end.toISOString()
        };
      });

      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots: slotsPayload })
      });

      if (!res.ok) throw new Error();
      toast.success(`Horário comercial completo liberado para ${format(date, "dd/MM")}!`);
      router.refresh();
    } catch {
      toast.error("Erro ao liberar horários do dia.");
    } finally {
      setLoadingAction(false);
    }
  };

  /* ── Bloquear Todo o Dia ────────────────────────────────────── */
  const handleBlockWholeDay = async () => {
    if (!date) return;
    setLoadingAction(true);

    try {
      const res = await fetch(`/api/availability?dateISO=${date.toISOString()}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success(`Todos os horários livres de ${format(date, "dd/MM")} foram fechados.`);
      router.refresh();
    } catch {
      toast.error("Erro ao bloquear dia.");
    } finally {
      setLoadingAction(false);
    }
  };

  /* ── Liberar Semanas Comerciais em Lote ─────────────────────── */
  const handleGenerateCommercialWeeks = async () => {
    setLoadingAction(true);
    try {
      const daysCount = bulkWeeks * 7;
      const res = await fetch('/api/availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: 'business_days',
          daysCount,
          startHour: 9,
          endHour: 18,
          excludeLunch: true,
          intervalMinutes: 60
        })
      });

      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(data.message || `Horários comerciais liberados para ${bulkWeeks} semanas!`);
      setIsBulkModalOpen(false);
      router.refresh();
    } catch {
      toast.error("Erro ao liberar semanas comerciais.");
    } finally {
      setLoadingAction(false);
    }
  };

  /* ── Cancelar Agendamento do Lead ───────────────────────────── */
  const handleCancelAppointment = async (apptId: string) => {
    try {
      const res = await fetch(`/api/agendamentos/${apptId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELADO' })
      });
      if (!res.ok) throw new Error();
      toast.success("Reserva cancelada e horário reaberto.");
      router.refresh();
    } catch {
      toast.error("Erro ao cancelar reserva.");
    }
  };

  /* ── WhatsApp Direto para o Lead ────────────────────────────── */
  const handleOpenWhatsApp = (appt: AgendamentoItem) => {
    if (!appt.lead?.contato) {
      toast.error("Lead sem telefone cadastrado.");
      return;
    }
    const cleanPhone = appt.lead.contato.replace(/\D/g, '');
    const dataFmt = format(new Date(appt.dataHora), "EEEE, dd 'de' MMMM 'às' HH:mm", { locale: ptBR });
    const msg = encodeURIComponent(
      `Olá ${appt.lead.name}, tudo bem? O Lucas me avisou sobre nossa reunião de cotação agendada para ${dataFmt}. Estou à disposição para tirar qualquer dúvida!`
    );
    window.open(`https://wa.me/55${cleanPhone}?text=${msg}`, '_blank');
  };

  const selectedLabel = date
    ? format(date, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })
    : '';

  return (
    <div className="space-y-6">

      {/* Barra de Abas e Ações Globais */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Segmented Control */}
        <div className="flex p-1 rounded-xl bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/60 dark:border-slate-800/60 shrink-0">
          
          <button
            onClick={() => setActiveTab('daily-grid')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'daily-grid'
                ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Disponibilidade do Dia</span>
          </button>

          <button
            onClick={() => setActiveTab('ai-reservations')}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'ai-reservations'
                ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>Reservas Feitas pelos Leads</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 font-bold">
              {agendamentos.filter(a => a.status !== 'CANCELADO').length}
            </span>
          </button>

        </div>

        {/* Botões de Ação Rápida */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            onClick={() => {
              const currentOpenHours = slotsToday.map(s => format(new Date(s.startTime), 'HH:mm'));
              setSelectedDaySlots(currentOpenHours.length > 0 ? currentOpenHours : ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']);
              setIsSlotModalOpen(true);
            }}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white cursor-pointer text-xs gap-1.5 shadow-md shadow-emerald-500/20 font-semibold h-9"
          >
            <Plus className="w-4 h-4" />
            <span>Reservar / Disponibilizar Horário</span>
          </Button>

          <Button
            variant="outline"
            onClick={() => setIsBulkModalOpen(true)}
            className="border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 text-slate-700 dark:text-slate-300 cursor-pointer text-xs gap-1.5 h-9"
          >
            <Zap className="w-4 h-4 text-emerald-500" />
            <span>Liberar Semanas (Seg-Sex)</span>
          </Button>
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MODO 1: DISPONIBILIDADE DO DIA (COMPACTO, SEM QUEBRAR O HEIGHT)
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'daily-grid' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* Coluna Esquerda: Calendário & Controles */}
          <aside className="lg:col-span-4 xl:col-span-4 space-y-4">
            
            {/* Calendário */}
            <div className="glass-panel p-4 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                locale={ptBR}
                className="w-full"
                classNames={{
                  day_selected: 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold hover:bg-emerald-700 shadow-md shadow-emerald-500/30',
                  day_today: 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold border border-slate-300 dark:border-slate-700',
                }}
                modifiers={{
                  booked: appointmentDates,
                  available: slotDates,
                }}
                modifiersClassNames={{
                  booked: 'relative after:absolute after:bottom-[3px] after:left-1/2 after:-translate-x-[calc(50%+3px)] after:w-1.5 after:h-1.5 after:rounded-full after:bg-blue-500',
                  available: 'relative after:absolute after:bottom-[3px] after:left-1/2 after:-translate-x-[calc(50%-3px)] after:w-1.5 after:h-1.5 after:rounded-full after:bg-emerald-500',
                }}
              />
            </div>

            {/* Legenda de Status */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 text-xs space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Identificação do Calendário
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Horários Livres para a IA</span>
                </div>
                <span className="text-xs text-slate-500 font-bold">{slotsToday.length}</span>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                  <span className="text-slate-700 dark:text-slate-300 font-medium">Reunião Reservada por Lead</span>
                </div>
                <span className="text-xs text-slate-500 font-bold">{appointmentsToday.length}</span>
              </div>
            </div>

            {/* Ações Rápidas para o Dia */}
            <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Ações no Dia Selecionado
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenWholeDay}
                disabled={loadingAction}
                className="w-full justify-start text-xs border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 cursor-pointer h-9 font-medium"
              >
                <Sparkles className="w-3.5 h-3.5 mr-2 text-emerald-600" />
                <span>Liberar Todo o Dia (09h às 18h)</span>
              </Button>

              {slotsToday.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleBlockWholeDay}
                  disabled={loadingAction}
                  className="w-full justify-start text-xs text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 cursor-pointer h-9 font-medium"
                >
                  <X className="w-3.5 h-3.5 mr-2" />
                  <span>Bloquear este Dia (Fechar Livres)</span>
                </Button>
              )}
            </div>

          </aside>

          {/* Coluna Direita: Conteúdo Compacto do Dia */}
          <main className="lg:col-span-8 xl:col-span-8 space-y-5">
            
            {/* Header da Data Selecionada */}
            <div className="glass-panel p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
              <div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-50 capitalize">
                  {selectedLabel || 'Selecione uma data'}
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Gerencie sua disponibilidade. A IA do n8n consultará esses horários durante as conversas no WhatsApp.
                </p>
              </div>

              <Button
                size="sm"
                onClick={() => {
                  const currentOpenHours = slotsToday.map(s => format(new Date(s.startTime), 'HH:mm'));
                  setSelectedDaySlots(currentOpenHours.length > 0 ? currentOpenHours : ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']);
                  setIsSlotModalOpen(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer text-xs gap-1.5 font-semibold h-9 shadow-xs shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Reservar Horário</span>
              </Button>
            </div>

            {/* SEÇÃO 1: REUNIÕES RESERVADAS PELOS LEADS NO DIA */}
            {appointmentsToday.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <CheckCircle2 className="w-4 h-4 text-blue-500" />
                  <span>Reuniões Agendadas por Leads ({appointmentsToday.length})</span>
                </div>

                <div className="space-y-2.5">
                  {appointmentsToday.map((appt) => {
                    const horaFmt = format(new Date(appt.dataHora), 'HH:mm');

                    return (
                      <div
                        key={appt.id}
                        className="glass-card p-4 rounded-2xl border-2 border-blue-300/80 dark:border-blue-700/80 bg-gradient-to-r from-blue-50/70 via-indigo-50/40 to-transparent dark:from-blue-950/40 dark:via-indigo-950/20 dark:to-transparent flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs"
                      >
                        <div className="flex items-start gap-3.5">
                          <div className="p-2.5 rounded-xl bg-blue-600 text-white font-black text-sm tracking-tight text-center shrink-0 min-w-[65px] shadow-xs">
                            {horaFmt}
                          </div>

                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <Link
                                href={`/dashboard/leads/${appt.leadId}`}
                                className="text-sm font-bold text-slate-900 dark:text-slate-50 hover:text-blue-600 transition-colors flex items-center gap-1"
                              >
                                <span>{appt.lead?.name || 'Cliente'}</span>
                                <ExternalLink className="w-3 h-3 opacity-60" />
                              </Link>

                              <Badge className="bg-blue-600 text-white text-[10px] font-semibold gap-1">
                                <Bot className="w-2.5 h-2.5" /> Reservado via WhatsApp
                              </Badge>

                              <Badge variant="outline" className="text-[10px] text-slate-600 dark:text-slate-300">
                                {appt.tipo.replace('_', ' ')}
                              </Badge>
                            </div>

                            {appt.lead?.contato && (
                              <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-slate-400" />
                                <span>{appt.lead.contato}</span>
                              </div>
                            )}

                            {appt.resumo && (
                              <p className="text-xs text-slate-600 dark:text-slate-400 italic bg-white/80 dark:bg-slate-900/60 p-2 rounded-lg border border-slate-200/60 dark:border-slate-800/60 max-w-xl">
                                &ldquo;{appt.resumo}&rdquo;
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleOpenWhatsApp(appt)}
                            className="border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 hover:bg-emerald-100 cursor-pointer text-xs gap-1.5 h-8 font-semibold"
                          >
                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                            <span>WhatsApp</span>
                          </Button>

                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCancelAppointment(appt.id)}
                            className="text-xs text-slate-400 hover:text-rose-600 cursor-pointer h-8"
                            title="Cancelar e reabrir horário"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SEÇÃO 2: HORÁRIOS DISPONÍVEIS PARA O LUCAS AI (GRADE COMPACTA) */}
            <div className="glass-panel p-5 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Horários Abertos para o Lucas AI ({slotsToday.length})
                  </h3>
                </div>

                <button
                  onClick={() => {
                    const currentOpenHours = slotsToday.map(s => format(new Date(s.startTime), 'HH:mm'));
                    setSelectedDaySlots(currentOpenHours.length > 0 ? currentOpenHours : ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']);
                    setIsSlotModalOpen(true);
                  }}
                  className="text-xs text-emerald-600 dark:text-emerald-400 font-bold hover:underline cursor-pointer flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Editar / Adicionar Horários</span>
                </button>
              </div>

              {slotsToday.length === 0 ? (
                <div className="text-center py-10 px-4 rounded-2xl border-dashed border-2 border-slate-300 dark:border-slate-800 space-y-3">
                  <Clock className="w-8 h-8 text-emerald-500/60 mx-auto" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                      Nenhum horário aberto para este dia
                    </p>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto">
                      A IA não oferecerá este dia para clientes até que você disponibilize ao menos um horário.
                    </p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedDaySlots(['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00']);
                      setIsSlotModalOpen(true);
                    }}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer text-xs gap-1.5 font-semibold"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Reservar Horários</span>
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                  {slotsToday.map((slot) => {
                    const startFmt = format(new Date(slot.startTime), 'HH:mm');
                    const endFmt = format(new Date(slot.endTime), 'HH:mm');

                    return (
                      <div
                        key={slot.id}
                        className="group relative p-3 rounded-2xl border border-emerald-300/80 dark:border-emerald-800/80 bg-emerald-50/50 dark:bg-emerald-950/20 flex items-center justify-between hover:shadow-xs hover:border-emerald-400 transition-all"
                      >
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                          <div>
                            <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block leading-tight">
                              {startFmt} - {endFmt}
                            </span>
                            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium block">
                              Livre para a IA
                            </span>
                          </div>
                        </div>

                        <button
                          onClick={() => handleDeleteSlot(slot.id)}
                          title="Fechar este horário"
                          className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-rose-600 transition-opacity cursor-pointer p-1"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </main>

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODO 2: TODAS AS RESERVAS FEITAS PELOS LEADS (FEED DA IA)
          ═══════════════════════════════════════════════════════════════ */}
      {activeTab === 'ai-reservations' && (
        <div className="space-y-4">
          
          {/* Barra de Busca de Reservas */}
          <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <Input
                placeholder="Buscar por nome do cliente, telefone ou resumo da conversa..."
                value={leadSearchTerm}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setLeadSearchTerm(e.target.value)}
                className="pl-10 text-xs bg-white/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="text-xs text-slate-500 dark:text-slate-400">
              Total de reservas ativas: <strong>{filteredReservations.length}</strong>
            </div>
          </div>

          {/* Lista de Reservas dos Leads */}
          {filteredReservations.length === 0 ? (
            <div className="text-center py-20 px-4 glass-panel rounded-3xl border-dashed border-2 border-slate-300 dark:border-slate-800 space-y-2">
              <Bot className="w-12 h-12 text-slate-400 mx-auto opacity-50" />
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
                Nenhum agendamento realizado pelos leads ainda
              </h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Assim que os clientes no WhatsApp escolherem um dos seus horários livres, eles aparecerão automaticamente aqui com todos os detalhes da cotação.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredReservations.map((appt) => {
                const dateObj = new Date(appt.dataHora);
                const diaFormatado = format(dateObj, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
                const horaFormatada = format(dateObj, 'HH:mm');
                const isPastMeeting = isPast(dateObj) && !isToday(dateObj);

                return (
                  <div
                    key={appt.id}
                    className={`glass-card p-5 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 hover:border-blue-500/40 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                      isPastMeeting ? 'opacity-70 bg-slate-50/40 dark:bg-slate-900/40' : ''
                    }`}
                  >
                    <div className="flex items-start gap-4">
                      {/* Bloco de Data e Hora */}
                      <div className="p-3 rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-200/70 dark:border-blue-800/70 text-center shrink-0 min-w-[85px]">
                        <span className="block text-[10px] font-bold uppercase tracking-wider text-blue-500">
                          {format(dateObj, 'MMM yyyy', { locale: ptBR })}
                        </span>
                        <span className="block text-2xl font-black text-slate-900 dark:text-slate-100 leading-none my-1">
                          {format(dateObj, 'dd')}
                        </span>
                        <span className="block text-xs font-bold text-blue-600 dark:text-blue-400">
                          {horaFormatada}
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/dashboard/leads/${appt.leadId}`}
                            className="text-base font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 transition-colors flex items-center gap-1"
                          >
                            <span>{appt.lead?.name || 'Cliente'}</span>
                            <ExternalLink className="w-3 h-3 opacity-60" />
                          </Link>
                          
                          <Badge className="text-[10px] bg-blue-600 text-white gap-1 font-semibold">
                            <Bot className="w-2.5 h-2.5" /> Reservado pelo Lucas AI
                          </Badge>

                          <Badge variant="outline" className="text-[10px]">
                            {appt.tipo.replace('_', ' ')}
                          </Badge>
                        </div>

                        <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                          {diaFormatado}
                        </div>

                        {appt.lead?.contato && (
                          <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-slate-400" />
                            <span>{appt.lead.contato}</span>
                          </div>
                        )}

                        {appt.resumo && (
                          <div className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50/80 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/50 dark:border-slate-800/50 mt-1 max-w-xl">
                            <span className="font-semibold text-blue-600 dark:text-blue-400 block text-[10px] uppercase">
                              Resumo da conversa no WhatsApp:
                            </span>
                            {appt.resumo}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenWhatsApp(appt)}
                        className="text-xs text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 cursor-pointer h-8 gap-1.5 font-semibold"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>WhatsApp</span>
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleCancelAppointment(appt.id)}
                        className="text-xs text-slate-400 hover:text-rose-600 cursor-pointer h-8"
                      >
                        Cancelar Reserva
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: RESERVAR / DISPONIBILIZAR HORÁRIOS DO DIA
          ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={isSlotModalOpen} onOpenChange={setIsSlotModalOpen}>
        <DialogContent className="sm:max-w-[500px] p-6 border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl space-y-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
              <Clock className="w-3.5 h-3.5" />
              <span>Disponibilidade do Corretor</span>
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Reservar Horários de Atendimento
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              Selecione quais horários você deseja abrir em <strong className="text-slate-700 dark:text-slate-300">{selectedLabel}</strong> para o Lucas AI oferecer aos clientes no WhatsApp.
            </DialogDescription>
          </div>

          <div className="space-y-3 py-2">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-slate-300">
              <span>Selecione as faixas de horário:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedDaySlots(['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'])}
                  className="text-[11px] text-emerald-600 hover:underline cursor-pointer font-bold"
                >
                  Comercial (09h-18h)
                </button>
                <span className="text-slate-300">•</span>
                <button
                  type="button"
                  onClick={() => setSelectedDaySlots([])}
                  className="text-[11px] text-slate-500 hover:underline cursor-pointer"
                >
                  Limpar
                </button>
              </div>
            </div>

            {/* Grade de Chips de Horários */}
            <div className="grid grid-cols-4 gap-2">
              {WORKING_HOURS.map(hour => {
                const isSelected = selectedDaySlots.includes(hour);
                return (
                  <button
                    key={hour}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedDaySlots(selectedDaySlots.filter(h => h !== hour));
                      } else {
                        setSelectedDaySlots([...selectedDaySlots, hour]);
                      }
                    }}
                    className={`py-2.5 px-1 text-xs font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-400'
                    }`}
                  >
                    {isSelected ? '✓' : '+'} {hour}
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              💡 Duração de 1 hora por atendimento. O Lucas AI consultará esses horários e reservará automaticamente assim que o lead escolher.
            </p>
          </div>

          <DialogFooter className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSlotModalOpen(false)}
              className="text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSaveDaySlots}
              disabled={loadingAction || selectedDaySlots.length === 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs cursor-pointer gap-1.5 font-semibold"
            >
              {loadingAction ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Confirmar {selectedDaySlots.length} Horários</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: LIBERAR SEMANAS COMERCIAIS EM LOTE (09h às 18h)
          ═══════════════════════════════════════════════════════════════ */}
      <Dialog open={isBulkModalOpen} onOpenChange={setIsBulkModalOpen}>
        <DialogContent className="sm:max-w-[460px] p-6 border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl space-y-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200">
              <Zap className="w-3.5 h-3.5" />
              <span>Automação em Lote</span>
            </div>
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-100">
              Liberar Horário Comercial
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500 leading-relaxed">
              Ativa horários de 1 hora de <strong>Segunda a Sexta, das 09h às 18h</strong> (com pausa de almoço das 12h às 13h) para que a IA possa oferecer no WhatsApp.
            </DialogDescription>
          </div>

          <div className="space-y-3 py-2">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Selecione a Duração
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 4].map(weeks => (
                <button
                  key={weeks}
                  type="button"
                  onClick={() => setBulkWeeks(weeks)}
                  className={`py-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    bulkWeeks === weeks
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:border-emerald-400'
                  }`}
                >
                  {weeks === 1 ? '1 Semana' : weeks === 2 ? '2 Semanas' : '1 Mês (4 sem)'}
                </button>
              ))}
            </div>

            <p className="text-[11px] text-slate-400 dark:text-slate-500">
              ℹ️ O sistema não cria horários duplicados e pula finais de semana e horários que já passaram.
            </p>
          </div>

          <DialogFooter className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsBulkModalOpen(false)}
              className="text-xs cursor-pointer"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleGenerateCommercialWeeks}
              disabled={loadingAction}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs cursor-pointer gap-1.5 font-semibold"
            >
              {loadingAction ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Liberar {bulkWeeks} {bulkWeeks === 1 ? 'Semana' : 'Semanas'}</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}