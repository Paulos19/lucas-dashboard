'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { LockKeyhole, Loader2 } from 'lucide-react';
import { adminChangeUserPassword } from '@/app/actions/admin-users';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface ChangePasswordDialogProps {
  userId: string;
  userName: string;
}

export function AdminChangePasswordDialog({ userId, userName }: ChangePasswordDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [password, setPassword] = useState('');

  const handleSave = async () => {
    if (!password || password.length < 6) {
      toast.error("A senha deve ter pelo menos 6 caracteres");
      return;
    }

    setLoading(true);

    try {
      const result = await adminChangeUserPassword(userId, password);

      if (result.success) {
        toast.success(`Senha de ${userName} atualizada com sucesso!`);
        setOpen(false);
        setPassword(''); // Limpa o campo
      } else {
        toast.error(result.error || "Erro ao atualizar senha");
      }
    } catch (error) {
      toast.error("Erro inesperado ao tentar trocar a senha.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
          <LockKeyhole className="h-4 w-4 text-muted-foreground hover:text-primary" />
          <span className="sr-only">Alterar senha</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Alterar Senha</DialogTitle>
          <DialogDescription>
            Defina uma nova senha para o usuário <strong>{userName}</strong>.
            Esta ação é irreversível.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="new-password" className="text-right">
              Nova Senha
            </Label>
            <Input
              id="new-password"
              type="text" // 'text' para o admin ver o que está digitando, ou 'password' para ocultar
              placeholder="Digite a nova senha..."
              className="col-span-3"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar Nova Senha
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}