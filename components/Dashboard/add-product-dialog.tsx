// components/Dashboard/add-product-dialog.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function AddProductDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    monthlyPremium: '',
    description: '',
    assistances: '', // String separada por vírgula
    coverages: '' // Texto livre por enquanto para simplificar o cadastro do corretor
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error();

      toast.success("Plano de seguro adicionado!");
      setFormData({ name: '', monthlyPremium: '', description: '', assistances: '', coverages: '' });
      setOpen(false);
      onSuccess();
    } catch (error) {
      toast.error("Erro ao cadastrar plano.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-red-600 hover:bg-red-700 text-white gap-2 shadow-md">
            <Plus className="h-4 w-4" /> Novo Plano
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Adicionar Plano Residencial</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                    <Label>Nome do Plano</Label>
                    <Input 
                        placeholder="Ex: Bradesco Residencial Sob Medida 1" 
                        required
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                </div>
                
                <div className="space-y-2">
                    <Label>Prêmio Mensal Estimado (R$)</Label>
                    <Input 
                        type="number" 
                        placeholder="49.90" 
                        required
                        value={formData.monthlyPremium}
                        onChange={e => setFormData({...formData, monthlyPremium: e.target.value})}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Principais Coberturas</Label>
                    <Input 
                        placeholder="Incêndio, Roubo, Danos Elétricos" 
                        value={formData.coverages}
                        onChange={e => setFormData({...formData, coverages: e.target.value})}
                    />
                </div>

                <div className="space-y-2 col-span-2">
                    <Label>Assistências (separadas por vírgula)</Label>
                    <Input 
                        placeholder="Ex: Chaveiro 24h, Encanador, Vidraceiro, Reparos linha branca" 
                        value={formData.assistances}
                        onChange={e => setFormData({...formData, assistances: e.target.value})}
                    />
                </div>

                <div className="space-y-2 col-span-2">
                    <Label>Argumentos de Venda (Para a IA)</Label>
                    <Textarea 
                        placeholder="Descreva os diferenciais desse plano. Ex: Ideal para apartamentos, cobre home office, assistência pet inclusa..." 
                        className="h-24"
                        required
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                </div>
            </div>

            <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-700">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Plano'}
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}