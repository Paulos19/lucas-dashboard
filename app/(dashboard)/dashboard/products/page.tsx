import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { PrismaClient } from '@prisma/client';
import { ProductsGrid } from '@/components/Dashboard/products/products-grid';
import { ProductFormDialog } from '@/components/Dashboard/products/product-form-dialog';

const prisma = new PrismaClient();

// Dados sempre atualizados
export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');

  // Busca produtos no servidor (apenas ativos)
  const products = await prisma.insuranceProduct.findMany({
    where: { 
        userId: session.user.id,
        status: 'ACTIVE' // Não mostra os arquivados
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="container mx-auto py-8 max-w-7xl animate-in fade-in duration-500">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
            <h1 className="text-3xl font-bold tracking-tight text-red-950 dark:text-red-100">
                Catálogo de Seguros
            </h1>
            <p className="text-muted-foreground mt-1">
                Gerencie os planos da Bradesco Residencial que o Lucas irá oferecer.
            </p>
        </div>
        
        {/* Botão de Adicionar (Client Component) */}
        <ProductFormDialog />
      </div>

      {/* Grid de Produtos (Client Component) */}
      <ProductsGrid products={products} />
    </div>
  );
}