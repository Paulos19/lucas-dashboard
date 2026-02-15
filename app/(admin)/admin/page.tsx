import { PrismaClient } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Users, Database, Activity, TrendingUp } from 'lucide-react';
import Link from 'next/link';

const prisma = new PrismaClient();

export default async function AdminPage() {
  // Busca dados em paralelo para melhor performance
  const [totalUsers, totalLeads, recentLeads, leadsByStatus] = await Promise.all([
    prisma.user.count(),
    prisma.lead.count(),
    prisma.lead.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    }),
    prisma.lead.groupBy({
      by: ['status'],
      _count: {
        status: true
      }
    })
  ]);

  // Calcula leads ativos (exclui perdidos/arquivados se necessário, aqui simplificado)
  const activeLeads = totalLeads; 

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Painel Admin</h1>
        <p className="text-muted-foreground mt-2">
          Visão geral do sistema, usuários e performance.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground">Corretores cadastrados</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Leads</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalLeads}</div>
            <p className="text-xs text-muted-foreground">Em toda a base</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Atividade Recente</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{recentLeads.length}</div>
            <p className="text-xs text-muted-foreground">Novos leads hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">- %</div>
            <p className="text-xs text-muted-foreground">Taxa média global</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        
        {/* Atividade Recente (Lista de Leads) */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Últimos Leads Cadastrados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {recentLeads.map((lead) => (
                <div key={lead.id} className="flex items-center">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-slate-100 text-slate-700">
                      {lead.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="ml-4 space-y-1">
                    <p className="text-sm font-medium leading-none">{lead.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Corretor: <span className="text-primary">{lead.user.name}</span>
                    </p>
                  </div>
                  <div className="ml-auto font-medium text-xs text-slate-500">
                    {new Date(lead.createdAt).toLocaleDateString('pt-BR')}
                  </div>
                </div>
              ))}
              
              {recentLeads.length === 0 && (
                <div className="text-center py-4 text-muted-foreground text-sm">
                  Nenhum lead encontrado.
                </div>
              )}
            </div>
            
            <div className="mt-6">
                <Link href="/admin/leads" className="text-sm text-blue-600 hover:underline">
                    Ver todos os leads &rarr;
                </Link>
            </div>
          </CardContent>
        </Card>

        {/* Distribuição de Status (Simples) */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Status do Funil</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
               {leadsByStatus.map((stat) => (
                   <div key={stat.status} className="flex items-center justify-between">
                       <span className="text-sm font-medium text-slate-600">{stat.status}</span>
                       <span className="text-sm font-bold">{stat._count.status}</span>
                   </div>
               ))}
               
               {leadsByStatus.length === 0 && (
                 <p className="text-sm text-muted-foreground">Sem dados para exibir.</p>
               )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}