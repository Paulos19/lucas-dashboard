'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Plus, X, Loader2, ShieldCheck, Pen, Sparkles, Bot, Megaphone, Check, Layers } from 'lucide-react';
import { toast } from 'sonner';

interface ProductFormDialogProps {
  product?: any;
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

const COMMON_ASSISTANCES = [
  "Chaveiro 24h",
  "Encanador",
  "Eletricista",
  "Vidraceiro",
  "Linha Branca",
  "Desentupimento",
  "Check-up Lar",
  "Help Desk Computadores",
];

const COMMON_COVERAGES = [
  "Incêndio, Queda de Raio e Explosão",
  "Danos Elétricos",
  "Roubo e Furto Qualificado",
  "Vendaval e Granizo",
  "Responsabilidade Civil Familiar",
  "Quebra de Vidros e Espelhos",
];

export function ProductFormDialog({ product, trigger, onSuccess }: ProductFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Form states
  const [name, setName] = useState('');
  const [monthlyPremium, setMonthlyPremium] = useState('');
  const [description, setDescription] = useState('');
  const [coverages, setCoverages] = useState('');
  const [assistances, setAssistances] = useState<string[]>([]);
  const [customAssistance, setCustomAssistance] = useState('');
  const [isPostSales, setIsPostSales] = useState(false);

  useEffect(() => {
    if (product && open) {
      setName(product.name || '');
      setMonthlyPremium(product.monthlyPremium?.toString() || '');
      setDescription(product.description || '');
      
      // Converte coverages
      if (typeof product.coverages === 'string') {
        setCoverages(product.coverages);
      } else if (product.coverages) {
        setCoverages(JSON.stringify(product.coverages));
      } else {
        setCoverages('');
      }

      // Assistances array
      if (Array.isArray(product.assistances)) {
        setAssistances(product.assistances);
      } else if (typeof product.assistances === 'string') {
        setAssistances(product.assistances.split(',').map((s: string) => s.trim()).filter(Boolean));
      } else {
        setAssistances([]);
      }

      setIsPostSales(product.isPostSales || false);
    } else if (!product && open) {
      // Reset form
      setName('');
      setMonthlyPremium('');
      setDescription('');
      setCoverages('');
      setAssistances(["Chaveiro 24h", "Encanador", "Eletricista"]);
      setCustomAssistance('');
      setIsPostSales(false);
    }
  }, [product, open]);

  const handleAddAssistance = (item: string) => {
    const trimmed = item.trim();
    if (!trimmed) return;
    if (!assistances.includes(trimmed)) {
      setAssistances([...assistances, trimmed]);
    }
    setCustomAssistance('');
  };

  const handleRemoveAssistance = (item: string) => {
    setAssistances(assistances.filter(a => a !== item));
  };

  const handleToggleCoverageSuggestion = (cov: string) => {
    const currentList = coverages.split(',').map(s => s.trim()).filter(Boolean);
    if (currentList.includes(cov)) {
      setCoverages(currentList.filter(c => c !== cov).join(', '));
    } else {
      setCoverages([...currentList, cov].join(', '));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Informe o nome do plano.");
      return;
    }
    if (!monthlyPremium || isNaN(parseFloat(monthlyPremium))) {
      toast.error("Informe um valor de prêmio mensal válido.");
      return;
    }
    if (!description.trim()) {
      toast.error("Informe os argumentos de venda para a IA.");
      return;
    }

    setLoading(true);

    try {
      const url = product ? `/api/products/${product.id}` : '/api/products';
      const method = product ? 'PUT' : 'POST';

      const payload = {
        name: name.trim(),
        monthlyPremium: parseFloat(monthlyPremium),
        description: description.trim(),
        assistances: assistances,
        coverages: coverages.trim(),
        isPostSales,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro na resposta do servidor");
      }

      toast.success(product ? "Plano atualizado com sucesso!" : "Novo plano cadastrado com sucesso!");
      setOpen(false);
      router.refresh();
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast.error(error.message || "Erro ao salvar produto.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white gap-2 shadow-md shadow-blue-500/20 cursor-pointer">
            <Plus className="h-4 w-4" /> Novo Plano
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden border border-slate-200/80 dark:border-slate-800/80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
        
        {/* Header com Glow */}
        <div className="relative px-6 pt-6 pb-4 border-b border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border ${
              product 
                ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20' 
                : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20'
            }`}>
              {product ? <Pen className="h-5 w-5" /> : <ShieldCheck className="h-5 w-5" />}
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-slate-900 dark:text-slate-50">
                {product ? 'Editar Plano de Seguro' : 'Cadastrar Novo Seguro Residencial'}
              </DialogTitle>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Configure as coberturas, assistências e argumentos que o Lucas AI usará.
              </p>
            </div>
          </div>
        </div>
        
        {/* Formulário com Scroll Suave */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Nome do Plano */}
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Nome Comercial do Plano <span className="text-rose-500">*</span>
              </Label>
              <Input 
                placeholder="Ex: Bradesco Residencial Sob Medida 1" 
                required
                className="bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
            
            {/* Prêmio Mensal */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Prêmio Mensal Estimado (R$) <span className="text-rose-500">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-medium">R$</span>
                <Input 
                  type="number" 
                  placeholder="49.90" 
                  step="0.01"
                  min="0"
                  required
                  className="pl-9 bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500 font-medium"
                  value={monthlyPremium}
                  onChange={e => setMonthlyPremium(e.target.value)}
                />
              </div>
            </div>

            {/* Segmento / Categoria */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Ramo de Seguro
              </Label>
              <div className="flex items-center gap-2 px-3 py-2 rounded-md border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 text-xs font-medium text-slate-700 dark:text-slate-300">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                <span>Residencial (Bradesco Auto/RE)</span>
              </div>
            </div>

            {/* Coberturas */}
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Coberturas Principais (Resumo)
                </Label>
                <span className="text-[10px] text-slate-400">Clique nas sugestões ou digite</span>
              </div>
              
              <Input 
                placeholder="Incêndio, Roubo, Danos Elétricos, Vendaval..." 
                className="bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500"
                value={coverages}
                onChange={e => setCoverages(e.target.value)}
              />

              {/* Sugestões de Coberturas */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {COMMON_COVERAGES.map((cov) => {
                  const isSelected = coverages.toLowerCase().includes(cov.toLowerCase().slice(0, 8));
                  return (
                    <button
                      key={cov}
                      type="button"
                      onClick={() => handleToggleCoverageSuggestion(cov)}
                      className={`text-[10px] px-2 py-1 rounded-md border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 font-semibold'
                          : 'bg-slate-100/60 text-slate-600 border-slate-200/60 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-800'
                      }`}
                    >
                      {isSelected ? '✓ ' : '+ '}
                      {cov}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Assistências (Tags Dinâmicas) */}
            <div className="space-y-2 sm:col-span-2">
              <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Serviços e Assistências Inclusas
              </Label>
              
              {/* Chips Atuais */}
              <div className="min-h-[44px] p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-wrap gap-1.5 items-center">
                {assistances.length === 0 ? (
                  <span className="text-xs text-slate-400 italic px-1">Nenhuma assistência selecionada. Clique nas sugestões abaixo.</span>
                ) : (
                  assistances.map((item) => (
                    <Badge
                      key={item}
                      variant="secondary"
                      className="gap-1.5 py-1 px-2.5 bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300 border border-blue-200/80 dark:border-blue-800/80 text-xs font-medium"
                    >
                      {item}
                      <button
                        type="button"
                        onClick={() => handleRemoveAssistance(item)}
                        className="hover:text-rose-500 transition-colors cursor-pointer"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))
                )}
              </div>

              {/* Adicionar Assistência Personalizada */}
              <div className="flex gap-2">
                <Input
                  placeholder="Digitar nova assistência (ex: Troca de Fechadura)"
                  value={customAssistance}
                  onChange={e => setCustomAssistance(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddAssistance(customAssistance);
                    }
                  }}
                  className="text-xs bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => handleAddAssistance(customAssistance)}
                  disabled={!customAssistance.trim()}
                  className="cursor-pointer shrink-0 text-xs"
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar
                </Button>
              </div>

              {/* Sugestões Rápidas de Assistências */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {COMMON_ASSISTANCES.map((item) => {
                  const isAdded = assistances.includes(item);
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => isAdded ? handleRemoveAssistance(item) : handleAddAssistance(item)}
                      className={`text-[10px] px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                        isAdded
                          ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                          : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-blue-400'
                      }`}
                    >
                      {isAdded ? '✓ ' : '+ '}
                      {item}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* SEÇÃO DE PÓS-VENDA AUTOMÁTICO */}
            <div className="sm:col-span-2 p-4 rounded-2xl border border-indigo-200/70 dark:border-indigo-900/40 bg-gradient-to-br from-indigo-50/70 via-indigo-50/20 to-transparent dark:from-indigo-950/20 dark:via-transparent dark:to-transparent flex items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <Label className="text-sm font-bold text-slate-900 dark:text-slate-100 cursor-pointer">
                    Habilitar para Campanha de Pós-Venda Automática
                  </Label>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-400">
                  O Lucas AI oferecerá este plano proativamente para segurados inativos há 30 dias na rotina de automação.
                </p>
              </div>
              <Switch
                checked={isPostSales}
                onCheckedChange={setIsPostSales}
                className="data-[state=checked]:bg-indigo-600"
              />
            </div>

            {/* ARGUMENTOS DE VENDA (RAG IA) */}
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <Bot className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <span>Argumentos de Venda (Base de Conhecimento do Lucas AI)</span>
                  <span className="text-rose-500">*</span>
                </div>
                <span className="text-[10px] text-slate-400">{description.length} caracteres</span>
              </div>
              
              <Textarea 
                placeholder="Ex: Ideal para apartamentos e condomínios fechados. Argumente sobre a economia de ter assistência 24h inclusa sem pagar taxa extra. Enfatize a proteção contra danos elétricos em tempestades de verão..." 
                className="h-28 resize-none bg-white dark:bg-slate-950/60 border-slate-200 dark:border-slate-800 focus-visible:ring-blue-500 text-xs leading-relaxed"
                required
                value={description}
                onChange={e => setDescription(e.target.value)}
              />
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                💡 <span className="font-medium">Dica de IA:</span> Escreva os principais diferenciais deste plano. O Lucas consultará esses argumentos para persuadir o cliente e contornar objeções de preço.
              </p>
            </div>

          </div>

          <DialogFooter className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80 flex items-center justify-end gap-2">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="cursor-pointer text-xs"
            >
              Cancelar
            </Button>
            
            <Button 
              type="submit" 
              disabled={loading} 
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md shadow-blue-500/20 cursor-pointer text-xs gap-2"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Salvando...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>{product ? 'Salvar Alterações' : 'Concluir Cadastro'}</span>
                </>
              )}
            </Button>
          </DialogFooter>

        </form>

      </DialogContent>
    </Dialog>
  );
}