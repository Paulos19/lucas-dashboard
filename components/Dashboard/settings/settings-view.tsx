'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react'; // <--- Importe o useSession
// ... outros imports (mantenha os existentes)
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { Loader2, Camera, User, Lock, Mail, Phone, BadgeCheck, UploadCloud } from 'lucide-react';
import { upload } from '@vercel/blob/client';

interface SettingsViewProps {
  user: any;
}

export function SettingsView({ user }: SettingsViewProps) {
  const router = useRouter();
  const { update } = useSession(); // <--- Extraia a função update
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // ... (mantenha os estados profileData, passData e useRef)
  const [profileData, setProfileData] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    creci: user.creci || '',
    image: user.image || ''
  });

  const [passData, setPassData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    setUploading(true);

    try {
      const newBlob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      });

      // Atualiza o estado local para preview imediato
      setProfileData(prev => ({ ...prev, image: newBlob.url }));
      toast.success("Foto carregada! Clique em 'Salvar Alterações'.");
    } catch (error) {
      toast.error("Erro ao fazer upload da imagem.");
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProfile(true);

    try {
      // 1. Salva no Banco de Dados
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });

      if (!res.ok) throw new Error();

      // 2. Atualiza a Sessão do NextAuth (Isso atualiza a Sidebar)
      await update({
        name: profileData.name,
        email: profileData.email,
        image: profileData.image
      });

      toast.success("Perfil atualizado com sucesso!");
      router.refresh();
    } catch (error) {
      toast.error("Erro ao atualizar perfil.");
    } finally {
      setLoadingProfile(false);
    }
  };

  // ... (Mantenha o resto do componente, handleChangePassword e o return, iguais)
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passData.newPassword !== passData.confirmPassword) {
        toast.error("As novas senhas não coincidem.");
        return;
    }

    setLoadingPassword(true);

    try {
      const res = await fetch('/api/settings/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            currentPassword: passData.currentPassword,
            newPassword: passData.newPassword
        })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error);

      toast.success("Senha alterada com sucesso!");
      setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.message || "Erro ao alterar senha.");
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <div className="grid gap-6">
      <Tabs defaultValue="profile" className="w-full">
        {/* ... (Conteúdo das Tabs igual ao anterior) */}
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="profile">Meu Perfil</TabsTrigger>
          <TabsTrigger value="security">Segurança</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <form onSubmit={handleUpdateProfile}>
            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>
                  Atualize seus dados de contato e identidade visual.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                {/* Avatar Section */}
                <div className="flex items-center gap-6">
                    <div className="relative group cursor-pointer" onClick={handleAvatarClick}>
                        <Avatar className="h-24 w-24 border-4 border-slate-100 dark:border-slate-800 shadow-sm group-hover:opacity-80 transition-opacity">
                            <AvatarImage src={profileData.image} className="object-cover" />
                            <AvatarFallback className="text-2xl bg-blue-100 text-blue-700 font-bold">
                                {profileData.name.substring(0, 2).toUpperCase()}
                            </AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                            {uploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Camera className="h-6 w-6" />}
                        </div>
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            className="hidden" 
                            accept="image/*"
                            onChange={handleFileChange}
                        />
                    </div>
                    <div>
                        <h3 className="font-medium">Sua Foto</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                            Clique na imagem para alterar.
                        </p>
                        <Button type="button" variant="outline" size="sm" onClick={handleAvatarClick} disabled={uploading}>
                            <UploadCloud className="mr-2 h-4 w-4" /> 
                            {uploading ? 'Enviando...' : 'Carregar nova foto'}
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo</Label>
                        <div className="relative">
                            <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="name" 
                                className="pl-9"
                                value={profileData.name} 
                                onChange={e => setProfileData({...profileData, name: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="email">E-mail</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="email" 
                                type="email"
                                className="pl-9"
                                value={profileData.email} 
                                onChange={e => setProfileData({...profileData, email: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="phone">WhatsApp</Label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="phone" 
                                className="pl-9"
                                value={profileData.phone} 
                                onChange={e => setProfileData({...profileData, phone: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="creci">SUSEP</Label>
                        <div className="relative">
                            <BadgeCheck className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                id="creci" 
                                className="pl-9"
                                value={profileData.creci} 
                                onChange={e => setProfileData({...profileData, creci: e.target.value})}
                            />
                        </div>
                    </div>
                </div>

              </CardContent>
              <CardFooter className="border-t px-6 py-4 bg-slate-50 dark:bg-slate-900/50">
                <Button type="submit" disabled={loadingProfile || uploading} className="ml-auto bg-blue-600 hover:bg-blue-700 text-white">
                    {loadingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Alterações
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        <TabsContent value="security">
          <form onSubmit={handleChangePassword}>
            <Card>
              <CardHeader>
                <CardTitle>Alterar Senha</CardTitle>
                <CardDescription>
                  Mantenha sua conta segura. Use uma senha forte.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="current">Senha Atual</Label>
                    <div className="relative">
                        <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input 
                            id="current" 
                            type="password"
                            className="pl-9"
                            value={passData.currentPassword}
                            onChange={e => setPassData({...passData, currentPassword: e.target.value})}
                            required
                        />
                    </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="new">Nova Senha</Label>
                        <Input 
                            id="new" 
                            type="password"
                            value={passData.newPassword}
                            onChange={e => setPassData({...passData, newPassword: e.target.value})}
                            required
                            minLength={6}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="confirm">Confirmar Nova Senha</Label>
                        <Input 
                            id="confirm" 
                            type="password"
                            value={passData.confirmPassword}
                            onChange={e => setPassData({...passData, confirmPassword: e.target.value})}
                            required
                            minLength={6}
                        />
                    </div>
                </div>
              </CardContent>
              <CardFooter className="border-t px-6 py-4 bg-slate-50 dark:bg-slate-900/50">
                <Button type="submit" disabled={loadingPassword} variant="destructive" className="ml-auto">
                    {loadingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Atualizar Senha
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}