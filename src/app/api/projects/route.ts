import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { projectCode: 'asc' },
      include: {
        department: { select: { id: true, name: true, nameHi: true, code: true } },
        gramPanchayat: { select: { id: true, name: true, nameHi: true } },
        _count: { select: { documents: true, complaints: true } },
      },
    });
    return NextResponse.json({ projects });
  } catch (err) {
    console.error('GET /api/projects error:', err);
    return NextResponse.json({ error: 'Failed to load projects' }, { status: 500 });
  }
}

