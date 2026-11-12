import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { isValidTransition, logAuditEvent, createNotification } from '@/lib/workflow';
import { ComplaintStatus, DecisionType } from '@prisma/client';

const decisionSchema = z.object({
  decisionType: z.nativeEnum(DecisionType),
  reason: z.string().min(5, 'A mandatory administrative reason is required'),
  publicSafeSummary: z.string().optional(),
  publicSafeSummaryHi: z.string().optional(),
});

const DECISION_TO_STATUS: Record<DecisionType, ComplaintStatus> = {
  APPROVE_ACTION: ComplaintStatus.ACTION_APPROVED,
  APPROVE_COMPLETION: ComplaintStatus.RESOLVED,
  RETURN_FOR_EVIDENCE: ComplaintStatus.RETURNED_FOR_EVIDENCE,
  REQUEST_REINSPECTION: ComplaintStatus.REINSPECTION_REQUESTED,
  REFER_FOR_INQUIRY: ComplaintStatus.REFERRED_FOR_INQUIRY,
  REJECT_COMPLAINT: ComplaintStatus.REJECTED,
  RECORD_RESOLUTION: ComplaintStatus.RESOLVED,
};

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['REVIEWING_OFFICER', 'APPROVING_OFFICER', 'ADMIN']);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const body = await req.json();
  const parsed = decisionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid decision payload' },
      { status: 400 }
    );
  }

  const { decisionType, reason, publicSafeSummary, publicSafeSummaryHi } = parsed.data;

  // Enforce Approving Officer authority for final approvals/resolutions/inquiries
  if (
    ['APPROVE_COMPLETION', 'RECORD_RESOLUTION', 'REFER_FOR_INQUIRY'].includes(decisionType) &&
    auth.user.role === 'REVIEWING_OFFICER'
  ) {
    return NextResponse.json(
      { error: 'Only an Approving Officer or Admin can record final resolution or refer for inquiry.' },
      { status: 403 }
    );
  }

  const complaint = await prisma.complaint.findUnique({ where: { id } });
  if (!complaint) {
    return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
  }

  const nextStatus = DECISION_TO_STATUS[decisionType];
  if (!isValidTransition(complaint.status, nextStatus)) {
    return NextResponse.json(
      { error: `Invalid workflow transition from ${complaint.status} to ${nextStatus}` },
      { status: 400 }
    );
  }

  const decision = await prisma.decision.create({
    data: {
      complaintId: id,
      decidedById: auth.user.userId,
      decisionType,
      reason,
    },
  });

  await prisma.complaint.update({
    where: { id },
    data: { status: nextStatus },
  });

  if (nextStatus === ComplaintStatus.RESOLVED) {
    await prisma.resolutionRecord.upsert({
      where: { complaintId: id },
      update: {
        resolvedById: auth.user.userId,
        actionTaken: reason,
        publicSafeSummary:
          publicSafeSummary ||
          'After field verification and administrative review, necessary departmental action has been completed and the case is resolved.',
        publicSafeSummaryHi:
          publicSafeSummaryHi ||
          'स्थल सत्यापन एवं अधिकारी समीक्षा के उपरांत आवश्यक विभागीय कार्रवाई पूर्ण कर शिकायत का निस्तारण कर दिया गया है।',
      },
      create: {
        complaintId: id,
        resolvedById: auth.user.userId,
        actionTaken: reason,
        publicSafeSummary:
          publicSafeSummary ||
          'After field verification and administrative review, necessary departmental action has been completed and the case is resolved.',
        publicSafeSummaryHi:
          publicSafeSummaryHi ||
          'स्थल सत्यापन एवं अधिकारी समीक्षा के उपरांत आवश्यक विभागीय कार्रवाई पूर्ण कर शिकायत का निस्तारण कर दिया गया है।',
      },
    });
  }

  await logAuditEvent({
    complaintId: id,
    userId: auth.user.userId,
    actorName: auth.user.name,
    action: `DECISION_${decisionType}`,
    previousStatus: complaint.status,
    newStatus: nextStatus,
    reason,
  });

  await createNotification({
    complaintId: id,
    title: `Case Update (${complaint.referenceNumber})`,
    titleHi: `शिकायत अद्यतन (${complaint.referenceNumber})`,
    message:
      nextStatus === ComplaintStatus.RESOLVED
        ? 'Your complaint has been resolved. Check the public tracking page for summary.'
        : `Status updated to ${nextStatus.replace(/_/g, ' ')}.`,
    messageHi:
      nextStatus === ComplaintStatus.RESOLVED
        ? 'आपकी शिकायत का निस्तारण कर दिया गया है। विवरण ट्रैकिंग पृष्ठ पर देखें।'
        : `शिकायत की स्थिति अद्यतन हुई: ${nextStatus.replace(/_/g, ' ')}`,
    channel: 'DEMO_SMS',
    isPublic: true,
  });

  return NextResponse.json({ decision, status: nextStatus }, { status: 201 });
}

