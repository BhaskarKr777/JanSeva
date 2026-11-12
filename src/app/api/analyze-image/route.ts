import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { analyzeImageAuthenticity } from '@/lib/ai/provider';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  // Require authenticated officer (field officer or above)
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (user.role === 'CITIZEN') {
    return NextResponse.json({ error: 'Officers only' }, { status: 403 });
  }

  const body = await req.json();
  const fileUrl: string = body.fileUrl;
  const context: 'citizen_complaint' | 'field_inspection' | 'project_document' =
    body.context || 'field_inspection';
  const evidenceFileId: string | undefined = body.evidenceFileId;

  if (!fileUrl) {
    return NextResponse.json({ error: 'fileUrl is required' }, { status: 400 });
  }

  // Run analysis
  const result = await analyzeImageAuthenticity(fileUrl, context);

  // Optionally persist the result to EvidenceFile if ID provided
  if (evidenceFileId) {
    try {
      await prisma.evidenceFile.update({
        where: { id: evidenceFileId },
        data: { imageAnalysisJson: result as object },
      });
    } catch (e) {
      console.warn('[analyze-image] Could not persist to EvidenceFile:', e);
    }
  }

  return NextResponse.json(result);
}
