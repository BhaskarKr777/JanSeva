import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getSessionUser();
  if (!session) {
    return NextResponse.json({ user: null });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      name: true,
      nameHi: true,
      email: true,
      role: true,
      designation: true,
      designationHi: true,
      departmentId: true,
      department: { select: { id: true, name: true, nameHi: true, code: true } },
    },
  });
  return NextResponse.json({ user });
}

