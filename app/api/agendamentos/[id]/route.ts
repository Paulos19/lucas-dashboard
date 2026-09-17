import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';

// PATCH: Atualiza status, dataHora ou resumo do agendamento
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { id } = await params;
    const body = await request.json();
    const { status, dataHoraISO, resumo, tipo } = body;

    // Localiza agendamento do usuário
    const existing = await prisma.agendamento.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (resumo !== undefined) updateData.resumo = resumo;
    if (tipo) updateData.tipo = tipo;

    let newDate: Date | null = null;
    if (dataHoraISO) {
      newDate = new Date(dataHoraISO);
      if (!isNaN(newDate.getTime())) {
        updateData.dataHora = newDate;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Se status foi para CANCELADO, libera o slot
      if (status === 'CANCELADO') {
        await tx.availabilitySlot.updateMany({
          where: {
            userId,
            leadId: existing.leadId,
            isBooked: true
          },
          data: {
            isBooked: false,
            leadId: null
          }
        });
      }

      // Se reagendou nova data/hora, aloca novo slot
      if (newDate) {
        // Libera slot anterior
        await tx.availabilitySlot.updateMany({
          where: {
            userId,
            leadId: existing.leadId,
            isBooked: true
          },
          data: {
            isBooked: false,
            leadId: null
          }
        });

        // Ocupa ou cria novo slot
        const slot = await tx.availabilitySlot.findFirst({
          where: {
            userId,
            startTime: {
              gte: new Date(newDate.getTime() - 60000),
              lte: new Date(newDate.getTime() + 60000)
            }
          }
        });

        if (slot) {
          await tx.availabilitySlot.update({
            where: { id: slot.id },
            data: { isBooked: true, leadId: existing.leadId }
          });
        } else {
          await tx.availabilitySlot.create({
            data: {
              userId,
              startTime: newDate,
              endTime: new Date(newDate.getTime() + 60 * 60 * 1000),
              isBooked: true,
              leadId: existing.leadId
            }
          });
        }
      }

      return await tx.agendamento.update({
        where: { id },
        data: updateData,
        include: { lead: true }
      });
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Erro ao atualizar agendamento:", error);
    return NextResponse.json({ error: 'Erro ao atualizar agendamento' }, { status: 500 });
  }
}

// DELETE: Exclui/cancela agendamento e libera slot
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const { id } = await params;

    const existing = await prisma.agendamento.findFirst({
      where: { id, userId }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      // Libera slot associado ao lead
      await tx.availabilitySlot.updateMany({
        where: {
          userId,
          leadId: existing.leadId,
          isBooked: true
        },
        data: {
          isBooked: false,
          leadId: null
        }
      });

      // Exclui agendamento
      await tx.agendamento.delete({
        where: { id }
      });
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Erro ao excluir agendamento:", error);
    return NextResponse.json({ error: 'Erro ao excluir agendamento' }, { status: 500 });
  }
}
