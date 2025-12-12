'use client';

import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { format, isSameDay, addHours, setHours, setMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Calendar as CalendarIcon, User, Plus, Trash2, Loader2, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface AgendaViewProps {
  agendamentos: any[];
  slots: any[];
}

export function AgendaView({ agendamentos, slots }: AgendaViewProps) {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [newSlotTime, setNewSlotTime] = useState('09:00');
  const [dialogOpen, setDialogOpen] = useState(false);

  const appointmentsToday = agendamentos.filter(a => date && isSameDay(new Date(a.dataHora), date));
  const slotsToday = slots.filter(s => date && isSameDay(new Date(s.startTime), date));

  const handleCreateSlot = async () => {
    if (!date || !newSlotTime) return;
    setLoading(true);

    try {
        const [hours, minutes] = newSlotTime.split(':').map(Number);
        const startDate = setMinutes(setHours(date, hours), minutes);
        const endDate = addHours(startDate, 1);

        const res = await fetch('/api/availability', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                startISO: startDate.toISOString(),
                endISO: endDate.toISOString()
            })
        });

        if (!res.ok) throw new Error();
        
        toast.success("Horário disponibilizado!");
        setDialogOpen(false);
        router.refresh();
    } catch (error) {
        toast.error("Erro ao criar horário.");
    } finally {
        setLoading(false);
    }
  };

  const handleDeleteSlot = async (id: string) => {
      try {
          const res = await fetch(`/api/availability?id=${id}`, { method: 'DELETE' });
          if(res.ok) {
              toast.success("Horário removido.");
              router.refresh();
          }
      } catch (error) {
          toast.error("Erro ao remover.");
      }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
      
      {/* Coluna Esquerda: Calendário */}
      <div className="md:col-span-4 lg:col-span-3 space-y-6">
        <Card className="border-none shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md ring-1 ring-slate-200 dark:ring-slate-800">
            <CardHeader className="pb-2">
                <CardTitle className="text-slate-800 dark:text-slate-100"></CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center pb-4">
                <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    className="rounded-md"
                    locale={ptBR}
                />
            </CardContent>
        </Card>

        {/* Resumo do Dia */}
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <CardContent className="pt-6">
                <div className="text-center">
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                        {date ? format(date, "dd 'de' MMMM", { locale: ptBR }) : "Selecione uma data"}
                    </p>
                    <div className="mt-4 flex justify-center gap-8 text-sm">
                        <div className="flex flex-col items-center group cursor-default">
                            <span className="font-black text-3xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform">
                                {appointmentsToday.length}
                            </span>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Reuniões</span>
                        </div>
                        <div className="w-px bg-slate-100 dark:bg-slate-800 h-10 self-center" />
                        <div className="flex flex-col items-center group cursor-default">
                            <span className="font-black text-3xl text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform">
                                {slotsToday.length}
                            </span>
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400 mt-1">Slots Livres</span>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
      </div>

      {/* Coluna Direita: Listas e Ações */}
      <div className="md:col-span-8 lg:col-span-9">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                    {date ? format(date, "EEEE", { locale: ptBR }) : "Agenda"}
                </h2>
                <p className="text-slate-500 dark:text-slate-400 capitalize">
                    {date ? format(date, "d 'de' MMMM, yyyy", { locale: ptBR }) : "Selecione uma data no calendário"}
                </p>
            </div>
            
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-lg shadow-blue-500/20">
                        <Plus className="h-4 w-4" /> Adicionar Horário Livre
                    </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Disponibilizar Horário</DialogTitle>
                        <CardDescription>
                            Defina um horário para o Lucas oferecer aos clientes.
                        </CardDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label>Horário de Início</Label>
                            <Select onValueChange={setNewSlotTime} defaultValue={newSlotTime}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {Array.from({ length: 13 }).map((_, i) => {
                                        const hour = i + 8; // 08:00 as 20:00
                                        const time = `${hour < 10 ? '0' : ''}${hour}:00`;
                                        return <SelectItem key={time} value={time}>{time}</SelectItem>
                                    })}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Duração fixa de 1 hora.</p>
                        </div>
                        <Button onClick={handleCreateSlot} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar Disponibilidade'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>

        <Tabs defaultValue="appointments" className="w-full">
            <TabsList className="bg-slate-100 dark:bg-slate-800/50 p-1 mb-6 rounded-lg w-full sm:w-auto grid grid-cols-2 sm:inline-flex">
                <TabsTrigger value="appointments" className="data-[state=active]:bg-white data-[state=active]:text-blue-700 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-blue-400">
                    Agendamentos
                </TabsTrigger>
                <TabsTrigger value="availability" className="data-[state=active]:bg-white data-[state=active]:text-emerald-700 dark:data-[state=active]:bg-slate-800 dark:data-[state=active]:text-emerald-400">
                    Minha Disponibilidade
                </TabsTrigger>
            </TabsList>

            <TabsContent value="appointments" className="space-y-4">
                {appointmentsToday.length === 0 ? (
                    /* CORREÇÃO VISUAL AQUI: Cores explícitas para dark mode */
                    <div className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/20">
                        <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full mb-4">
                            <CalendarIcon className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Agenda livre</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mt-2">
                            Nenhum compromisso marcado para este dia. O Lucas preencherá isso automaticamente.
                        </p>
                    </div>
                ) : (
                    appointmentsToday.map((appt) => (
                        <Card key={appt.id} className="border-l-4 border-l-blue-500 overflow-hidden hover:shadow-lg transition-all bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
                            <CardContent className="p-0 flex flex-col sm:flex-row">
                                <div className="p-6 bg-blue-50 dark:bg-blue-950/30 flex flex-col items-center justify-center min-w-[120px] border-b sm:border-b-0 sm:border-r border-slate-100 dark:border-slate-800/50">
                                    <span className="text-2xl font-bold text-blue-700 dark:text-blue-400">
                                        {format(new Date(appt.dataHora), 'HH:mm')}
                                    </span>
                                    <span className="text-xs font-medium uppercase tracking-wide text-blue-600/70 dark:text-blue-400/60 mt-1">
                                        Reunião
                                    </span>
                                </div>
                                <div className="p-5 flex-1 flex flex-col justify-center">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <h4 className="font-bold text-lg text-slate-900 dark:text-slate-100">{appt.lead.name}</h4>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
                                                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                    <User className="h-3.5 w-3.5" /> {appt.lead.contato}
                                                </p>
                                                {/* Simulação de Localização (Se tivesse no DB) */}
                                                <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                                                    <MapPin className="h-3.5 w-3.5" /> Online (Google Meet)
                                                </p>
                                            </div>
                                        </div>
                                        <Badge variant="outline" className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700">
                                            {appt.status}
                                        </Badge>
                                    </div>
                                    {appt.resumo && (
                                        <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-sm text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-800">
                                            "{appt.resumo}"
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))
                )}
            </TabsContent>

            <TabsContent value="availability" className="mt-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {slotsToday.length === 0 ? (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50/50 dark:bg-slate-800/20">
                            <Clock className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
                            <p className="text-slate-500 dark:text-slate-400 font-medium">Sem horários livres definidos.</p>
                            <Button variant="link" onClick={() => setDialogOpen(true)} className="text-blue-600 dark:text-blue-400">
                                Adicionar agora
                            </Button>
                        </div>
                    ) : (
                        slotsToday.map((slot) => (
                            <div key={slot.id} className="flex items-center justify-between p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-900/10 shadow-sm hover:shadow-md transition-shadow group">
                                <div className="flex items-center gap-3">
                                    <div className="p-2.5 bg-emerald-100 dark:bg-emerald-900/50 rounded-lg text-emerald-700 dark:text-emerald-400">
                                        <Clock className="h-5 w-5" />
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-900 dark:text-slate-100">
                                            {format(new Date(slot.startTime), 'HH:mm')} - {format(new Date(slot.endTime), 'HH:mm')}
                                        </p>
                                        <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">Disponível</p>
                                    </div>
                                </div>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 opacity-0 group-hover:opacity-100 transition-opacity" 
                                    onClick={() => handleDeleteSlot(slot.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        ))
                    )}
                </div>
            </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}