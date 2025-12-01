// app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import Link from 'next/link';
import { toast } from 'sonner';
import { Loader2, KeyRound, Mail } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const result = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });

      if (result?.error) {
        toast.error('Credenciais inválidas. Verifique seu e-mail e senha.');
        setIsLoading(false);
      } else if (result?.ok) {
        toast.success('Bem-vindo de volta, corretor!');
        router.replace('/dashboard');
      }
    } catch (error) {
      toast.error('Ocorreu um erro ao tentar entrar.');
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg border-t-4 border-t-blue-600">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Portal do Corretor</CardTitle>
        <CardDescription>
          Acesse o dashboard do Lucas para gerenciar seus leads e imóveis.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">E-mail Corporativo</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="seu@imobiliaria.com"
                required
                className="pl-9"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Senha</Label>
            </div>
            <div className="relative">
              <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                required
                className="pl-9"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Entrar no Sistema'}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Ainda não tem acesso?{' '}
            <Link href="/register" className="text-blue-600 hover:underline font-medium">
              Cadastre-se aqui
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}