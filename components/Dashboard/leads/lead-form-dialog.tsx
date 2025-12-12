'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, UserPlus, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface LeadFormDialogProps {
  lead?: any; // Se passado, modo Edição
  trigger?: React.ReactNode;
  onSuccess?: () => void;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function LeadFormDialog({ lead, trigger, onSuccess, open: controlledOpen, onOpenChange }: LeadFormDialogProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const setOpen = onOpenChange ?? setInternalOpen;

  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    contato: '',
    status: 'ENTRANTE',
    segmentacao: '',
    faturamentoEstimado: ''
  });

  // Preenche o form se for edição
  useEffect(() => {
    if (lead && isOpen) {
      setFormData({
        name: lead.name || '',
        contato: lead.contato || '',
        status: lead.status || 'ENTRANTE',
        segmentacao: lead.segmentacao || '',
        faturamentoEstimado: lead.faturamentoEstimado || ''
      });
    } else if (!lead && isOpen) {
        // Reset para criação
        setFormData({ name: '', contato: '', status: 'ENTRANTE', segmentacao: '', faturamentoEstimado: '' });
    }
  }, [lead, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = lead ? `/api/leads/${lead.id}` : '/api/leads';
      const method = lead ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error();

      toast.success(lead ? "Lead atualizado com sucesso!" : "Lead cadastrado!");
      setOpen(false);
      router.refresh(); // Atualiza a página atual
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error("Ocorreu um erro ao salvar.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 shadow-md">
            <UserPlus className="h-4 w-4" /> Novo Lead
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{lead ? 'Editar Lead' : 'Novo Cliente'}</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                    <Label>Nome Completo</Label>
                    <Input 
                        required
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                </div>
                
                <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    <Input 
                        required
                        value={formData.contato}
                        onChange={e => setFormData({...formData, contato: e.target.value})}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Valor Estimado (R$)</Label>
                    <Input 
                        placeholder="Ex: 500.000"
                        value={formData.faturamentoEstimado}
                        onChange={e => setFormData({...formData, faturamentoEstimado: e.target.value})}
                    />
                </div>

                {/* Status - Apenas visível na edição para ajuste fino */}
                {lead && (
                    <div className="space-y-2 col-span-2">
                        <Label>Status do Funil</Label>
                        <select 
                            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                            value={formData.status}
                            onChange={e => setFormData({...formData, status: e.target.value})}
                        >
                            <option value="ENTRANTE">Entrante</option>
                            <option value="QUALIFICADO">Qualificado</option>
                            <option value="AGENDADO_COTACAO">Em Cotação</option>
                            <option value="PROPOSTA_ENVIADA">Proposta Enviada</option>
                            <option value="VENDA_REALIZADA">Venda Realizada</option>
                            <option value="PERDIDO">Perdido</option>
                            <option value="ARQUIVADO">Arquivado</option>
                        </select>
                    </div>
                )}
            </div>

            <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (lead ? 'Salvar Alterações' : 'Criar Lead')}
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}