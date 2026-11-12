import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { mapStatusToPublicStep } from '@/lib/i18n';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ ref: string }> }
) {
  const { ref } = await context.params;
  const cleanRef = ref.trim().toUpperCase();

  const complaint = await prisma.complaint.findUnique({
    where: { referenceNumber: cleanRef },
    select: {
      referenceNumber: true,
      category: true,
      status: true,
      priority: true,
      createdAt: true,
      updatedAt: true,
      gramPanchayat: { select: { name: true, nameHi: true } },
      assignedDept: { select: { name: true, nameHi: true } },
      resolution: {
        select: {
          publicSafeSummary: true,
          publicSafeSummaryHi: true,
          resolvedAt: true,
        },
      },
      notifications: {
        where: { isPublic: true },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          titleHi: true,
          message: true,
          messageHi: true,
          createdAt: true,
        },
      },
    },
  });

  if (!complaint) {
    return NextResponse.json({ error: 'Reference number not found' }, { status: 404 });
  }

  return NextResponse.json({
    tracking: {
      ...complaint,
      timelineStep: mapStatusToPublicStep(complaint.status),
    },
  });
}

