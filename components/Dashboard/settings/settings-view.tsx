'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { toast } from 'sonner';
import { 
  Loader2, Camera, User, Lock, Mail, Phone, BadgeCheck, 
  UploadCloud, KeyRound, Radio, Globe, Shield, Sparkles, 
  CheckCircle2, AlertCircle, Eye, EyeOff, MessageSquare, 
  Check, ArrowUpRight, Zap
} from 'lucide-react';
import { useUploadThing } from '@/lib/uploadthing';

interface SettingsViewProps {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string;
    creci: string | null;
    image: string | null;
    role: string;
    evoApiKey: string | null;
    evoInstance: string | null;
    evoApiUrl: string | null;
    createdAt?: Date | string;
  };
}

export function SettingsView({ user }: SettingsViewProps) {
  const router = useRouter();
  const { update } = useSession();
  
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isDragOver, setIsDragOver] = useState(false);

  // Form states
  const [profileData, setProfileData] = useState({
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    creci: user.creci || '',
    image: user.image || '',
    evoInstance: user.evoInstance || '',
    evoApiKey: user.evoApiKey || '',
    evoApiUrl: user.evoApiUrl || '',
  });

  const [passData, setPassData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // UploadThing hook integration
  const { startUpload, isUploading } = useUploadThing("profileImage", {
    onClientUploadComplete: async (res) => {
      if (res && res[0]) {
        const fileUrl = res[0].url;
        setProfileData(prev => ({ ...prev, image: fileUrl }));
        toast.success("Foto carregada com sucesso! Sincronizando com seu perfil...");
        
        // Notifica imediatamente a sidebar e outros componentes ouvintes
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('profile-updated', {
            detail: { image: fileUrl, name: profileData.name }
          }));
        }

        try {
          const syncRes = await fetch('/api/settings/profile', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...profileData, image: fileUrl })
          });
          
          if (syncRes.ok) {
            await update({
              image: fileUrl,
              name: profileData.name
            });
            toast.success("Foto de perfil salva e atualizada em toda a plataforma!");
            router.refresh();
          }
        } catch (error) {
          console.error("Erro ao persistir avatar:", error);
        }
      }
      setUploadProgress(0);
    },
    onUploadProgress: (p) => {
      setUploadProgress(p);
    },
    onUploadError: (error: Error) => {
      setUploadProgress(0);
      toast.error(`Falha no upload: ${error.message || 'Verifique o tamanho e tente novamente.'}`);
    },
  });

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    
    if (!file.type.startsWith('image/')) {
      toast.error("Por favor, selecione um arquivo de imagem válido (PNG, JPG, WebP).");
      return;
    }
    
    if (file.size > 4 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 4MB.");
      return;
    }

    setUploadProgress(10);
    await startUpload([file]);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProfile(true);

    try {
      const res = await fetch('/api/settings/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });

      if (!res.ok) throw new Error("Erro ao salvar dados.");

      await update({
        name: profileData.name,
        email: profileData.email,
        image: profileData.image
      });

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('profile-updated', {
          detail: { image: profileData.image, name: profileData.name }
        }));
      }

      toast.success("Perfil e integrações atualizados com sucesso!");
      router.refresh();
    } catch (error) {
      toast.error("Erro ao atualizar perfil. Verifique os dados e tente novamente.");
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (passData.newPassword !== passData.confirmPassword) {
      toast.error("A confirmação não coincide com a nova senha.");
      return;
    }

    if (passData.newPassword.length < 6) {
      toast.error("A nova senha deve ter no mínimo 6 caracteres.");
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
      if (!res.ok) throw new Error(data.error || "Erro ao alterar senha.");

      toast.success("Senha alterada com sucesso!");
      setPassData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      toast.error(error.message || "Erro ao atualizar senha.");
    } finally {
      setLoadingPassword(false);
    }
  };

  const isEvoConfigured = Boolean(profileData.evoInstance && profileData.evoApiKey);
  const initials = profileData.name
    ? profileData.name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : 'CO';

  return (
    <div className="space-y-8">
      {/* Executive Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800/80 bg-linear-to-br from-white via-slate-50/50 to-blue-50/30 dark:from-slate-900/90 dark:via-slate-950/80 dark:to-blue-950/20 backdrop-blur-xl p-6 sm:p-8 shadow-xl"
      >
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-blue-500/10 dark:bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-16 w-56 h-56 rounded-full bg-cyan-500/10 dark:bg-cyan-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          {/* Avatar with Halo & Quick Upload Trigger */}
          <div className="flex items-center gap-5">
            <div 
              className="relative group cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              title="Clique para alterar a foto pelo UploadThing"
            >
              <div className="relative p-1 rounded-full bg-linear-to-tr from-blue-600 via-indigo-500 to-cyan-400 shadow-lg shadow-blue-500/20">
                <Avatar className="h-24 w-24 sm:h-28 sm:w-28 border-2 border-white dark:border-slate-950">
                  <AvatarImage src={profileData.image} className="object-cover" />
                  <AvatarFallback className="text-2xl font-bold bg-linear-to-br from-blue-600 to-indigo-700 text-white">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </div>

              {/* Overlay on hover / uploading */}
              <div className="absolute inset-1 flex flex-col items-center justify-center bg-slate-950/60 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 backdrop-blur-xs">
                {isUploading ? (
                  <div className="flex flex-col items-center gap-1 text-center">
                    <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                    <span className="text-[10px] font-bold text-cyan-300">{uploadProgress}%</span>
                  </div>
                ) : (
                  <>
                    <Camera className="h-6 w-6 text-white mb-0.5" />
                    <span className="text-[10px] font-semibold text-white/90">Trocar</span>
                  </>
                )}
              </div>

              {/* Status Dot */}
              <span className="absolute bottom-1 right-1 h-4 w-4 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-950 shadow-md animate-pulse" />
            </div>

            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  {profileData.name || 'Corretor Especialista'}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-700/50">
                  <Sparkles className="h-3 w-3" /> {user.role === 'ADMIN' ? 'Administrador' : 'Corretor Pro'}
                </span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Mail className="h-3.5 w-3.5" /> {profileData.email}
                {profileData.creci && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="font-mono text-xs font-medium text-slate-600 dark:text-slate-300">
                      SUSEP: {profileData.creci}
                    </span>
                  </>
                )}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {isEvoConfigured ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Evolution API: {profileData.evoInstance}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                    Evolution API: Instância não vinculada
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action Button */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="w-full sm:w-auto glass-panel border-slate-300 dark:border-slate-700 hover:border-blue-500 transition-colors"
            >
              <UploadCloud className="mr-2 h-4 w-4 text-blue-500" />
              {isUploading ? `Enviando (${uploadProgress}%)` : 'Atualizar Foto'}
            </Button>
          </div>
        </div>

        {/* Hidden File Input for UploadThing */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/png,image/jpeg,image/webp,image/jpg"
          onChange={(e) => handleFileSelect(e.target.files)}
        />
      </motion.div>

      {/* Main Form Tabs */}
      <Tabs defaultValue="identity" className="w-full space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 p-1 bg-slate-100/80 dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl backdrop-blur-md">
          <TabsTrigger value="identity" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-xs text-xs sm:text-sm font-medium">
            <User className="h-4 w-4 mr-2 text-blue-500" /> Identidade
          </TabsTrigger>
          <TabsTrigger value="evolution" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-xs text-xs sm:text-sm font-medium">
            <Radio className="h-4 w-4 mr-2 text-emerald-500" /> Evolution API
          </TabsTrigger>
          <TabsTrigger value="avatar" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-xs text-xs sm:text-sm font-medium">
            <Camera className="h-4 w-4 mr-2 text-indigo-500" /> Foto de Perfil
          </TabsTrigger>
          <TabsTrigger value="security" className="rounded-xl data-[state=active]:bg-white dark:data-[state=active]:bg-slate-800 data-[state=active]:shadow-xs text-xs sm:text-sm font-medium">
            <Lock className="h-4 w-4 mr-2 text-rose-500" /> Segurança
          </TabsTrigger>
        </TabsList>

        {/* TAB 1: IDENTIDADE & CONTATO */}
        <TabsContent value="identity">
          <form onSubmit={handleUpdateProfile}>
            <Card className="glass-panel border-slate-200/80 dark:border-slate-800/80 shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Dados do Corretor
                </CardTitle>
                <CardDescription>
                  Mantenha suas informações pessoais e registros profissionais sempre atualizados para clientes e seguradoras parceiras.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">Nome Completo</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="name"
                        className="pl-9 h-11 bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 focus:border-blue-500"
                        value={profileData.name}
                        onChange={e => setProfileData({ ...profileData, name: e.target.value })}
                        required
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">Exibido na assinatura da IA Lucas e nas propostas.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">E-mail Corporativo</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        className="pl-9 h-11 bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 focus:border-blue-500"
                        value={profileData.email}
                        onChange={e => setProfileData({ ...profileData, email: e.target.value })}
                        required
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">Utilizado para login e notificações do sistema.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium">WhatsApp Profissional</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="phone"
                        className="pl-9 h-11 bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 focus:border-blue-500 font-mono text-sm"
                        value={profileData.phone}
                        onChange={e => setProfileData({ ...profileData, phone: e.target.value })}
                        placeholder="5567999887766"
                        required
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">Com DDD (Ex: 5567999887766) para roteamento pelo n8n.</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="creci" className="text-sm font-medium">Registro SUSEP / CRECI</Label>
                    <div className="relative">
                      <BadgeCheck className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="creci"
                        className="pl-9 h-11 bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 focus:border-blue-500"
                        value={profileData.creci}
                        onChange={e => setProfileData({ ...profileData, creci: e.target.value })}
                        placeholder="Ex: 20241038"
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">Número de registro oficial junto à Superintendência de Seguros.</p>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-slate-200/60 dark:border-slate-800/60 px-6 py-4 flex justify-end">
                <Button
                  type="submit"
                  disabled={loadingProfile || isUploading}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-500/20"
                >
                  {loadingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Informações
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        {/* TAB 2: EVOLUTION API (WHATSAPP MULTI-CORRETOR) */}
        <TabsContent value="evolution">
          <form onSubmit={handleUpdateProfile}>
            <Card className="glass-panel border-slate-200/80 dark:border-slate-800/80 shadow-md">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-xl font-bold flex items-center gap-2">
                      <Radio className="h-5 w-5 text-emerald-500" />
                      Integração Evolution API (WhatsApp Próprio)
                    </CardTitle>
                    <CardDescription>
                      Configure a instância e a chave de API da sua linha do WhatsApp para que a IA Lucas fale diretamente em seu nome.
                    </CardDescription>
                  </div>
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                    isEvoConfigured 
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30' 
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                  }`}>
                    {isEvoConfigured ? (
                      <>
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                        Instância Ativa
                      </>
                    ) : (
                      <>
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Pendente de Configuração
                      </>
                    )}
                  </span>
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-2">
                {/* Explain box */}
                <div className="p-4 rounded-2xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3.5">
                  <Zap className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                  <div className="space-y-1 text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                    <p className="font-semibold text-emerald-800 dark:text-emerald-300">
                      Como funciona o disparo Multi-Corretor com n8n:
                    </p>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      Ao cadastrar sua instância e API Key da Evolution API, todas as mensagens ativas de renovação de seguros e agendamentos disparadas pelo painel enviarão seus dados no webhook para o n8n. Assim, o cliente recebe a mensagem vinda exatamente do seu número e com seu atendimento personalizado.
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="evoInstance" className="text-sm font-medium flex items-center justify-between">
                      <span>Nome da Instância (Evolution API)</span>
                      <span className="text-[11px] text-emerald-600 font-mono">Obrigatório</span>
                    </Label>
                    <div className="relative">
                      <Radio className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="evoInstance"
                        className="pl-9 h-11 bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 focus:border-emerald-500 font-mono text-sm"
                        placeholder="ex: corretor_lucas ou csb_paulo"
                        value={profileData.evoInstance}
                        onChange={e => setProfileData({ ...profileData, evoInstance: e.target.value })}
                        required
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      O nome exato cadastrado no painel da sua Evolution API.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="evoApiKey" className="text-sm font-medium flex items-center justify-between">
                      <span>API Key da Evolution</span>
                      <span className="text-[11px] text-emerald-600 font-mono">Obrigatório</span>
                    </Label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="evoApiKey"
                        type={showApiKey ? "text" : "password"}
                        className="pl-9 pr-10 h-11 bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 focus:border-emerald-500 font-mono text-sm"
                        placeholder="Chave secreta da API"
                        value={profileData.evoApiKey}
                        onChange={e => setProfileData({ ...profileData, evoApiKey: e.target.value })}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Chave de autenticação global ou da instância da Evolution API.
                    </p>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="evoApiUrl" className="text-sm font-medium flex items-center justify-between">
                      <span>Endpoint Base da Evolution API (Opcional)</span>
                      <span className="text-[11px] text-slate-400 font-mono">Opcional</span>
                    </Label>
                    <div className="relative">
                      <Globe className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="evoApiUrl"
                        className="pl-9 h-11 bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 focus:border-emerald-500 font-mono text-sm"
                        placeholder="https://sua-evolution-api.com"
                        value={profileData.evoApiUrl}
                        onChange={e => setProfileData({ ...profileData, evoApiUrl: e.target.value })}
                      />
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Caso sua corretora utilize uma VPS dedicada da Evolution API. Se vazio, o n8n utiliza o endpoint padrão da central.
                    </p>
                  </div>
                </div>

                {/* Validation summary */}
                <div className="p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 space-y-2">
                  <h4 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    Checklist de Prontidão da Mensageria
                  </h4>
                  <div className="grid sm:grid-cols-3 gap-3 pt-1">
                    <div className="flex items-center gap-2 text-xs">
                      <div className={`h-2 w-2 rounded-full ${profileData.phone ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span className={profileData.phone ? 'text-slate-900 dark:text-slate-100 font-medium' : 'text-slate-400'}>
                        WhatsApp Cadastrado
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className={`h-2 w-2 rounded-full ${profileData.evoInstance ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span className={profileData.evoInstance ? 'text-slate-900 dark:text-slate-100 font-medium' : 'text-slate-400'}>
                        Instância Definida
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <div className={`h-2 w-2 rounded-full ${profileData.evoApiKey ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                      <span className={profileData.evoApiKey ? 'text-slate-900 dark:text-slate-100 font-medium' : 'text-slate-400'}>
                        Chave API Inserida
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-slate-200/60 dark:border-slate-800/60 px-6 py-4 flex justify-end">
                <Button
                  type="submit"
                  disabled={loadingProfile}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-500/20"
                >
                  {loadingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Salvar Credenciais Evolution
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        {/* TAB 3: FOTO DE PERFIL (UPLOADTHING) */}
        <TabsContent value="avatar">
          <Card className="glass-panel border-slate-200/80 dark:border-slate-800/80 shadow-md">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Camera className="h-5 w-5 text-indigo-500" />
                Foto de Perfil (UploadThing)
              </CardTitle>
              <CardDescription>
                Adicione uma imagem de alta resolução com seu rosto ou logotipo profissional. Suporta PNG, JPG ou WebP de até 4MB.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6 pt-2">
              <div className="grid md:grid-cols-3 gap-6 items-center">
                {/* Large Preview */}
                <div className="flex flex-col items-center justify-center p-6 rounded-2xl bg-slate-100/60 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60">
                  <div className="relative p-1.5 rounded-full bg-linear-to-tr from-blue-600 via-indigo-500 to-cyan-400 shadow-xl mb-3">
                    <Avatar className="h-32 w-32 border-4 border-white dark:border-slate-950">
                      <AvatarImage src={profileData.image} className="object-cover" />
                      <AvatarFallback className="text-3xl font-bold bg-linear-to-br from-blue-600 to-indigo-700 text-white">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{profileData.name}</p>
                  <p className="text-xs text-slate-500">Visualização em tempo real</p>
                </div>

                {/* Drag and Drop Zone */}
                <div
                  onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                  onDragLeave={() => setIsDragOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragOver(false);
                    handleFileSelect(e.dataTransfer.files);
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  className={`md:col-span-2 flex flex-col items-center justify-center p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer ${
                    isDragOver 
                      ? 'border-indigo-500 bg-indigo-50/20 dark:bg-indigo-950/20 scale-[1.01]' 
                      : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500/70 hover:bg-slate-50/50 dark:hover:bg-slate-900/50'
                  }`}
                >
                  <div className="h-14 w-14 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mb-3 shadow-inner">
                    {isUploading ? (
                      <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
                    ) : (
                      <UploadCloud className="h-7 w-7" />
                    )}
                  </div>
                  
                  <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 text-center mb-1">
                    {isUploading ? 'Processando upload...' : 'Arraste sua foto para cá ou clique para navegar'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center max-w-sm mb-4">
                    Alimentado pelo serviço oficial <strong>UploadThing</strong>. Otimização e CDN de alta velocidade automáticas.
                  </p>

                  {/* Progress Bar when uploading */}
                  {isUploading && (
                    <div className="w-full max-w-xs space-y-1.5 mb-4">
                      <div className="flex justify-between text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                        <span>Enviando arquivo...</span>
                        <span>{uploadProgress}%</span>
                      </div>
                      <div className="h-2 w-full bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-linear-to-r from-blue-500 to-indigo-600 transition-all duration-300 rounded-full"
                          style={{ width: `${uploadProgress}%` }}
                        />
                      </div>
                    </div>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploading}
                    className="border-indigo-200 dark:border-indigo-800/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                  >
                    <Camera className="mr-2 h-4 w-4" /> Selecionar do Computador
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB 4: SEGURANÇA & SENHA */}
        <TabsContent value="security">
          <form onSubmit={handleChangePassword}>
            <Card className="glass-panel border-slate-200/80 dark:border-slate-800/80 shadow-md">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <Lock className="h-5 w-5 text-rose-500" />
                  Segurança da Conta
                </CardTitle>
                <CardDescription>
                  Altere sua senha de acesso à plataforma. Escolha uma combinação forte com números e caracteres especiais.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 pt-2">
                <div className="space-y-2 max-w-md">
                  <Label htmlFor="currentPass" className="text-sm font-medium">Senha Atual</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      id="currentPass"
                      type="password"
                      className="pl-9 h-11 bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 focus:border-rose-500"
                      value={passData.currentPassword}
                      onChange={e => setPassData({ ...passData, currentPassword: e.target.value })}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2 pt-2">
                  <div className="space-y-2">
                    <Label htmlFor="newPass" className="text-sm font-medium">Nova Senha</Label>
                    <Input
                      id="newPass"
                      type="password"
                      className="h-11 bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 focus:border-rose-500"
                      value={passData.newPassword}
                      onChange={e => setPassData({ ...passData, newPassword: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      required
                      minLength={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPass" className="text-sm font-medium">Confirmar Nova Senha</Label>
                    <Input
                      id="confirmPass"
                      type="password"
                      className="h-11 bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 focus:border-rose-500"
                      value={passData.confirmPassword}
                      onChange={e => setPassData({ ...passData, confirmPassword: e.target.value })}
                      placeholder="Repita a nova senha"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="border-t border-slate-200/60 dark:border-slate-800/60 px-6 py-4 flex justify-end">
                <Button
                  type="submit"
                  disabled={loadingPassword}
                  variant="destructive"
                  className="bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-500/20"
                >
                  {loadingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Atualizar Senha de Acesso
                </Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}