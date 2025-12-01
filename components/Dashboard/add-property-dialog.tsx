// components/Dashboard/add-property-dialog.tsx
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function AddPropertyDialog({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    price: '',
    location: '',
    description: '',
    features: '' // String separada por vírgula
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/properties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error();

      toast.success("Imóvel cadastrado com sucesso!");
      setFormData({ title: '', price: '', location: '', description: '', features: '' });
      setOpen(false);
      onSuccess(); // Recarrega a lista
    } catch (error) {
      toast.error("Erro ao cadastrar imóvel.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
            <Plus className="h-4 w-4" /> Novo Imóvel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Adicionar Novo Imóvel</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2 col-span-2">
                    <Label>Título do Anúncio</Label>
                    <Input 
                        placeholder="Ex: Apartamento Luxo 3 Quartos - Jardins" 
                        required
                        value={formData.title}
                        onChange={e => setFormData({...formData, title: e.target.value})}
                    />
                </div>
                
                <div className="space-y-2">
                    <Label>Preço (R$)</Label>
                    <Input 
                        type="number" 
                        placeholder="1500000" 
                        required
                        value={formData.price}
                        onChange={e => setFormData({...formData, price: e.target.value})}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Localização</Label>
                    <Input 
                        placeholder="Bairro, Cidade" 
                        value={formData.location}
                        onChange={e => setFormData({...formData, location: e.target.value})}
                    />
                </div>

                <div className="space-y-2 col-span-2">
                    <Label>Características (separadas por vírgula)</Label>
                    <Input 
                        placeholder="Ex: Piscina, 2 Vagas, Varanda Gourmet" 
                        value={formData.features}
                        onChange={e => setFormData({...formData, features: e.target.value})}
                    />
                </div>

                <div className="space-y-2 col-span-2">
                    <Label>Descrição Completa (Para a IA)</Label>
                    <Textarea 
                        placeholder="Descreva o imóvel detalhadamente. O Lucas usará este texto para responder perguntas dos clientes." 
                        className="h-32"
                        required
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                </div>
            </div>

            <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar Imóvel'}
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}