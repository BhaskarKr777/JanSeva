import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { analyzeFieldInspection } from '@/lib/ai/provider';
import { isValidTransition, logAuditEvent, createNotification } from '@/lib/workflow';
import { ComplaintStatus } from '@prisma/client';

const scheduleSchema = z.object({
  fieldOfficerId: z.string().min(1),
  scheduledDate: z.string().min(1),
  instructions: z.string().optional(),
});

const submitReportSchema = z.object({
  assignmentId: z.string().optional(),
  gpsLat: z.number().optional(),
  gpsLng: z.number().optional(),
  gpsAccuracy: z.number().optional(),
  observations: z.string().min(3),
  voiceNoteUrl: z.string().optional(),
  voiceTranscript: z.string().optional(),
  checklist: z.array(z.object({ item: z.string(), checked: z.boolean() })).default([]),
  measurements: z
    .array(
      z.object({
        estimateItemId: z.string().optional(),
        itemName: z.string(),
        unit: z.string(),
        measuredQty: z.number(),
        notes: z.string().optional(),
      })
    )
    .default([]),
  evidenceFiles: z
    .array(
      z.object({
        fileName: z.string(),
        fileUrl: z.string(),
        mimeType: z.string(),
        caption: z.string().optional(),
        gpsLat: z.number().optional(),
        gpsLng: z.number().optional(),
      })
    )
    .default([]),
  isDraft: z.boolean().default(false),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['REVIEWING_OFFICER', 'APPROVING_OFFICER', 'ADMIN']);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const body = await req.json();
  const parsed = scheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid inspection schedule payload' }, { status: 400 });
  }

  const complaint = await prisma.complaint.findUnique({ where: { id } });
  if (!complaint) {
    return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
  }

  const targetStatus = ComplaintStatus.INSPECTION_SCHEDULED;
  if (!isValidTransition(complaint.status, targetStatus)) {
    return NextResponse.json(
      { error: `Cannot schedule inspection from status ${complaint.status}` },
      { status: 400 }
    );
  }

  const assignment = await prisma.inspectionAssignment.create({
    data: {
      complaintId: id,
      fieldOfficerId: parsed.data.fieldOfficerId,
      assignedById: auth.user.userId,
      scheduledDate: new Date(parsed.data.scheduledDate),
      instructions: parsed.data.instructions || 'Verify site location, measurements, and capture GPS photos.',
      status: 'PENDING',
    },
    include: { fieldOfficer: { select: { name: true } } },
  });

  await prisma.complaint.update({
    where: { id },
    data: { status: targetStatus },
  });

  await logAuditEvent({
    complaintId: id,
    userId: auth.user.userId,
    actorName: auth.user.name,
    action: 'INSPECTION_SCHEDULED',
    previousStatus: complaint.status,
    newStatus: targetStatus,
    reason: `Assigned to ${assignment.fieldOfficer.name}`,
  });

  await createNotification({
    userId: parsed.data.fieldOfficerId,
    complaintId: id,
    title: `New Field Inspection Assigned: ${complaint.referenceNumber}`,
    titleHi: `नया स्थल निरीक्षण सौंपा गया: ${complaint.referenceNumber}`,
    message: parsed.data.instructions || 'Please complete site verification.',
    isPublic: false,
  });

  await createNotification({
    complaintId: id,
    title: `Field Inspection Scheduled (${complaint.referenceNumber})`,
    titleHi: `स्थल निरीक्षण निर्धारित (${complaint.referenceNumber})`,
    message: 'A field officer has been assigned to inspect the reported site.',
    messageHi: 'शिकायत स्थल के निरीक्षण हेतु क्षेत्रीय अधिकारी को नियुक्त किया गया है।',
    isPublic: true,
  });

  return NextResponse.json({ assignment }, { status: 201 });
}

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['FIELD_OFFICER', 'ADMIN']);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const body = await req.json();
  const parsed = submitReportSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Invalid inspection report' },
      { status: 400 }
    );
  }

  const complaint = await prisma.complaint.findUnique({
    where: { id },
    include: {
      linkedProject: {
        include: { estimates: true, measurements: true, documents: true },
      },
    },
  });

  if (!complaint) {
    return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
  }

  const data = parsed.data;
  const estMap = new Map(
    (complaint.linkedProject?.estimates || []).map((e) => [e.id, e])
  );
  const mbMap = new Map(
    (complaint.linkedProject?.measurements || []).map((m) => [m.itemName.toLowerCase(), m])
  );

  const aiField = await analyzeFieldInspection({
    observations: data.observations,
    voiceNoteTranscript: data.voiceTranscript,
    checklist: data.checklist,
    measurements: data.measurements.map((m) => {
      const est = m.estimateItemId ? estMap.get(m.estimateItemId) : undefined;
      const mb = mbMap.get(m.itemName.toLowerCase());
      return {
        itemName: m.itemName,
        unit: m.unit,
        measuredQty: m.measuredQty,
        sanctionedQty: est?.sanctionedQty,
        recordedQty: mb?.recordedQty,
      };
    }),
    photoCount: data.evidenceFiles.length,
    priorPhotoCount:
      complaint.linkedProject?.documents.filter((d) =>
        ['BEFORE_PHOTO', 'DURING_PHOTO', 'AFTER_PHOTO'].includes(d.docType)
      ).length || 0,
  });

  const report = await prisma.inspectionReport.create({
    data: {
      complaintId: id,
      assignmentId: data.assignmentId || null,
      fieldOfficerId: auth.user.userId,
      gpsLat: data.gpsLat ?? null,
      gpsLng: data.gpsLng ?? null,
      gpsAccuracy: data.gpsAccuracy ?? null,
      capturedAt: new Date(),
      observations: data.observations,
      observationsEn: aiField.structuredSummaryEn,
      voiceNoteUrl: data.voiceNoteUrl || null,
      voiceTranscript: data.voiceTranscript || null,
      checklistJson: data.checklist,
      aiSummary: aiField.structuredSummaryEn,
      aiInconsistencies: aiField.measurementDiscrepancies.join(' | ') || null,
      isDraft: data.isDraft,
      submittedAt: data.isDraft ? null : new Date(),
      measurements: {
        create: data.measurements.map((m) => ({
          estimateItemId: m.estimateItemId || null,
          itemName: m.itemName,
          unit: m.unit,
          measuredQty: m.measuredQty,
          notes: m.notes || null,
        })),
      },
      evidenceFiles: {
        create: data.evidenceFiles.map((f) => ({
          fileName: f.fileName,
          fileUrl: f.fileUrl,
          mimeType: f.mimeType,
          caption: f.caption || null,
          gpsLat: f.gpsLat ?? data.gpsLat ?? null,
          gpsLng: f.gpsLng ?? data.gpsLng ?? null,
        })),
      },
    },
    include: { measurements: true, evidenceFiles: true },
  });

  if (!data.isDraft) {
    if (data.assignmentId) {
      await prisma.inspectionAssignment.update({
        where: { id: data.assignmentId },
        data: { status: 'COMPLETED' },
      });
    }

    const nextStatus =
      aiField.measurementDiscrepancies.length > 0
        ? ComplaintStatus.TECHNICAL_REVIEW
        : ComplaintStatus.INSPECTION_SUBMITTED;

    await prisma.complaint.update({
      where: { id },
      data: { status: nextStatus },
    });

    await logAuditEvent({
      complaintId: id,
      userId: auth.user.userId,
      actorName: auth.user.name,
      action: 'FIELD_INSPECTION_SUBMITTED',
      previousStatus: complaint.status,
      newStatus: nextStatus,
      reason:
        aiField.measurementDiscrepancies.length > 0
          ? 'Submitted with measurement variances flagged for technical review'
          : 'Field inspection report submitted',
    });

    await createNotification({
      complaintId: id,
      title: `Field Inspection Completed (${complaint.referenceNumber})`,
      titleHi: `स्थल निरीक्षण पूर्ण (${complaint.referenceNumber})`,
      message: 'Ground verification report has been submitted for officer review.',
      messageHi: 'स्थल सत्यापन रिपोर्ट अधिकारी समीक्षा हेतु प्रस्तुत कर दी गई है।',
      isPublic: true,
    });
  }

  return NextResponse.json({ report, aiField }, { status: 201 });
}

