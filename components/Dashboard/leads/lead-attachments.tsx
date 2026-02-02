'use client';

import { useState, useRef } from 'react';
import { upload } from '@vercel/blob/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { FileText, UploadCloud, Loader2, Trash2, Download, Paperclip, FileImage } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { saveAttachment, deleteAttachment } from '@/app/actions/attachments';
import { useRouter } from 'next/navigation';

interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  createdAt: Date | string;
}

interface LeadAttachmentsProps {
  leadId: string;
  initialAttachments: Attachment[];
}

export function LeadAttachments({ leadId, initialAttachments }: LeadAttachmentsProps) {
  const [attachments, setAttachments] = useState<Attachment[]>(initialAttachments);
  const [isUploading, setIsUploading] = useState(false);
  const inputFileRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    setIsUploading(true);

    try {
      // 1. Upload para o Vercel Blob
      const newBlob = await upload(file.name, file, {
        access: 'public',
        handleUploadUrl: '/api/upload',
      });

      // 2. Salvar referência no Banco (Server Action)
      const result = await saveAttachment(leadId, newBlob.url, file.name, file.type);

      if (result.success && result.attachment) {
        setAttachments([result.attachment as unknown as Attachment, ...attachments]);
        toast.success('Arquivo anexado com sucesso!');
        router.refresh();
      } else {
        throw new Error('Falha ao registrar arquivo');
      }

    } catch (error) {
      console.error(error);
      toast.error('Erro ao fazer upload do arquivo.');
    } finally {
      setIsUploading(false);
      if (inputFileRef.current) inputFileRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    if(!confirm("Deseja remover este anexo?")) return;
    
    // Otimista: remove da UI na hora
    const previous = attachments;
    setAttachments(attachments.filter(a => a.id !== id));

    const result = await deleteAttachment(id);
    
    if (!result.success) {
      setAttachments(previous); // Rollback
      toast.error("Erro ao deletar.");
    } else {
      toast.success("Arquivo removido.");
      router.refresh();
    }
  };

  const getIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="h-8 w-8 text-red-500" />;
    if (type.includes('image')) return <FileImage className="h-8 w-8 text-blue-500" />;
    return <Paperclip className="h-8 w-8 text-slate-500" />;
  };

  return (
    <Card className="border-none shadow-none bg-transparent">
      <CardHeader className="px-0 pt-0">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Documentos e Arquivos</CardTitle>
            <CardDescription>Gerencie propostas, apólices e documentos do cliente.</CardDescription>
          </div>
          <div>
            <input
              ref={inputFileRef}
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              onChange={handleUpload}
              disabled={isUploading}
            />
            <Button 
              onClick={() => inputFileRef.current?.click()} 
              disabled={isUploading}
              className="gap-2"
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UploadCloud className="h-4 w-4" />
              )}
              {isUploading ? 'Enviando...' : 'Novo Arquivo'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {attachments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-lg bg-slate-50 dark:bg-slate-900/50">
            <div className="p-4 rounded-full bg-slate-100 dark:bg-slate-800 mb-3">
               <Paperclip className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">Nenhum arquivo anexado</p>
            <p className="text-xs text-muted-foreground mt-1">Faça upload de propostas (PDF) ou imagens.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attachments.map((file) => (
              <div 
                key={file.id} 
                className="group flex items-start gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:shadow-md transition-all"
              >
                <div className="shrink-0 p-2 bg-slate-50 dark:bg-slate-800 rounded-md">
                   {getIcon(file.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(file.createdAt), "dd/MM/yyyy 'às' HH:mm")}
                  </p>
                  <div className="flex items-center gap-3 mt-3">
                    <a 
                      href={file.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs font-medium text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Download className="h-3 w-3" /> Baixar / Visualizar
                    </a>
                    <button 
                      onClick={() => handleDelete(file.id)}
                      className="text-xs font-medium text-red-500 hover:underline flex items-center gap-1"
                    >
                      <Trash2 className="h-3 w-3" /> Remover
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}