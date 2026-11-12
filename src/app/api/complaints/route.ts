import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { runIntakeAndRouting } from '@/lib/routing';
import { logAuditEvent, createNotification } from '@/lib/workflow';
import { ComplaintStatus, Priority, RelationshipType } from '@prisma/client';

const createComplaintSchema = z.object({
  category: z.string().min(2),
  description: z.string().min(5, 'Please provide a brief description of the issue'),
  language: z.enum(['hi', 'en']).default('hi'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  locationDescription: z.string().optional(),
  gramPanchayatId: z.string().optional(),
  citizenName: z.string().min(2, 'Please enter your name'),
  citizenPhone: z.string().min(6, 'Please enter a valid contact number'),
  citizenEmail: z.string().email().optional().or(z.literal('')),
  attachments: z
    .array(
      z.object({
        fileType: z.enum(['PHOTO', 'VOICE_NOTE']),
        fileName: z.string(),
        fileUrl: z.string(),
        mimeType: z.string(),
        caption: z.string().optional(),
      })
    )
    .optional(),
});

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionUser();
    const isOfficer =
      session &&
      ['FIELD_OFFICER', 'REVIEWING_OFFICER', 'APPROVING_OFFICER', 'ADMIN'].includes(session.role);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const category = searchParams.get('category');
    const gramPanchayatId = searchParams.get('gramPanchayatId');
    const search = searchParams.get('search')?.trim();
    const assignedToMe = searchParams.get('assignedToMe') === 'true';

    const where: Record<string, unknown> = {};
    if (status && status !== 'ALL') where.status = status as ComplaintStatus;
    if (priority && priority !== 'ALL') where.priority = priority as Priority;
    if (category && category !== 'ALL') where.category = category;
    if (gramPanchayatId && gramPanchayatId !== 'ALL') where.gramPanchayatId = gramPanchayatId;

    if (assignedToMe && session?.role === 'FIELD_OFFICER') {
      where.inspectionAssignments = { some: { fieldOfficerId: session.userId } };
    }

    if (search) {
      where.OR = [
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { descriptionEn: { contains: search, mode: 'insensitive' } },
        { locationDescription: { contains: search, mode: 'insensitive' } },
      ];
    }

    const complaints = await prisma.complaint.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        gramPanchayat: { select: { id: true, name: true, nameHi: true } },
        village: { select: { id: true, name: true, nameHi: true } },
        assignedDept: { select: { id: true, name: true, nameHi: true, code: true } },
        assignedOfficer: { select: { id: true, name: true, nameHi: true, role: true } },
        linkedProject: { select: { id: true, projectCode: true, title: true, titleHi: true } },
        _count: { select: { relatedFrom: true, relatedTo: true, inspectionAssignments: true } },
      },
    });

    // Redact citizen PII on public map / unauthenticated listing
    const safeComplaints = complaints.map((c) => ({
      id: c.id,
      referenceNumber: c.referenceNumber,
      category: c.category,
      status: c.status,
      priority: c.priority,
      lat: c.lat,
      lng: c.lng,
      locationDescription: c.locationDescription,
      gramPanchayat: c.gramPanchayat,
      village: c.village,
      assignedDept: c.assignedDept,
      linkedProject: c.linkedProject,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      inManualTriage: c.inManualTriage,
      relatedCount: c._count.relatedFrom + c._count.relatedTo,
      ...(isOfficer
        ? {
            description: c.description,
            descriptionEn: c.descriptionEn,
            citizenName: c.citizenName,
            citizenPhone: c.citizenPhone,
            assignedOfficer: c.assignedOfficer,
            aiSummary: c.aiSummary,
            aiExplanation: c.aiExplanation,
          }
        : {
            publicSummary: c.descriptionEn || c.description.slice(0, 120),
          }),
    }));

    return NextResponse.json({ complaints: safeComplaints });
  } catch (err) {
    console.error('GET /api/complaints error:', err);
    return NextResponse.json({ error: 'Failed to load complaints' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = createComplaintSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Validation failed' },
        { status: 400 }
      );
    }

    const session = await getSessionUser();
    const data = parsed.data;

    // Generate sequential JSV-2026-XXXX reference number
    const count = await prisma.complaint.count();
    const refNumber = `JSV-2026-${String(count + 1).padStart(4, '0')}`;

    const routing = await runIntakeAndRouting({
      category: data.category,
      description: data.description,
      lat: data.lat,
      lng: data.lng,
      locationDescription: data.locationDescription,
      gramPanchayatId: data.gramPanchayatId,
    });

    const complaint = await prisma.complaint.create({
      data: {
        referenceNumber: refNumber,
        category: data.category,
        status: routing.initialStatus,
        priority: routing.priority,
        description: data.description,
        descriptionEn: routing.aiAnalysis.structuredEnglishSummary,
        language: data.language,
        lat: data.lat,
        lng: data.lng,
        locationDescription: data.locationDescription || routing.aiAnalysis.extractedDetails.locationClues,
        gramPanchayatId: routing.gramPanchayatId,
        villageId: routing.villageId,
        citizenName: data.citizenName,
        citizenPhone: data.citizenPhone,
        citizenEmail: data.citizenEmail || null,
        inManualTriage: routing.inManualTriage,
        aiSummary: routing.aiAnalysis.structuredEnglishSummary,
        aiExplanation: `${routing.aiAnalysis.priorityExplanation} | ${routing.routingReason}`,
        aiConfidence: routing.aiAnalysis.confidence,
        aiRawJson: JSON.parse(JSON.stringify(routing.aiAnalysis)),
        linkedProjectId: routing.linkedProjectId,
        suggestedDeptId: routing.suggestedDeptId,
        assignedDeptId: routing.assignedDeptId,
        assignedOfficerId: routing.assignedOfficerId,
        reviewingOfficerId: routing.reviewingOfficerId,
        approvingOfficerId: routing.approvingOfficerId,
        attachments: data.attachments?.length
          ? {
              create: data.attachments.map((a) => ({
                fileType: a.fileType,
                fileName: a.fileName,
                fileUrl: a.fileUrl,
                mimeType: a.mimeType,
                caption: a.caption,
              })),
            }
          : undefined,
      },
      include: {
        gramPanchayat: true,
        assignedDept: true,
        linkedProject: true,
      },
    });

    // Link potential duplicates without deleting or merging
    if (routing.aiAnalysis.potentialDuplicateIds.length > 0) {
      for (const dupId of routing.aiAnalysis.potentialDuplicateIds) {
        await prisma.complaintRelationship
          .create({
            data: {
              sourceComplaintId: dupId,
              targetComplaintId: complaint.id,
              relationshipType: RelationshipType.RELATED_LOCATION,
              similarityScore: 0.85,
              linkedBy: 'AI Intake Cluster',
              notes: routing.aiAnalysis.duplicateExplanation || 'Nearby related complaint',
            },
          })
          .catch(() => null);
      }
    }

    if (routing.assignedDeptId) {
      await prisma.departmentAssignment.create({
        data: {
          complaintId: complaint.id,
          departmentId: routing.assignedDeptId,
          reason: routing.routingReason,
          isAiSuggested: true,
        },
      });
    }

    await logAuditEvent({
      complaintId: complaint.id,
      userId: session?.userId || null,
      actorName: data.citizenName,
      action: 'COMPLAINT_SUBMITTED',
      newStatus: ComplaintStatus.SUBMITTED,
      metadataJson: { referenceNumber: refNumber, category: data.category },
    });

    await logAuditEvent({
      complaintId: complaint.id,
      actorName: 'JanSeva Routing Engine',
      action: routing.inManualTriage ? 'PLACED_IN_MANUAL_TRIAGE' : 'DEPARTMENT_SUGGESTED_AND_ASSIGNED',
      previousStatus: ComplaintStatus.SUBMITTED,
      newStatus: routing.initialStatus,
      reason: routing.routingReason,
    });

    await createNotification({
      complaintId: complaint.id,
      title: `Complaint ${refNumber} Received`,
      titleHi: `शिकायत ${refNumber} प्राप्त हुई`,
      message: `Your report has been registered under ${complaint.assignedDept?.name || 'Manual Triage Queue'}.`,
      messageHi: `आपकी शिकायत ${complaint.assignedDept?.nameHi || 'समीक्षा कतार'} में दर्ज कर ली गई है।`,
      channel: 'DEMO_SMS',
      isPublic: true,
    });

    return NextResponse.json(
      {
        complaint: {
          id: complaint.id,
          referenceNumber: complaint.referenceNumber,
          status: complaint.status,
          priority: complaint.priority,
          assignedDept: complaint.assignedDept,
          linkedProject: complaint.linkedProject,
          aiAnalysis: routing.aiAnalysis,
        },
      },
      { status: 201 }
    );
  } catch (err) {
    console.error('POST /api/complaints error:', err);
    return NextResponse.json({ error: 'Failed to submit complaint' }, { status: 500 });
  }
}

