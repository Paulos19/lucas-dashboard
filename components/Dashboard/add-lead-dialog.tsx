// components/Dashboard/add-lead-dialog.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function AddLeadDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    contato: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error();

      toast.success("Lead cadastrado! O Lucas entrará em contato em breve.");
      setFormData({ nome: '', contato: '' });
      setOpen(false);
      onSuccess();
    } catch (error) {
      toast.error("Erro ao cadastrar lead.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700 text-white gap-2 shadow-md">
            <UserPlus className="h-4 w-4" /> Cadastrar Lead
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Novo Cliente Potencial</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
                <Label>Nome do Cliente</Label>
                <Input 
                    placeholder="Ex: João da Silva" 
                    required
                    value={formData.nome}
                    onChange={e => setFormData({...formData, nome: e.target.value})}
                />
            </div>
            
            <div className="space-y-2">
                <Label>WhatsApp (com DDD)</Label>
                <Input 
                    type="tel"
                    placeholder="11999998888" 
                    required
                    value={formData.contato}
                    onChange={e => setFormData({...formData, contato: e.target.value})}
                />
                <p className="text-xs text-muted-foreground">
                    O Lucas irá iniciar a conversa automaticamente com este número.
                </p>
            </div>

            <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={loading} className="bg-green-600 hover:bg-green-700">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar e Iniciar'}
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}