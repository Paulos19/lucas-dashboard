import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { differenceInDays } from 'date-fns';

const N8N_DISPATCH_WEBHOOK_URL = 'https://n8n-n8n.khdya3.easypanel.host/webhook/lucas-disparar';

function cleanPhone(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/\D/g, '');
  if (clean.length >= 10 && clean.length <= 11) {
    clean = '55' + clean;
  }
  return clean;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    let leadIds: string[] = [];

    if (Array.isArray(body.leadIds)) {
      leadIds = body.leadIds.filter(Boolean);
    } else if (body.leadId) {
      leadIds = [body.leadId];
    }

    if (leadIds.length === 0) {
      return NextResponse.json({ error: 'Nenhum lead selecionado para disparo.' }, { status: 400 });
    }

    const whereClause: any = {
      id: { in: leadIds },
    };

    // Se não for admin, só pode disparar para seus próprios leads
    if (session.user.role !== 'ADMIN') {
      whereClause.userId = session.user.id;
    }

    const leads = await prisma.lead.findMany({
      where: whereClause,
      include: {
        user: {
          select: { id: true, name: true, phone: true }
        },
        interestedInProduct: {
          select: { name: true }
        }
      },
      orderBy: [
        { dataRenovacao: { sort: 'asc', nulls: 'last' } },
        { prioridade: 'asc' },
        { createdAt: 'asc' }
      ]
    });

    if (leads.length === 0) {
      return NextResponse.json({ error: 'Nenhum lead elegível encontrado com os IDs fornecidos.' }, { status: 404 });
    }

    let successCount = 0;
    const errors: Array<{ leadId: string; name: string; error: string }> = [];

    // Processa os disparos na ordem exata de prioridade (vencimento mais próximo primeiro)
    for (const lead of leads) {
      const phone = cleanPhone(lead.contato);
      if (!phone || phone.length < 10) {
        errors.push({ leadId: lead.id, name: lead.name, error: 'Telefone inválido ou ausente' });
        continue;
      }

      const userSession = session.user as any;
      const instancePhone = lead.user?.phone ? cleanPhone(lead.user.phone) : (userSession.phone ? cleanPhone(userSession.phone) : 'default');
      const diasAteVencimento = lead.dataRenovacao ? differenceInDays(new Date(lead.dataRenovacao), new Date()) : null;

      const payload = {
        leadId: lead.id,
        phone: phone,
        leadName: lead.name,
        instancePhone: instancePhone,
        instanceName: instancePhone,
        ramo: lead.ramo || lead.interestedInProduct?.name || 'Seguro Residencial',
        campanha: lead.campanha || lead.origemLead || 'Campanha de Renovação',
        prioridade: lead.prioridade || 'Normal',
        agencia: lead.agencia || 'Agência Bancária',
        dataRenovacao: lead.dataRenovacao ? lead.dataRenovacao.toISOString() : null,
        diasAteVencimento: diasAteVencimento,
        corretorNome: lead.corretorNome || lead.user?.name || session.user.name || 'CSB Seguros'
      };

      try {
        const response = await fetch(N8N_DISPATCH_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok) {
          successCount++;
          // Atualiza status no banco
          await prisma.lead.update({
            where: { id: lead.id },
            data: {
              firstContactSent: true,
              updatedAt: new Date()
            }
          });
        } else {
          const errorText = await response.text();
          errors.push({ leadId: lead.id, name: lead.name, error: `Falha no webhook n8n (${response.status}): ${errorText}` });
        }
      } catch (err: any) {
        errors.push({ leadId: lead.id, name: lead.name, error: err.message || 'Erro ao conectar com webhook' });
      }
    }

    return NextResponse.json({
      success: true,
      dispatchedCount: successCount,
      totalRequested: leadIds.length,
      found: leads.length,
      errors: errors.length > 0 ? errors : undefined
    });

  } catch (error: any) {
    console.error('Erro na rota de disparo:', error);
    return NextResponse.json({ error: 'Erro interno ao processar disparo.' }, { status: 500 });
  }
}
