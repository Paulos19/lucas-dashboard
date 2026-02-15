import { PrismaClient } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { AdminChangePasswordDialog } from '@/components/Admin/users/change-password-dialog'; // Componente que criaremos abaixo

const prisma = new PrismaClient();

export default async function AdminUsersPage() {
  // Busca usuários e conta quantos leads cada um tem
  const users = await prisma.user.findMany({
    include: {
      _count: {
        select: { leads: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Gestão de Usuários</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Corretores Cadastrados ({users.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Leads</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Badge variant={user.role === 'ADMIN' ? 'destructive' : 'secondary'}>
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{user._count.leads}</TableCell>
                  <TableCell>
                    {/* Componente Client-Side para trocar senha */}
                    <AdminChangePasswordDialog userId={user.id} userName={user.name} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}