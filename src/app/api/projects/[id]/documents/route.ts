import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireRole } from '@/lib/auth';
import { DocumentType } from '@prisma/client';
import { logAuditEvent } from '@/lib/workflow';

const addDocSchema = z.object({
  docType: z.nativeEnum(DocumentType),
  title: z.string().min(2),
  fileUrl: z.string().min(1),
  mimeType: z.string().default('application/pdf'),
  complaintId: z.string().optional(),
});

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireRole(['REVIEWING_OFFICER', 'APPROVING_OFFICER', 'FIELD_OFFICER', 'ADMIN']);
  if (auth.error) return auth.error;

  const { id } = await context.params;
  const body = await req.json();
  const parsed = addDocSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid document payload' }, { status: 400 });
  }

  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  const doc = await prisma.projectDocument.create({
    data: {
      projectId: id,
      docType: parsed.data.docType,
      title: parsed.data.title,
      fileUrl: parsed.data.fileUrl,
      mimeType: parsed.data.mimeType,
      uploadedBy: auth.user.name,
      extractedJson: {
        extractedWorkName: project.title,
        sanctionedAmountINR: project.sanctionedAmount,
        ocrMode: process.env.AI_PROVIDER || 'demo',
      },
    },
  });

  if (parsed.data.complaintId) {
    await logAuditEvent({
      complaintId: parsed.data.complaintId,
      userId: auth.user.userId,
      actorName: auth.user.name,
      action: 'PROJECT_DOCUMENT_UPLOADED',
      reason: `Uploaded ${parsed.data.docType}: ${parsed.data.title}`,
    });
  }

  return NextResponse.json({ document: doc }, { status: 201 });
}

