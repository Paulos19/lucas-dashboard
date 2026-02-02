'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch'; // Certifique-se de que este componente existe
import { Plus, Loader2, ShieldCheck, Pen } from 'lucide-react';
import { toast } from 'sonner';

interface ProductFormDialogProps {
  product?: any; // Se existir, é edição
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function ProductFormDialog({ product, trigger, onSuccess }: ProductFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    monthlyPremium: '',
    description: '',
    assistances: '', 
    coverages: '',
    isPostSales: false // Novo campo para Pós-Venda
  });

  useEffect(() => {
    if (product && open) {
      setFormData({
        name: product.name || '',
        monthlyPremium: product.monthlyPremium?.toString() || '',
        description: product.description || '',
        // Converte array de volta para string CSV para edição
        assistances: Array.isArray(product.assistances) ? product.assistances.join(', ') : '',
        coverages: typeof product.coverages === 'string' ? product.coverages : JSON.stringify(product.coverages || ''),
        isPostSales: product.isPostSales || false // Carrega o estado atual
      });
    } else if (!product && open) {
        setFormData({ 
            name: '', 
            monthlyPremium: '', 
            description: '', 
            assistances: '', 
            coverages: '', 
            isPostSales: false 
        });
    }
  }, [product, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = product ? `/api/products/${product.id}` : '/api/products';
      const method = product ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!res.ok) throw new Error();

      toast.success(product ? "Produto atualizado!" : "Novo plano criado!");
      setOpen(false);
      router.refresh();
      if (onSuccess) onSuccess();
    } catch (error) {
      toast.error("Erro ao salvar produto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
            <Button className="bg-red-600 hover:bg-red-700 text-white gap-2 shadow-md shadow-red-900/10">
                <Plus className="h-4 w-4" /> Novo Plano
            </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {product ? <Pen className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
            {product ? 'Editar Plano' : 'Adicionar Plano Residencial'}
          </DialogTitle>
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
                    <Label>Prêmio Mensal (R$)</Label>
                    <Input 
                        type="number" 
                        placeholder="49.90" 
                        step="0.01"
                        required
                        value={formData.monthlyPremium}
                        onChange={e => setFormData({...formData, monthlyPremium: e.target.value})}
                    />
                </div>

                <div className="space-y-2">
                    <Label>Coberturas (Resumo)</Label>
                    <Input 
                        placeholder="Incêndio, Roubo, Danos Elétricos" 
                        value={formData.coverages}
                        onChange={e => setFormData({...formData, coverages: e.target.value})}
                    />
                </div>

                <div className="space-y-2 col-span-2">
                    <Label>Assistências (separadas por vírgula)</Label>
                    <Input 
                        placeholder="Chaveiro 24h, Encanador, Vidraceiro..." 
                        value={formData.assistances}
                        onChange={e => setFormData({...formData, assistances: e.target.value})}
                    />
                </div>

                {/* --- SEÇÃO DE PÓS-VENDA --- */}
                <div className="flex flex-row items-center justify-between rounded-lg border p-4 shadow-sm col-span-2 bg-slate-50 dark:bg-slate-900/50">
                  <div className="space-y-0.5">
                    <Label className="text-base font-medium">Produto de Pós-Venda</Label>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      Se ativado, este produto será oferecido automaticamente para leads inativos há 30 dias.
                    </p>
                  </div>
                  <Switch
                    checked={formData.isPostSales}
                    onCheckedChange={(checked) => setFormData({ ...formData, isPostSales: checked })}
                  />
                </div>

                <div className="space-y-2 col-span-2">
                    <Label>Argumentos de Venda (IA Knowledge Base)</Label>
                    <Textarea 
                        placeholder="Descreva os diferenciais. Ex: Ideal para apartamentos, cobre home office..." 
                        className="h-24 resize-none"
                        required
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                    />
                    <p className="text-[10px] text-muted-foreground text-right">
                        O Lucas usará essas informações para vender este plano.
                    </p>
                </div>
            </div>

            <DialogFooter className="mt-4">
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button type="submit" disabled={loading} className="bg-red-600 hover:bg-red-700">
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (product ? 'Salvar Alterações' : 'Criar Plano')}
                </Button>
            </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}