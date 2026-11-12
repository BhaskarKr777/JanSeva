import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { analyzeProjectDocuments } from '@/lib/ai/provider';
import { logAuditEvent } from '@/lib/workflow';
import { ComplaintStatus, Priority, RelationshipType } from '@prisma/client';

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole([
    'FIELD_OFFICER',
    'REVIEWING_OFFICER',
    'APPROVING_OFFICER',
    'ADMIN',
  ]);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const complaint = await prisma.complaint.findUnique({
    where: { id },
    include: {
      gramPanchayat: { include: { block: { include: { district: true } } } },
      village: true,
      suggestedDept: true,
      assignedDept: true,
      assignedOfficer: { select: { id: true, name: true, nameHi: true, role: true, designation: true } },
      reviewingOfficer: { select: { id: true, name: true, nameHi: true, role: true, designation: true } },
      approvingOfficer: { select: { id: true, name: true, nameHi: true, role: true, designation: true } },
      attachments: true,
      linkedProject: {
        include: {
          department: true,
          documents: { orderBy: { uploadedAt: 'desc' } },
          estimates: true,
          measurements: true,
        },
      },
      inspectionAssignments: {
        include: {
          fieldOfficer: { select: { id: true, name: true, nameHi: true, designation: true } },
          assignedBy: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      inspectionReports: {
        include: {
          fieldOfficer: { select: { id: true, name: true, nameHi: true, designation: true } },
          measurements: { include: { estimateItem: true } },
          evidenceFiles: true,
        },
        orderBy: { createdAt: 'desc' },
      },
      decisions: {
        include: {
          decidedBy: { select: { id: true, name: true, nameHi: true, role: true, designation: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      resolution: {
        include: {
          resolvedBy: { select: { id: true, name: true, role: true } },
        },
      },
      auditEvents: { orderBy: { createdAt: 'desc' } },
      relatedFrom: {
        include: {
          targetComplaint: {
            select: { id: true, referenceNumber: true, category: true, status: true, description: true, lat: true, lng: true, createdAt: true },
          },
        },
      },
      relatedTo: {
        include: {
          sourceComplaint: {
            select: { id: true, referenceNumber: true, category: true, status: true, description: true, lat: true, lng: true, createdAt: true },
          },
        },
      },
    },
  });

  if (!complaint) {
    return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
  }

  let projectAiAnalysis = null;
  if (complaint.linkedProject) {
    projectAiAnalysis = await analyzeProjectDocuments({
      projectTitle: complaint.linkedProject.title,
      sanctionedAmount: complaint.linkedProject.sanctionedAmount,
      expenditureAmount: complaint.linkedProject.expenditureAmount,
      documents: complaint.linkedProject.documents.map((d) => ({
        docType: d.docType,
        title: d.title,
      })),
      estimates: complaint.linkedProject.estimates,
      measurements: complaint.linkedProject.measurements,
    });
  }

  return NextResponse.json({ complaint, projectAiAnalysis });
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['REVIEWING_OFFICER', 'APPROVING_OFFICER', 'ADMIN']);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const body = await req.json();

  const existing = await prisma.complaint.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: 'Complaint not found' }, { status: 404 });
  }

  const updates: Record<string, unknown> = {};
  if (body.assignedDeptId !== undefined) {
    updates.assignedDeptId = body.assignedDeptId || null;
    updates.inManualTriage = false;
    if (existing.status === ComplaintStatus.MANUAL_TRIAGE) {
      updates.status = ComplaintStatus.UNDER_DESK_SCRUTINY;
    }
  }
  if (body.linkedProjectId !== undefined) {
    updates.linkedProjectId = body.linkedProjectId || null;
  }
  if (body.priority) {
    updates.priority = body.priority as Priority;
  }

  const updated = await prisma.complaint.update({
    where: { id },
    data: updates,
  });

  if (body.assignedDeptId && body.assignedDeptId !== existing.assignedDeptId) {
    await prisma.departmentAssignment.create({
      data: {
        complaintId: id,
        departmentId: body.assignedDeptId,
        assignedById: auth.user.userId,
        reason: body.reason || 'Assigned by reviewing officer',
        isAiSuggested: false,
      },
    });
    await logAuditEvent({
      complaintId: id,
      userId: auth.user.userId,
      actorName: auth.user.name,
      action: 'DEPARTMENT_ASSIGNED',
      previousStatus: existing.status,
      newStatus: updated.status,
      reason: body.reason || 'Manual department assignment',
    });
  }

  if (body.linkedProjectId !== undefined && body.linkedProjectId !== existing.linkedProjectId) {
    await logAuditEvent({
      complaintId: id,
      userId: auth.user.userId,
      actorName: auth.user.name,
      action: body.linkedProjectId ? 'PROJECT_LINKED' : 'PROJECT_UNLINKED',
      reason: body.reason || 'Updated linked government project',
    });
  }

  if (body.linkRelatedComplaintId) {
    await prisma.complaintRelationship
      .create({
        data: {
          sourceComplaintId: id,
          targetComplaintId: body.linkRelatedComplaintId,
          relationshipType: RelationshipType.RELATED_LOCATION,
          linkedBy: auth.user.name,
          notes: body.reason || 'Linked by officer for common investigation',
        },
      })
      .catch(() => null);
    await logAuditEvent({
      complaintId: id,
      userId: auth.user.userId,
      actorName: auth.user.name,
      action: 'RELATED_COMPLAINT_LINKED',
      reason: `Linked with ${body.linkRelatedComplaintId}`,
    });
  }

  return NextResponse.json({ complaint: updated });
}

