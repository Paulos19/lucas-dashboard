import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

const N8N_API_KEY = process.env.N8N_INTERNAL_API_KEY;

// GET: Lista slots
export async function GET(request: Request) {
  const session = await auth();
  const apiKey = request.headers.get('x-api-key');

  // Pega o userId da query string (para o n8n)
  const { searchParams } = new URL(request.url);
  const queryUserId = searchParams.get('userId');

  let targetUserId: string | undefined;

  // 1. Autenticação via Sessão (Acesso pelo Dashboard)
  if (session?.user?.id) {
    targetUserId = session.user.id;
  }
  // 2. Autenticação via API Key (Acesso pelo n8n)
  else if (apiKey && N8N_API_KEY && apiKey === N8N_API_KEY) {
    if (!queryUserId) {
      return NextResponse.json({ error: 'userId é obrigatório para acesso via API' }, { status: 400 });
    }
    targetUserId = queryUserId;
  }
  // 3. Bloqueio
  else {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  try {
    // Retorna slots futuros apenas
    const slots = await prisma.availabilitySlot.findMany({
      where: {
        userId: targetUserId,
        startTime: { gte: new Date() }, // Apenas futuros
        isBooked: false // Apenas livres
      },
      orderBy: { startTime: 'asc' }
    });

    // Formata o horário para Brasília (GMT-3) mantendo o ISO original
    const slotsFormatados = slots.map(slot => {
      const dataHoraBR = new Date(slot.startTime).toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      return {
        ...slot,
        dataHoraISO: slot.startTime, // IA vai usar isso na tool criar_agendamento
        horarioBrasilia: dataHoraBR // IA vai ler isso para o cliente
      };
    });

    return NextResponse.json(slotsFormatados);
  } catch (error) {
    console.error("Erro ao buscar slots:", error);
    return NextResponse.json({ error: 'Erro ao buscar disponibilidade' }, { status: 500 });
  }
}

// POST: Cria novo(s) slot(s) - suporta individual, múltiplos e gerador automático
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const body = await request.json();

    // 1. MODO GERADOR EM LOTE AUTOMÁTICO (Dias Úteis, Horário Comercial)
    if (body.mode === 'business_days') {
      const daysCount = parseInt(body.daysCount) || 14; // Default: 2 semanas
      const startHour = parseInt(body.startHour) || 9;  // 09:00
      const endHour = parseInt(body.endHour) || 18;    // 18:00
      const excludeLunch = body.excludeLunch !== false; // 12h-13h pausa
      const intervalMinutes = parseInt(body.intervalMinutes) || 60; // 60 min

      const slotsToCreate: Array<{ userId: string; startTime: Date; endTime: Date; isBooked: boolean }> = [];
      const now = new Date();

      // Busca slots já existentes do corretor para não duplicar
      const existingSlots = await prisma.availabilitySlot.findMany({
        where: {
          userId,
          startTime: { gte: now }
        },
        select: { startTime: true }
      });
      const existingTimestamps = new Set(existingSlots.map(s => s.startTime.getTime()));

      for (let dayOffset = 0; dayOffset < daysCount; dayOffset++) {
        const targetDate = new Date();
        targetDate.setDate(now.getDate() + dayOffset);
        
        const dayOfWeek = targetDate.getDay(); // 0 = Domingo, 6 = Sábado
        // Apenas dias úteis (Segunda a Sexta)
        if (dayOfWeek === 0 || dayOfWeek === 6) continue;

        for (let hour = startHour; hour < endHour; hour++) {
          // Pula horário de almoço se solicitado (12h - 13h)
          if (excludeLunch && hour === 12) continue;

          const slotStart = new Date(targetDate);
          slotStart.setHours(hour, 0, 0, 0);

          // Não gera horários que já passaram hoje
          if (slotStart <= now) continue;

          // Evita duplicar se o corretor já tem esse horário
          if (existingTimestamps.has(slotStart.getTime())) continue;

          const slotEnd = new Date(slotStart);
          slotEnd.setMinutes(slotEnd.getMinutes() + intervalMinutes);

          slotsToCreate.push({
            userId,
            startTime: slotStart,
            endTime: slotEnd,
            isBooked: false
          });
        }
      }

      if (slotsToCreate.length > 0) {
        await prisma.availabilitySlot.createMany({
          data: slotsToCreate
        });
      }

      return NextResponse.json({ 
        success: true, 
        createdCount: slotsToCreate.length,
        message: `${slotsToCreate.length} horários comerciais gerados com sucesso!` 
      }, { status: 201 });
    }

    // 2. MODO MÚLTIPLOS SLOTS (Array de slots)
    if (Array.isArray(body.slots) && body.slots.length > 0) {
      const validSlots = body.slots
        .map((s: { startISO: string; endISO: string }) => ({
          userId,
          startTime: new Date(s.startISO),
          endTime: new Date(s.endISO),
          isBooked: false
        }))
        .filter((s: { userId: string; startTime: Date; endTime: Date; isBooked: boolean }) => 
          !isNaN(s.startTime.getTime()) && !isNaN(s.endTime.getTime()) && s.startTime < s.endTime
        );

      if (validSlots.length === 0) {
        return NextResponse.json({ error: 'Nenhum slot válido informado' }, { status: 400 });
      }

      await prisma.availabilitySlot.createMany({
        data: validSlots
      });

      return NextResponse.json({ 
        success: true, 
        createdCount: validSlots.length 
      }, { status: 201 });
    }

    // 3. MODO INDIVIDUAL (startISO e endISO simples)
    const { startISO, endISO } = body;
    if (!startISO || !endISO) {
      return NextResponse.json({ error: 'Parâmetros startISO e endISO são obrigatórios' }, { status: 400 });
    }

    const start = new Date(startISO);
    const end = new Date(endISO);

    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) {
      return NextResponse.json({ error: 'Hora final deve ser maior que inicial' }, { status: 400 });
    }

    const slot = await prisma.availabilitySlot.create({
      data: {
        userId,
        startTime: start,
        endTime: end,
        isBooked: false
      }
    });

    return NextResponse.json(slot, { status: 201 });

  } catch (error) {
    console.error("Erro ao criar slot:", error);
    return NextResponse.json({ error: 'Erro ao criar slot' }, { status: 500 });
  }
}

// DELETE: Remove slot(s)
export async function DELETE(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const dateISO = searchParams.get('dateISO');
    const clearPast = searchParams.get('clearPast');

    // Limpeza de horários passados e livres
    if (clearPast === 'true') {
      const result = await prisma.availabilitySlot.deleteMany({
        where: {
          userId,
          startTime: { lt: new Date() },
          isBooked: false
        }
      });
      return NextResponse.json({ success: true, deletedCount: result.count });
    }

    // Limpeza de todos os horários livres de um dia específico
    if (dateISO) {
      const dayStart = new Date(dateISO);
      dayStart.setHours(0, 0, 0, 0);

      const dayEnd = new Date(dateISO);
      dayEnd.setHours(23, 59, 59, 999);

      const result = await prisma.availabilitySlot.deleteMany({
        where: {
          userId,
          startTime: { gte: dayStart, lte: dayEnd },
          isBooked: false
        }
      });
      return NextResponse.json({ success: true, deletedCount: result.count });
    }

    // Remoção por ID único
    if (!id) return NextResponse.json({ error: 'ID ou dateISO necessário' }, { status: 400 });

    await prisma.availabilitySlot.delete({
      where: { id, userId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir slot:", error);
    return NextResponse.json({ error: 'Erro ao excluir' }, { status: 500 });
  }
}