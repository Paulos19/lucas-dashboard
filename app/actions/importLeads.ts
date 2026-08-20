'use server';

import { prisma } from '@/lib/prisma';
import * as xlsx from 'xlsx';

// Normaliza cabeçalhos removendo acentos, quebras de linha e espaços extras
function normalizeHeader(str: string): string {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Busca o valor na linha buscando por correspondência exata ou parcial de nomes possíveis
function getColumnValue(row: Record<string, any>, possibleNames: string[]): any {
  const keys = Object.keys(row);
  // 1. Busca exata normalizada
  for (const name of possibleNames) {
    const target = normalizeHeader(name);
    for (const key of keys) {
      if (normalizeHeader(key) === target) {
        return row[key];
      }
    }
  }
  // 2. Busca parcial (contains)
  for (const name of possibleNames) {
    const target = normalizeHeader(name);
    for (const key of keys) {
      if (normalizeHeader(key).includes(target)) {
        return row[key];
      }
    }
  }
  return undefined;
}

// Converte datas brasileiras (DD/MM/AAAA), ISO ou número serial Excel em objeto Date
function parseDate(dateVal: any): Date | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) return dateVal;

  if (typeof dateVal === 'string') {
    const trimmed = dateVal.trim();
    const brMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (brMatch) {
      const day = parseInt(brMatch[1], 10);
      const month = parseInt(brMatch[2], 10) - 1;
      let year = parseInt(brMatch[3], 10);
      if (year < 100) year += 2000;
      const parsed = new Date(year, month, day);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    const d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
  }

  if (typeof dateVal === 'number') {
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const d = new Date(excelEpoch.getTime() + dateVal * 86400000);
    if (!isNaN(d.getTime())) return d;
  }

  return null;
}

// Limpa e padroniza telefones brasileiros para o padrão E.164 (DDI 55)
function cleanAndStandardizePhone(phone: any): string {
  if (!phone) return '';
  let clean = String(phone).replace(/\D/g, '');
  if (clean.length < 8) return '';
  if (clean.length >= 10 && clean.length <= 11) {
    clean = '55' + clean;
  }
  return clean;
}

import { auth } from '@/lib/auth';

// Busca usuário corretor correspondente no banco pelo mesmo nome registrado na planilha
async function findCorretorUser(corretorNome: string | null) {
  if (!corretorNome) return null;
  const cleanName = corretorNome.trim();

  // Busca exata (case-insensitive) pelo nome registrado
  const user = await prisma.user.findFirst({
    where: { name: { equals: cleanName, mode: 'insensitive' } },
  });
  return user;
}

