'use client';

import { useState, useMemo } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogDescription,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
    format,
    isSameDay,
    addHours,
    setHours,
    setMinutes,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    Clock,
    CalendarCheck,
    User,
    Plus,
    Trash2,
    Loader2,
    Video,
    CheckCircle2,
    CalendarDays,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

/* ═══════════════════════════════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════════════════════════════ */

interface AgendaViewProps {
    agendamentos: any[];
    slots: any[];
}

/* ═══════════════════════════════════════════════════════════════════════
   COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */

export function AgendaView({ agendamentos, slots }: AgendaViewProps) {
    const [date, setDate] = useState<Date | undefined>(new Date());
    const [loading, setLoading] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [newSlotTime, setNewSlotTime] = useState('09:00');
    const [dialogOpen, setDialogOpen] = useState(false);
    const router = useRouter();

    /* ── filtros por dia selecionado ────────────────────────────── */
    const appointmentsToday = useMemo(
        () => agendamentos.filter(a => date && isSameDay(new Date(a.dataHora), date)),
        [agendamentos, date],
    );
    const slotsToday = useMemo(
        () => slots.filter(s => date && isSameDay(new Date(s.startTime), date)),
        [slots, date],
    );

    /* ── dias com eventos (para highlights do calendário) ───────── */
    const appointmentDates = useMemo(() => agendamentos.map(a => new Date(a.dataHora)), [agendamentos]);
    const slotDates = useMemo(() => slots.map(s => new Date(s.startTime)), [slots]);

    /* ── handlers ──────────────────────────────────────────────── */
    const handleCreateSlot = async () => {
        if (!date || !newSlotTime) return;
        setLoading(true);
        try {
            const [h, m] = newSlotTime.split(':').map(Number);
            const start = setMinutes(setHours(date, h), m);
            const end = addHours(start, 1);
            const res = await fetch('/api/availability', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ startISO: start.toISOString(), endISO: end.toISOString() }),
            });
            if (!res.ok) throw new Error();
            toast.success('Horário disponibilizado!');
            setDialogOpen(false);
            router.refresh();
        } catch {
            toast.error('Erro ao criar horário.');
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteSlot = async (id: string) => {
        setDeletingId(id);
        try {
            const res = await fetch(`/api/availability?id=${id}`, { method: 'DELETE' });
            if (res.ok) { toast.success('Horário removido.'); router.refresh(); }
        } catch {
            toast.error('Erro ao remover.');
        } finally {
            setDeletingId(null);
        }
    };

    const selectedLabel = date
        ? format(date, "EEEE, d 'de' MMMM", { locale: ptBR })
        : '';

    /* ═══════════════════════════════════════════════════════════════════
       RENDER
       ═══════════════════════════════════════════════════════════════════ */
    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* ─────────── COLUNA ESQUERDA ─────────── */}
            <aside className="lg:col-span-4 xl:col-span-4 space-y-5">

                {/* CALENDÁRIO */}
                <Card className="overflow-hidden border-0 shadow-xl bg-white dark:bg-slate-900 ring-1 ring-slate-200/80 dark:ring-slate-700/60">
                    <CardContent className="p-3 pb-4">
                        <Calendar
                            mode="single"
                            selected={date}
                            onSelect={setDate}
                            locale={ptBR}
                            className="w-full"
                            classNames={{
                                day_selected:
                                    'bg-blue-600 text-white hover:bg-blue-700 focus:bg-blue-700',
                                day_today:
                                    'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-white font-bold',
                            }}
                            modifiers={{
                                booked: appointmentDates,
                                available: slotDates,
                            }}
                            modifiersClassNames={{
                                booked:
                                    'relative after:absolute after:bottom-[2px] after:left-1/2 after:-translate-x-[calc(50%+3px)] after:w-1.5 after:h-1.5 after:rounded-full after:bg-blue-500',
                                available:
                                    'relative after:absolute after:bottom-[2px] after:left-1/2 after:-translate-x-[calc(50%-3px)] after:w-1.5 after:h-1.5 after:rounded-full after:bg-emerald-500',
                            }}
                        />
                    </CardContent>
                </Card>

                {/* LEGENDA */}
                <Card className="border-0 shadow-md bg-white dark:bg-slate-900 ring-1 ring-slate-200/80 dark:ring-slate-700/60">
                    <CardContent className="px-5 py-4">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
                            Legenda
                        </p>
                        <div className="space-y-2.5">
                            <div className="flex items-center gap-3">
                                <span className="w-3 h-3 rounded-full bg-blue-500 shrink-0" />
                                <span className="text-sm text-slate-700 dark:text-slate-300">Reunião agendada</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0" />
                                <span className="text-sm text-slate-700 dark:text-slate-300">Horário livre (disponível)</span>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="w-3 h-3 rounded-full bg-slate-300 dark:bg-slate-600 shrink-0" />
                                <span className="text-sm text-slate-700 dark:text-slate-300">Sem atividade</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* RESUMO DO DIA */}
                <Card className="border-0 shadow-md bg-white dark:bg-slate-900 ring-1 ring-slate-200/80 dark:ring-slate-700/60">
                    <CardContent className="px-5 py-4">
                        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3">
                            {date ? format(date, "dd 'de' MMMM", { locale: ptBR }) : 'Resumo'}
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="text-center p-3 rounded-xl bg-blue-50 dark:bg-blue-950/30 ring-1 ring-blue-200/60 dark:ring-blue-800/30">
                                <span className="block text-2xl font-black text-blue-600 dark:text-blue-400">
                                    {appointmentsToday.length}
                                </span>
                                <span className="text-[11px] font-semibold text-blue-500/80 dark:text-blue-400/70">
                                    Reuniões
                                </span>
                            </div>
                            <div className="text-center p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/30 ring-1 ring-emerald-200/60 dark:ring-emerald-800/30">
                                <span className="block text-2xl font-black text-emerald-600 dark:text-emerald-400">
                                    {slotsToday.length}
                                </span>
                                <span className="text-[11px] font-semibold text-emerald-500/80 dark:text-emerald-400/70">
                                    Disponíveis
                                </span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </aside>

            {/* ─────────── COLUNA DIREITA ─────────── */}
            <main className="lg:col-span-8 xl:col-span-8">

                {/* CABEÇALHO + BOTÃO */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white capitalize">
                            {selectedLabel || 'Selecione uma data'}
                        </h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                            {appointmentsToday.length} reuniões · {slotsToday.length} horários livres
                        </p>
                    </div>

                    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                        <DialogTrigger asChild>
                            <Button className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/20">
                                <Plus className="h-4 w-4" /> Abrir Horário
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-[380px]">
                            <DialogHeader>
                                <DialogTitle>Disponibilizar Horário</DialogTitle>
                                <DialogDescription>
                                    {date
                                        ? `Horário para ${format(date, "d 'de' MMMM", { locale: ptBR })}.`
                                        : 'Selecione uma data primeiro.'}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="grid gap-4 py-2">
                                <div className="grid gap-2">
                                    <Label>Horário de Início</Label>
                                    <Select onValueChange={setNewSlotTime} defaultValue={newSlotTime}>
                                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                                        <SelectContent>
                                            {Array.from({ length: 13 }, (_, i) => {
                                                const t = `${(i + 8).toString().padStart(2, '0')}:00`;
                                                return <SelectItem key={t} value={t}>{t}</SelectItem>;
                                            })}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-slate-500">Duração fixa de 1 hora.</p>
                                </div>
                                <Button onClick={handleCreateSlot} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>

                {/* ─── SEÇÃO: REUNIÕES AGENDADAS ─── */}
                <section className="mb-8">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 rounded-lg bg-blue-100 dark:bg-blue-900/40">
                            <CalendarCheck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Reuniões do Dia
                        </h3>
                    </div>

                    {appointmentsToday.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700/60 bg-slate-50/50 dark:bg-slate-800/10">
                            <CalendarDays className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                Nenhuma reunião agendada
                            </p>
                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                                O Lucas preencherá automaticamente quando clientes agendarem.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {appointmentsToday.map(appt => (
                                <Card
                                    key={appt.id}
                                    className="overflow-hidden border-0 shadow-md ring-1 ring-blue-100 dark:ring-blue-900/30 bg-white dark:bg-slate-900 hover:shadow-lg transition-shadow"
                                >
                                    <CardContent className="p-0 flex flex-col sm:flex-row">
                                        {/* Hora */}
                                        <div className="px-5 py-4 sm:py-5 bg-blue-50 dark:bg-blue-950/30 flex sm:flex-col items-center sm:items-center justify-center sm:min-w-[100px] gap-2 sm:gap-1 border-b sm:border-b-0 sm:border-r border-blue-100 dark:border-blue-900/30">
                                            <Clock className="h-4 w-4 text-blue-500 dark:text-blue-400 sm:mb-1" />
                                            <span className="text-lg font-black text-blue-700 dark:text-blue-300">
                                                {format(new Date(appt.dataHora), 'HH:mm')}
                                            </span>
                                        </div>

                                        {/* Conteúdo */}
                                        <div className="flex-1 p-4 sm:p-5">
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <h4 className="font-bold text-base text-slate-900 dark:text-white">
                                                        {appt.lead?.name || 'Cliente'}
                                                    </h4>
                                                    <div className="flex flex-wrap items-center gap-3 mt-1.5">
                                                        {appt.lead?.contato && (
                                                            <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                                <User className="h-3 w-3" /> {appt.lead.contato}
                                                            </span>
                                                        )}
                                                        <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                            <Video className="h-3 w-3" /> Online
                                                        </span>
                                                    </div>
                                                </div>

                                                <Badge
                                                    variant="outline"
                                                    className="shrink-0 text-[10px] font-semibold gap-1 bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800"
                                                >
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    {appt.status === 'CONFIRMADO' ? 'Confirmado' : appt.status}
                                                </Badge>
                                            </div>

                                            {appt.resumo && (
                                                <p className="mt-3 text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg ring-1 ring-slate-100 dark:ring-slate-700/50">
                                                    &ldquo;{appt.resumo}&rdquo;
                                                </p>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </section>

                {/* ─── SEÇÃO: HORÁRIOS LIVRES ─── */}
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 rounded-lg bg-emerald-100 dark:bg-emerald-900/40">
                            <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <h3 className="text-sm font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                            Horários Disponíveis
                        </h3>
                    </div>

                    {slotsToday.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 rounded-xl border-2 border-dashed border-emerald-200 dark:border-emerald-800/40 bg-emerald-50/20 dark:bg-emerald-950/5">
                            <Clock className="h-10 w-10 text-emerald-300 dark:text-emerald-700 mb-3" />
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
                                Nenhum horário livre neste dia
                            </p>
                            <Button
                                variant="link"
                                className="text-blue-600 dark:text-blue-400 mt-1 text-sm"
                                onClick={() => setDialogOpen(true)}
                            >
                                + Adicionar horário
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
                            {slotsToday.map(slot => (
                                <div
                                    key={slot.id}
                                    className="group flex items-center justify-between p-4 rounded-xl bg-emerald-50/60 dark:bg-emerald-950/15 ring-1 ring-emerald-200/60 dark:ring-emerald-800/30 hover:ring-emerald-300 dark:hover:ring-emerald-700 hover:shadow-md transition-all"
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/50">
                                            <Clock className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">
                                                {format(new Date(slot.startTime), 'HH:mm')} – {format(new Date(slot.endTime), 'HH:mm')}
                                            </p>
                                            <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                                Livre para agendamento
                                            </p>
                                        </div>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-all"
                                        onClick={() => handleDeleteSlot(slot.id)}
                                        disabled={deletingId === slot.id}
                                    >
                                        {deletingId === slot.id ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <Trash2 className="h-3.5 w-3.5" />
                                        )}
                                    </Button>
                                </div>
                            ))}

                            {/* Botão "Adicionar" inline no grid */}
                            <button
                                onClick={() => setDialogOpen(true)}
                                className="flex items-center justify-center gap-2 p-4 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 dark:text-slate-500 hover:border-blue-300 hover:text-blue-500 dark:hover:border-blue-700 dark:hover:text-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/10 transition-all cursor-pointer"
                            >
                                <Plus className="h-4 w-4" />
                                <span className="text-sm font-medium">Adicionar</span>
                            </button>
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}