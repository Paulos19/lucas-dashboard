import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { ProductsGrid } from '@/components/Dashboard/products/products-grid';
import { ProductFormDialog } from '@/components/Dashboard/products/product-form-dialog';
import { Shield, Sparkles, Megaphone, TrendingUp, Users, Plus } from 'lucide-react';

// Dados sempre atualizados em tempo real
export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  // Busca produtos no servidor (apenas ativos) com contagem de leads vinculados
  const products = await prisma.insuranceProduct.findMany({
    where: { 
      userId: session.user.id,
      status: 'ACTIVE' // Não mostra os arquivados
    },
    include: {
      _count: {
        select: { leads: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Estatísticas do Catálogo
  const totalProducts = products.length;
  const postSalesProducts = products.filter(p => p.isPostSales).length;
  const avgMonthlyPremium = totalProducts > 0 
    ? products.reduce((acc, p) => acc + (p.monthlyPremium || 0), 0) / totalProducts 
    : 0;
  const totalInterestedLeads = products.reduce((acc, p) => acc + (p._count?.leads || 0), 0);

  return (
    <div className="container mx-auto py-6 max-w-7xl space-y-8 animate-in fade-in duration-500">
      
      {/* Header Principal Glassmorphic */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-lg shadow-slate-950/5 relative overflow-hidden">
        {/* Glow de fundo sutil */}
        <div className="absolute -right-24 -top-24 w-96 h-96 bg-gradient-to-br from-blue-500/10 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-gradient-to-tr from-cyan-500/10 via-blue-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 animate-pulse" />
              <span>Portfólio de Seguros & RAG IA</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50">
              Catálogo de Seguros
            </h1>
            <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 leading-relaxed">
              Gerencie os planos residenciais, coberturas e assistências que o Lucas AI oferece e argumenta com os seus clientes via WhatsApp.
            </p>
          </div>
          
          {/* Botão de Adicionar Novo Plano */}
          <div className="shrink-0">
            <ProductFormDialog 
              trigger={
                <button className="group relative inline-flex items-center justify-center gap-2.5 px-5 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/25 hover:shadow-lg hover:shadow-blue-500/35 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] cursor-pointer">
                  <div className="p-1 rounded-lg bg-white/20 group-hover:bg-white/30 transition-colors">
                    <Plus className="h-4 w-4" />
                  </div>
                  <span>Cadastrar Novo Plano</span>
                </button>
              }
            />
          </div>
        </div>

        {/* Spotlight KPI Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mt-6 pt-6 border-t border-slate-200/60 dark:border-slate-800/60">
          
          {/* Total de Planos */}
          <div className="glass-pill p-3.5 rounded-2xl flex items-center gap-3 border border-slate-200/70 dark:border-slate-800/70 transition-all hover:translate-y-[-2px]">
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Planos Ativos</div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">{totalProducts}</div>
            </div>
          </div>

          {/* Planos Pós-Venda */}
          <div className="glass-pill p-3.5 rounded-2xl flex items-center gap-3 border border-slate-200/70 dark:border-slate-800/70 transition-all hover:translate-y-[-2px]">
            <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Pós-Venda (IA 30d)</div>
              <div className="text-xl font-bold text-indigo-600 dark:text-indigo-400">{postSalesProducts}</div>
            </div>
          </div>

          {/* Ticket Médio Mensal */}
          <div className="glass-pill p-3.5 rounded-2xl flex items-center gap-3 border border-slate-200/70 dark:border-slate-800/70 transition-all hover:translate-y-[-2px]">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Ticket Médio</div>
              <div className="text-xl font-bold text-slate-900 dark:text-slate-100">
                {avgMonthlyPremium > 0 ? (
                  <>
                    <span className="text-xs font-normal text-muted-foreground mr-0.5">R$</span>
                    {avgMonthlyPremium.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </>
                ) : (
                  <span className="text-sm font-normal text-muted-foreground">-</span>
                )}
              </div>
            </div>
          </div>

          {/* Total de Leads Vinculados */}
          <div className="glass-pill p-3.5 rounded-2xl flex items-center gap-3 border border-slate-200/70 dark:border-slate-800/70 transition-all hover:translate-y-[-2px]">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-500 dark:text-slate-400">Leads Vinculados</div>
              <div className="text-xl font-bold text-cyan-600 dark:text-cyan-400">{totalInterestedLeads}</div>
            </div>
          </div>

        </div>
      </div>

      {/* Grid e Controles de Produtos */}
      <ProductsGrid products={products} />

    </div>
  );
}