export async function importLeadsAction(formData: FormData) {
  // Regra de Permissão: Apenas o ADMIN pode importar planilhas globais
  const session = await auth();
  if (!session?.user || session.user.role !== 'ADMIN') {
    return { success: false, error: 'Apenas administradores têm permissão para importar planilhas globais.' };
  }

  try {
    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: 'Arquivo não encontrado' };
    }

    const buffer = await file.arrayBuffer();
    const workbook = xlsx.read(Buffer.from(buffer), { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const data = xlsx.utils.sheet_to_json(worksheet, { defval: null }) as any[];

    if (data.length === 0) {
      return { success: false, error: 'A planilha está vazia' };
    }

    let importedCount = 0;

    for (const row of data) {
      // Extração resiliente de cada coluna
      const nomeRaw = getColumnValue(row, ['Cliente', 'Nome do Cliente', 'Nome', 'Segurado']);
      const celularRaw = getColumnValue(row, ['Celular', 'Telefone Celular', 'Whatsapp']);
      const fixoRaw = getColumnValue(row, ['Telefone', 'Telefone Fixo', 'Fixo', 'Tel Fixo']);
      const corretorRaw = getColumnValue(row, ['Corretor', 'Nome do Corretor']);
      const campanhaRaw = getColumnValue(row, ['Campanha']);
      const ramoRaw = getColumnValue(row, ['Ramo']);
      const faseRaw = getColumnValue(row, ['Fase', 'Status', 'Etapa']);
      const prioridadeRaw = getColumnValue(row, ['Prioridade']);
      const encerramentoRaw = getColumnValue(row, ['Data de Encerramento', 'Data Renovacao', 'Data Renovação', 'Vencimento']);
      const agenciaRaw = getColumnValue(row, ['Agência', 'Agencia']);

      const nomeCliente = String(nomeRaw || '').trim();
      if (!nomeCliente) continue;

      const contato = cleanAndStandardizePhone(celularRaw || fixoRaw);
      const telefoneFixo = fixoRaw && String(fixoRaw).trim() !== '00' ? String(fixoRaw).trim() : null;
      const prioridade = prioridadeRaw ? String(prioridadeRaw).trim() : null;
      const ramo = ramoRaw ? String(ramoRaw).trim() : null;
      const campanha = campanhaRaw ? String(campanhaRaw).trim() : null;
      const fase = faseRaw ? String(faseRaw).trim() : null;
      const dataRenovacao = parseDate(encerramentoRaw);
      const corretorNome = corretorRaw ? String(corretorRaw).trim() : null;
      const agencia = agenciaRaw ? String(agenciaRaw).trim() : null;

      // Localiza o usuário corretor responsável no sistema
      const matchedUser = await findCorretorUser(corretorNome);
      const userId = matchedUser ? matchedUser.id : null;

      // Garante um identificador único de contato
      const safeContato = contato || `SEM_CONTATO_${Date.now()}_${Math.random().toString(36).substring(7)}`;

      // Verifica se o lead já existe (por contato ou por nome + corretor)
      let existingLeadId: string | null = null;

      if (contato) {
        const lead = await prisma.lead.findUnique({ where: { contato } });
        if (lead) existingLeadId = lead.id;
      } else {
        const lead = await prisma.lead.findFirst({
          where: {
            name: nomeCliente,
            corretorNome: corretorNome || null,
          },
        });
        if (lead) existingLeadId = lead.id;
      }

      if (existingLeadId) {
        const currentLead = await prisma.lead.findUnique({ where: { id: existingLeadId } });
        const existingDynamic = currentLead?.dynamicData && typeof currentLead.dynamicData === 'object' ? currentLead.dynamicData : {};

        await prisma.lead.update({
          where: { id: existingLeadId },
          data: {
            name: nomeCliente,
            corretorNome: corretorNome || currentLead?.corretorNome || null,
            ...(userId && { userId }),
            campanha: campanha || currentLead?.campanha || null,
            ramo: ramo || currentLead?.ramo || null,
            fase: fase || currentLead?.fase || null,
            prioridade: prioridade || currentLead?.prioridade || null,
            telefoneFixo: telefoneFixo || currentLead?.telefoneFixo || null,
            agencia: agencia || currentLead?.agencia || null,
            ...(dataRenovacao && { dataRenovacao }),
            dynamicData: { ...(existingDynamic as object), ...row },
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.lead.create({
          data: {
            name: nomeCliente,
            contato: safeContato,
            origemLead: campanha ? `Planilha - ${campanha}` : 'Planilha de Renovação',
            corretorNome: corretorNome || null,
            ...(userId && { userId }),
            status: 'ENTRANTE',
            campanha: campanha || null,
            ramo: ramo || null,
            fase: fase || null,
            prioridade: prioridade || null,
            telefoneFixo: telefoneFixo || null,
            agencia: agencia || null,
            dataRenovacao: dataRenovacao || null,
            dynamicData: row,
          },
        });
      }

      importedCount++;
    }

    return { success: true, count: importedCount };
  } catch (error: any) {
    console.error('Erro ao importar leads:', error);
    return { success: false, error: error?.message || 'Falha ao processar o arquivo.' };
  }
}

