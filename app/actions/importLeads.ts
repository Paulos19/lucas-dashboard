'use server'

import { PrismaClient, LeadStatus } from '@prisma/client'
import * as xlsx from 'xlsx'

const prisma = new PrismaClient()

export async function importLeadsAction(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) {
      return { success: false, error: 'Arquivo não encontrado' };
    }

    const buffer = await file.arrayBuffer();
    // xlsx expects a Buffer, in Node 18+ arrayBuffer is fine but we can wrap it
    const workbook = xlsx.read(Buffer.from(buffer), { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    const data = xlsx.utils.sheet_to_json(worksheet, { defval: null }) as any[];

    if (data.length === 0) {
      return { success: false, error: 'A planilha está vazia' };
    }

    let importedCount = 0;

    for (const row of data) {
      const corretorNomeDirty = row['Classificar por:\nCorretor\nClassificado: nenhum\nExibir Corretor ações de colunas'] || '';
      const corretorNome = corretorNomeDirty.trim();

      const clienteDirty = row['Classificar por:\nCliente\nClassificado em ordem decrescente\nExibir Cliente ações de colunas'] || '';
      const nomeCliente = clienteDirty.trim();
      
      const celularDirty = row['Celular\nExibir Celular ações de colunas'] || '';
      const telefoneDirty = row['Classificar por:\nTelefone\nClassificado: nenhum\nExibir Telefone ações de colunas'] || '';
      const contato = (celularDirty || telefoneDirty || '').trim();

      const campanha = row['Campanha\nExibir Campanha ações de colunas'] || '';
      const ramo = row['Ramo\nExibir Ramo ações de colunas'] || '';
      const fase = row['Fase'] || '';

      if (!nomeCliente) continue;

      let userId = null;
      if (corretorNome) {
        const user = await prisma.user.findFirst({
          where: {
            name: {
              equals: corretorNome,
              mode: 'insensitive'
            }
          }
        });
        if (user) {
          userId = user.id;
        }
      }

      // Verifica se o lead já existe (por contato ou por nome + corretor)
      let existingLeadId = null;

      if (contato) {
        const lead = await prisma.lead.findUnique({ where: { contato } });
        if (lead) existingLeadId = lead.id;
      } else {
        const lead = await prisma.lead.findFirst({
          where: {
            name: nomeCliente,
            corretorNome: corretorNome || null
          }
        });
        if (lead) existingLeadId = lead.id;
      }

      const safeContato = contato || `SEM_CONTATO_${Date.now()}_${Math.random()}`;

      if (existingLeadId) {
        // Atualiza os dados para não duplicar (mesmo se o status ou corretor mudar na planilha)
        // Busca os dados dinâmicos existentes (se houver) para mesclar
        const currentLead = await prisma.lead.findUnique({ where: { id: existingLeadId } });
        const existingDynamic = currentLead?.dynamicData && typeof currentLead.dynamicData === 'object' ? currentLead.dynamicData : {};
        
        await prisma.lead.update({
          where: { id: existingLeadId },
          data: {
            corretorNome: corretorNome || null,
            ...(userId && { userId }),
            campanha: campanha || null,
            ramo: ramo || null,
            fase: fase || null,
            dynamicData: { ...(existingDynamic as object), ...row } // Salva todas as infos da planilha
          }
        });
      } else {
        // Cria um lead novo
        await prisma.lead.create({
          data: {
            name: nomeCliente,
            contato: safeContato,
            origemLead: campanha ? `Planilha - ${campanha}` : 'Planilha Admin',
            corretorNome: corretorNome || null,
            ...(userId && { userId }),
            status: 'ENTRANTE',
            campanha: campanha || null,
            ramo: ramo || null,
            fase: fase || null,
            dynamicData: row // Salva a linha inteira da planilha
          }
        });
      }

      importedCount++;
    }

    return { success: true, count: importedCount };
  } catch (error) {
    console.error("Erro ao importar leads:", error);
    return { success: false, error: 'Falha ao processar o arquivo.' };
  }
}
