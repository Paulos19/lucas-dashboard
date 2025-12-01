// app/(auth)/register/page.tsx
'use client';

import { useState } from 'react';
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
import { Loader2, Smartphone, User, Mail, Lock, Badge } from 'lucide-react';

export default function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    creci: '', // Novo campo específico para corretores
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      // Validação básica do telefone
      const cleanPhone = formData.phone.replace(/\D/g, '');
      if (cleanPhone.length < 10) {
        toast.error("Por favor, insira um WhatsApp válido com DDD.");
        setIsLoading(false);
        return;
      }

      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...formData,
          phone: cleanPhone 
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao criar conta.');
      }

      toast.success('Cadastro realizado! Redirecionando para o login...');
      
      setTimeout(() => {
        router.push('/login');
      }, 1500);

    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg border-t-4 border-t-blue-600">
      <CardHeader className="space-y-1 text-center">
        <CardTitle className="text-2xl font-bold">Novo Corretor</CardTitle>
        <CardDescription>
          Cadastre-se para ativar o Lucas nos seus atendimentos.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo</Label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="name"
                placeholder="Ex: Ana Souza"
                className="pl-9"
                required
                value={formData.name}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
          </div>

          {/* Email */}
          <div className="space-y-2">
            <Label htmlFor="email">E-mail Profissional</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="email"
                type="email"
                placeholder="ana@imobiliaria.com"
                className="pl-9"
                required
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Telefone */}
            <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp (com DDD)</Label>
                <div className="relative">
                <Smartphone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    id="phone"
                    type="tel"
                    placeholder="11999998888"
                    className="pl-9"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    disabled={isLoading}
                />
                </div>
            </div>

            {/* CRECI (Novo Campo) */}
            <div className="space-y-2">
                <Label htmlFor="creci">CRECI</Label>
                <div className="relative">
                <Badge className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    id="creci"
                    placeholder="12345-F"
                    className="pl-9"
                    required
                    value={formData.creci}
                    onChange={handleChange}
                    disabled={isLoading}
                />
                </div>
            </div>
          </div>

          {/* Senha */}
          <div className="space-y-2">
            <Label htmlFor="password">Senha de Acesso</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                id="password"
                type="password"
                placeholder="******"
                className="pl-9"
                required
                minLength={6}
                value={formData.password}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
          </div>

        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Criando Conta...
              </>
            ) : (
              'Finalizar Cadastro'
            )}
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Já possui conta?{' '}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">
              Fazer login
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  );
}