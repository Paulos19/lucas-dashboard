'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Upload, FileSpreadsheet, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { useRouter } from 'next/navigation';

const STATUS_MAP: Record<string, string> = {
  'ganha': 'VENDA_REALIZADA',
  'fechada': 'VENDA_REALIZADA',
  'perdida': 'PERDIDO',
  'em andamento': 'QUALIFICADO',
  'proposta': 'PROPOSTA_ENVIADA',
  'cotacao': 'AGENDADO_COTACAO',
  'novo': 'ENTRANTE',
  'prospeccao': 'ENTRANTE',
  'renovacao': 'ENTRANTE'
};

export function LeadsImportDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, valid: 0, ignored: 0 });
  const router = useRouter();

  const normalizeStr = (str: string) => {
    return String(str || '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  };

  // Encontra o valor na linha usando o mapa de índices do cabeçalho
  const findValue = (rowArray: any[], headerMap: Record<string, number>, possibleNames: string[]) => {
    for (const name of possibleNames) {
      const normalizedName = normalizeStr(name);
      // Procura no mapa de cabeçalho qual índice corresponde a esse nome
      const index = Object.keys(headerMap).find(key => normalizeStr(key) === normalizedName) 
                    ? headerMap[Object.keys(headerMap).find(key => normalizeStr(key) === normalizedName)!] 
                    : -1;
      
      if (index !== -1 && rowArray[index] !== undefined) {
        return rowArray[index];
      }
    }
    return undefined;
  };

  const cleanPhone = (phone: any) => {
    if (!phone) return '';
    const str = String(phone).replace(/\D/g, '');
    if (str.length < 8) return ''; 
    if (str.length === 11 || str.length === 10) return `55${str}`;
    return str;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsLoading(true);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0]; 
        const ws = wb.Sheets[wsname];
        
        // --- MUDANÇA CRÍTICA AQUI ---
        // 1. Convertemos para Matriz de Arrays (header: 1) para ler tudo bruto
        const rawData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as any[][];
        
        // 2. Procuramos a linha do cabeçalho
        let headerRowIndex = -1;
        
        // Escaneia as primeiras 50 linhas procurando palavras chave
        for (let i = 0; i < Math.min(rawData.length, 50); i++) {
            const rowStr = rawData[i].join(' ').toLowerCase();
            // Se a linha contiver "telefone" E "nome", achamos o cabeçalho!
            if (rowStr.includes('telefone') && (rowStr.includes('nome') || rowStr.includes('cliente'))) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            // Fallback: assume linha 0 se não achar nada
            headerRowIndex = 0;
            console.warn("Cabeçalho não detectado automaticamente, tentando linha 0.");
        }

        console.log(`Cabeçalho encontrado na linha: ${headerRowIndex + 1}`);

        // 3. Processa os dados a partir da linha do cabeçalho encontrada
        const headerRow = rawData[headerRowIndex];
        const dataRows = rawData.slice(headerRowIndex + 1);

        // Cria um mapa: Nome da Coluna -> Índice (Ex: 'Telefone Celular' -> 16)
        const headerMap: Record<string, number> = {};
        headerRow.forEach((col: any, index: number) => {
            if (col) headerMap[String(col)] = index;
        });

        processExcelData(dataRows, headerMap);

      } catch (error) {
        console.error(error);
        toast.error('Erro ao ler arquivo.');
        setFileName(null);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const processExcelData = (rows: any[][], headerMap: Record<string, number>) => {
    const formatted = rows.map((row) => {
      // Usa a nova função findValue que busca pelo índice da coluna correta
      const celular = findValue(row, headerMap, ['Telefone Celular', 'Celular', 'Whatsapp']);
      const fixo = findValue(row, headerMap, ['Telefone', 'Fixo', 'Tel Fixo']);
      const rawPhone = celular || fixo;
      const finalPhone = cleanPhone(rawPhone);

      const nome = findValue(row, headerMap, ['Nome do Cliente: Nome do Cliente', 'Nome do Cliente', 'Nome', 'Segurado']) || 'Lead Importado';

      const faseRaw = findValue(row, headerMap, ['Fase', 'Status', 'Etapa', 'Tipo de Oportunidade']);
      const faseNormalized = normalizeStr(faseRaw);
      
      // Mapeamento de Status
      let systemStatus = 'ENTRANTE';
      if (faseNormalized) {
          const match = Object.keys(STATUS_MAP).find(k => faseNormalized.includes(k));
          if (match) systemStatus = STATUS_MAP[match];
      }

      const apolice = findValue(row, headerMap, ['Apólice', 'Numero da Apolice']);
      const premio = findValue(row, headerMap, ['Prêmio Estimado', 'Valor', 'Premio']);
      
      // Cria objeto dynamicData com base no headerMap para salvar tudo
      const dynamicData: Record<string, any> = { importSource: 'XLSX', originalStatus: faseRaw };
      Object.keys(headerMap).forEach(key => {
          dynamicData[key] = row[headerMap[key]];
      });

      return {
        name: nome,
        contato: finalPhone,
        status: systemStatus,
        numeroApolice: apolice ? String(apolice) : undefined,
        faturamentoEstimado: premio ? String(premio) : undefined,
        dynamicData: dynamicData
      };
    });

    const valid = formatted.filter(l => l.contato && l.contato.length >= 10);
    
    setParsedData(valid);
    setStats({
      total: rows.length,
      valid: valid.length,
      ignored: rows.length - valid.length
    });

    if (valid.length === 0 && rows.length > 0) {
      toast.error('Nenhum telefone encontrado. Verifique se a planilha possui dados.');
    } else if (rows.length - valid.length > 0) {
      toast.warning(`${rows.length - valid.length} linhas ignoradas.`);
    }
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    setIsLoading(true);
    try {
      // Envia em lotes de 100 para não estourar o limite da API (Body size)
      const BATCH_SIZE = 100;
      let importedCount = 0;
      
      for (let i = 0; i < parsedData.length; i += BATCH_SIZE) {
          const batch = parsedData.slice(i, i + BATCH_SIZE);
          
          await fetch('/api/leads/bulk', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ leads: batch }),
          });
          importedCount += batch.length;
          toast.loading(`Importando... ${importedCount}/${parsedData.length}`);
      }

      toast.dismiss();
      toast.success(`Sucesso! ${importedCount} leads importados.`);
      setIsOpen(false);
      setParsedData([]);
      setFileName(null);
      router.refresh();
      window.location.reload(); 

    } catch (error) {
      toast.error('Erro durante a importação.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800">
          <FileSpreadsheet className="h-4 w-4 text-green-600" />
          <span className="hidden sm:inline">Importar Excel</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Importação em Massa</DialogTitle>
          <DialogDescription>
            Faça upload da sua planilha. O sistema detectará automaticamente o cabeçalho.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {!parsedData.length ? (
            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors cursor-pointer relative group">
               <input 
                  type="file" 
                  accept=".xlsx, .csv" 
                  className="absolute inset-0 opacity-0 cursor-pointer z-10"
                  onChange={handleFileUpload}
                  disabled={isLoading}
               />
               <div className="bg-slate-100 dark:bg-slate-800 p-3 rounded-full mb-3 group-hover:scale-110 transition-transform">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 text-slate-500 animate-spin" />
                  ) : (
                    <Upload className="h-6 w-6 text-slate-500" />
                  )}
               </div>
               <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                 {isLoading ? 'Lendo e procurando cabeçalho...' : 'Clique para selecionar arquivo'}
               </p>
               <p className="text-xs text-muted-foreground mt-1">
                 {fileName || 'XLSX ou CSV'}
               </p>
            </div>
          ) : (
            <div className="space-y-4">
               <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg flex items-center gap-3 border border-green-100 dark:border-green-900/50">
                  <CheckCircle className="h-8 w-8 text-green-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-300">Arquivo Válido!</p>
                    <p className="text-sm text-green-700/80 dark:text-green-400/80 mt-1">
                       Identificamos <b>{stats.valid}</b> leads com telefone.
                    </p>
                  </div>
               </div>
               
               {stats.ignored > 0 && (
                   <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 border border-amber-100 dark:border-amber-900/50">
                       <AlertCircle className="h-4 w-4" />
                       <span>{stats.ignored} linhas ignoradas (cabeçalho, vazias ou sem tel).</span>
                   </div>
               )}

               <div className="text-xs text-muted-foreground bg-slate-50 dark:bg-slate-900 p-3 rounded border">
                  <p className="font-medium mb-1">Exemplo do 1º Lead:</p>
                  <p>Nome: {parsedData[0].name}</p>
                  <p>Tel: {parsedData[0].contato}</p>
                  <p>Status: {parsedData[0].status}</p>
               </div>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between flex-row items-center gap-2">
           {parsedData.length > 0 ? (
               <Button variant="ghost" onClick={() => { setParsedData([]); setFileName(null); }}>
                  Cancelar
               </Button>
           ) : <div />}
           
           <Button 
             onClick={handleImport} 
             disabled={parsedData.length === 0 || isLoading}
             className="bg-green-600 hover:bg-green-700 text-white w-full sm:w-auto"
           >
             {isLoading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
             Confirmar Importação
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}