import { ComplaintStatus } from '@prisma/client';
import { prisma } from './prisma';

export const ALLOWED_TRANSITIONS: Record<ComplaintStatus, ComplaintStatus[]> = {
  SUBMITTED: ['MANUAL_TRIAGE', 'UNDER_DESK_SCRUTINY', 'REJECTED'],
  MANUAL_TRIAGE: ['UNDER_DESK_SCRUTINY', 'INSPECTION_SCHEDULED', 'REJECTED'],
  UNDER_DESK_SCRUTINY: [
    'INSPECTION_SCHEDULED',
    'RETURNED_FOR_EVIDENCE',
    'TECHNICAL_REVIEW',
    'ACTION_APPROVED',
    'REJECTED',
  ],
  INSPECTION_SCHEDULED: [
    'INSPECTION_SUBMITTED',
    'RETURNED_FOR_EVIDENCE',
    'REINSPECTION_REQUESTED',
  ],
  INSPECTION_SUBMITTED: [
    'TECHNICAL_REVIEW',
    'RETURNED_FOR_EVIDENCE',
    'REINSPECTION_REQUESTED',
    'ACTION_APPROVED',
    'REFERRED_FOR_INQUIRY',
    'REJECTED',
  ],
  RETURNED_FOR_EVIDENCE: [
    'UNDER_DESK_SCRUTINY',
    'INSPECTION_SCHEDULED',
    'INSPECTION_SUBMITTED',
    'TECHNICAL_REVIEW',
  ],
  REINSPECTION_REQUESTED: ['INSPECTION_SCHEDULED', 'INSPECTION_SUBMITTED'],
  TECHNICAL_REVIEW: [
    'ACTION_APPROVED',
    'RETURNED_FOR_EVIDENCE',
    'REINSPECTION_REQUESTED',
    'REFERRED_FOR_INQUIRY',
    'RESOLVED',
    'REJECTED',
  ],
  REFERRED_FOR_INQUIRY: ['TECHNICAL_REVIEW', 'ACTION_APPROVED', 'RESOLVED', 'REJECTED'],
  ACTION_APPROVED: ['RESOLVED', 'REINSPECTION_REQUESTED', 'REFERRED_FOR_INQUIRY'],
  RESOLVED: [],
  REJECTED: [],
};

export function isValidTransition(
  from: ComplaintStatus,
  to: ComplaintStatus
): boolean {
  if (from === to) return true;
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export async function logAuditEvent(params: {
  complaintId: string;
  userId?: string | null;
  actorName: string;
  action: string;
  previousStatus?: ComplaintStatus | null;
  newStatus?: ComplaintStatus | null;
  reason?: string | null;
  metadataJson?: Record<string, unknown>;
}) {
  return prisma.auditEvent.create({
    data: {
      complaintId: params.complaintId,
      userId: params.userId ?? null,
      actorName: params.actorName,
      action: params.action,
      previousStatus: params.previousStatus ?? null,
      newStatus: params.newStatus ?? null,
      reason: params.reason ?? null,
      metadataJson: params.metadataJson ? JSON.parse(JSON.stringify(params.metadataJson)) : undefined,
    },
  });
}

export async function createNotification(params: {
  userId?: string | null;
  complaintId?: string | null;
  title: string;
  titleHi?: string;
  message: string;
  messageHi?: string;
  channel?: 'IN_APP' | 'DEMO_SMS';
  isPublic?: boolean;
}) {
  return prisma.notification.create({
    data: {
      userId: params.userId ?? null,
      complaintId: params.complaintId ?? null,
      title: params.title,
      titleHi: params.titleHi,
      message: params.message,
      messageHi: params.messageHi,
      channel: params.channel ?? 'IN_APP',
      isPublic: params.isPublic ?? false,
    },
  });
}

