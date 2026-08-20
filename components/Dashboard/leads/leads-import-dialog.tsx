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
import { parseExcelAction } from '@/app/actions/import-excel';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Lock } from 'lucide-react';

import { useSession } from 'next-auth/react';

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
  const { data: session } = useSession();
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [password, setPassword] = useState<string>('');
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [parsedData, setParsedData] = useState<any[]>([]);
  const [stats, setStats] = useState({ total: 0, valid: 0, ignored: 0 });
  const [foreignBrokerError, setForeignBrokerError] = useState<string | null>(null);
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
    reader.onload = async (evt) => {
      try {
        const arrayBuffer = evt.target?.result as ArrayBuffer;

        let rawData: any[][] = [];

        // Tenta primeiro com o Server Action (usa XlsxPopulate no servidor)
        const formData = new FormData();
        formData.append('file', file);

        const response = await parseExcelAction(formData, password);

        if (response.success && response.data) {
          rawData = response.data;
        } else {
          console.warn("Server Action falhou, tentando fallback local XLSX:", response.error);

          // Se não houver senha, tentamos com XLSX (SheetJS) localmente (bom para CSVs e arquivos simples)
          if (!password) {
            const arrayBuffer = await file.arrayBuffer();
            const bstr = new Uint8Array(arrayBuffer).reduce((data, byte) => data + String.fromCharCode(byte), '');
            const wb = XLSX.read(bstr, { type: 'binary' });
            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            rawData = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as any[][];
          } else {
            // Se tinha senha e o Server Action falhou, provavelmente a senha está errada
            throw new Error(response.error || "Senha incorreta ou arquivo protegido incompatível.");
          }
        }

        if (rawData.length === 0) {
          throw new Error("Nenhum dado encontrado no arquivo.");
        }

        // 2. Procuramos a linha do cabeçalho
        let headerRowIndex = -1;

        // Escaneia as primeiras 50 linhas procurando palavras chave
        for (let i = 0; i < Math.min(rawData.length, 50); i++) {
          const row = rawData[i];
          if (!row || !Array.isArray(row)) continue;
          const rowStr = row.join(' ').toLowerCase();
          // Se a linha contiver "telefone" E "nome", achamos o cabeçalho!
          if (rowStr.includes('telefone') && (rowStr.includes('nome') || rowStr.includes('cliente'))) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          headerRowIndex = 0;
          console.warn("Cabeçalho não detectado automaticamente, tentando linha 0.");
        }

        // 3. Processa os dados
        const headerRow = rawData[headerRowIndex];
        const dataRows = rawData.slice(headerRowIndex + 1);

        const headerMap: Record<string, number> = {};
        headerRow.forEach((col: any, index: number) => {
          if (col) headerMap[String(col)] = index;
        });

        processExcelData(dataRows, headerMap);

      } catch (error: any) {
        console.error(error);
        toast.error(error.message || 'Erro ao ler arquivo.');
        setFileName(null);
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const processExcelData = (rows: any[][], headerMap: Record<string, number>) => {
    const formatted = rows.map((row) => {
      const celular = findValue(row, headerMap, ['Telefone Celular', 'Celular', 'Whatsapp']);
      const fixo = findValue(row, headerMap, ['Telefone', 'Telefone Fixo', 'Fixo', 'Tel Fixo']);
      const rawPhone = celular || fixo;
      const finalPhone = cleanPhone(rawPhone);

      const nome = findValue(row, headerMap, ['Cliente', 'Nome do Cliente: Nome do Cliente', 'Nome do Cliente', 'Nome', 'Segurado']) || 'Lead Importado';

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
      const prioridade = findValue(row, headerMap, ['Prioridade']);
      const ramo = findValue(row, headerMap, ['Ramo']);
      const campanha = findValue(row, headerMap, ['Campanha']);
      const agencia = findValue(row, headerMap, ['Agência', 'Agencia']);
      const corretorNome = findValue(row, headerMap, ['Corretor', 'Nome do Corretor']);
      const encerramentoRaw = findValue(row, headerMap, ['Data de Encerramento', 'Data Renovacao', 'Data Renovação', 'Vencimento']);

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
        prioridade: prioridade ? String(prioridade) : undefined,
        ramo: ramo ? String(ramo) : undefined,
        campanha: campanha ? String(campanha) : undefined,
        fase: faseRaw ? String(faseRaw) : undefined,
        telefoneFixo: fixo && String(fixo).trim() !== '00' ? String(fixo).trim() : undefined,
        agencia: agencia ? String(agencia) : undefined,
        corretorNome: corretorNome ? String(corretorNome) : undefined,
        dataRenovacao: encerramentoRaw ? String(encerramentoRaw) : undefined,
        dynamicData: dynamicData
      };
    });

    // Filtra linhas que tenham pelo menos um nome válido
    const valid = formatted.filter(l => l.name && l.name !== 'Lead Importado');

    // Validação de Corretores de Terceiros (se não for ADMIN)
    const isUserAdmin = session?.user?.role === 'ADMIN';
    const currentUserName = (session?.user?.name || '').trim().toLowerCase();

    if (!isUserAdmin) {
      const foreignBrokers = new Set<string>();
      for (const item of valid) {
        const cNome = String(item.corretorNome || '').trim();
        if (cNome && cNome.toLowerCase() !== currentUserName) {
          foreignBrokers.add(cNome);
        }
      }
      if (foreignBrokers.size > 0) {
        const list = Array.from(foreignBrokers).slice(0, 3).join(', ');
        const errorMsg = `Esta planilha contém leads atribuídos a outros corretores (${list}). Como usuário corretor, você só pode importar leads próprios ou sem atribuição de terceiros.`;
        setForeignBrokerError(errorMsg);
        toast.error(`Bloqueio: A planilha contém leads de outros corretores (${list}).`);
      } else {
        setForeignBrokerError(null);
      }
    } else {
      setForeignBrokerError(null);
    }

    setParsedData(valid);
    setStats({
      total: rows.length,
      valid: valid.length,
      ignored: rows.length - valid.length
    });

    if (valid.length === 0 && rows.length > 0) {
      toast.error('Nenhum dado válido encontrado. Verifique se a planilha possui nomes.');
    } else if (rows.length - valid.length > 0) {
      toast.warning(`${rows.length - valid.length} linhas ignoradas.`);
    }
  };

  const handleImport = async () => {
    if (parsedData.length === 0) return;

    if (foreignBrokerError) {
      toast.error(foreignBrokerError);
      return;
    }

    setIsLoading(true);
    try {
      // Envia em lotes de 100 para não estourar o limite da API (Body size)
      const BATCH_SIZE = 100;
      let importedCount = 0;

      for (let i = 0; i < parsedData.length; i += BATCH_SIZE) {
        const batch = parsedData.slice(i, i + BATCH_SIZE);

        const res = await fetch('/api/leads/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ leads: batch }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Erro ao importar leads');
        }

        importedCount += batch.length;
        toast.loading(`Importando... ${importedCount}/${parsedData.length}`);
      }

      toast.dismiss();
      toast.success(`Sucesso! ${importedCount} leads importados.`);
      setIsOpen(false);
      setParsedData([]);
      setFileName(null);
      setForeignBrokerError(null);
      router.refresh();
      window.location.reload();

    } catch (error: any) {
      toast.dismiss();
      toast.error(error.message || 'Erro durante a importação.');
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
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password-toggle" className="text-sm font-medium flex items-center gap-2">
                <Lock className="h-3 w-3" /> Arquivo Protegido?
              </Label>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[10px]"
                onClick={() => setShowPasswordInput(!showPasswordInput)}
              >
                {showPasswordInput ? 'Ocultar' : 'Informar Senha'}
              </Button>
            </div>
            {showPasswordInput && (
              <Input
                id="excel-password"
                type="password"
                placeholder="Digite a senha do arquivo..."
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-8 text-sm"
              />
            )}
          </div>

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
              {foreignBrokerError ? (
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg flex items-start gap-3 border border-red-200 dark:border-red-800">
                  <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold text-red-800 dark:text-red-300 text-sm">Bloqueio de Importação</p>
                    <p className="text-xs text-red-700/90 dark:text-red-400 mt-1">
                      {foreignBrokerError}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg flex items-center gap-3 border border-green-100 dark:border-green-900/50">
                  <CheckCircle className="h-8 w-8 text-green-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-green-800 dark:text-green-300">Arquivo Válido!</p>
                    <p className="text-sm text-green-700/80 dark:text-green-400/80 mt-1">
                      Identificamos <b>{stats.valid}</b> leads com telefone.
                    </p>
                  </div>
                </div>
              )}

              {stats.ignored > 0 && (
                <div className="bg-amber-50 dark:bg-amber-900/20 p-3 rounded-lg flex items-center gap-2 text-xs text-amber-800 dark:text-amber-300 border border-amber-100 dark:border-amber-900/50">
                  <AlertCircle className="h-4 w-4" />
                  <span>{stats.ignored} linhas ignoradas (cabeçalho, vazias ou sem tel).</span>
                </div>
              )}

              <div className="text-xs text-muted-foreground bg-slate-50 dark:bg-slate-900 p-3 rounded border">
                <p className="font-medium mb-1">Exemplo do 1º Lead:</p>
                <p>Nome: {parsedData[0]?.name}</p>
                <p>Tel: {parsedData[0]?.contato}</p>
                <p>Status: {parsedData[0]?.status}</p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="sm:justify-between flex-row items-center gap-2">
          {parsedData.length > 0 ? (
            <Button variant="ghost" onClick={() => { setParsedData([]); setFileName(null); setForeignBrokerError(null); }}>
              Cancelar
            </Button>
          ) : <div />}

          <Button
            onClick={handleImport}
            disabled={parsedData.length === 0 || isLoading || !!foreignBrokerError}
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