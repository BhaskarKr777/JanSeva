import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireRole, hashPassword } from '@/lib/auth';
import { Role, Priority } from '@prisma/client';

export async function GET() {
  const auth = await requireRole(['ADMIN', 'REVIEWING_OFFICER', 'APPROVING_OFFICER']);
  if (auth.error) return auth.error;

  const [departments, blocks, gramPanchayats, rules, categories, users, statsByStatus] =
    await Promise.all([
      prisma.department.findMany({ orderBy: { code: 'asc' } }),
      prisma.block.findMany({ include: { district: true }, orderBy: { name: 'asc' } }),
      prisma.gramPanchayat.findMany({ include: { block: true }, orderBy: { name: 'asc' } }),
      prisma.routingRule.findMany({
        include: { department: true, block: true },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.issueCategoryConfig.findMany({ orderBy: { sortOrder: 'asc' } }),
      prisma.user.findMany({
        select: {
          id: true,
          name: true,
          nameHi: true,
          email: true,
          role: true,
          designation: true,
          departmentId: true,
          department: { select: { name: true, code: true } },
          jurisdiction: true,
          active: true,
        },
        orderBy: { role: 'asc' },
      }),
      prisma.complaint.groupBy({
        by: ['status'],
        _count: { status: true },
      }),
    ]);

  return NextResponse.json({
    departments,
    blocks,
    gramPanchayats,
    rules,
    categories,
    users,
    statsByStatus,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(['ADMIN']);
  if (auth.error) return auth.error;

  const body = await req.json();
  const action = body.action as string;

  if (action === 'CREATE_RULE') {
    const rule = await prisma.routingRule.create({
      data: {
        name: body.name,
        categoryKey: body.categoryKey,
        blockId: body.blockId || null,
        departmentId: body.departmentId,
        defaultPriority: (body.defaultPriority as Priority) || Priority.MEDIUM,
        slaDays: Number(body.slaDays) || 7,
      },
      include: { department: true, block: true },
    });
    return NextResponse.json({ rule }, { status: 201 });
  }

  if (action === 'TOGGLE_RULE') {
    const rule = await prisma.routingRule.update({
      where: { id: body.id },
      data: { active: Boolean(body.active) },
    });
    return NextResponse.json({ rule });
  }

  if (action === 'CREATE_DEPARTMENT') {
    const department = await prisma.department.create({
      data: {
        name: body.name,
        nameHi: body.nameHi || body.name,
        code: String(body.code).toUpperCase().trim(),
        description: body.description || null,
      },
    });
    return NextResponse.json({ department }, { status: 201 });
  }

  if (action === 'CREATE_USER') {
    const passwordHash = await hashPassword(body.password || 'Demo@123');
    const user = await prisma.user.create({
      data: {
        name: body.name,
        nameHi: body.nameHi || null,
        email: String(body.email).toLowerCase().trim(),
        passwordHash,
        role: body.role as Role,
        designation: body.designation || null,
        departmentId: body.departmentId || null,
        jurisdiction: body.jurisdiction || null,
      },
    });
    return NextResponse.json({ user: { id: user.id, email: user.email, role: user.role } }, { status: 201 });
  }

  if (action === 'TOGGLE_CATEGORY') {
    const category = await prisma.issueCategoryConfig.update({
      where: { id: body.id },
      data: { active: Boolean(body.active) },
    });
    return NextResponse.json({ category });
  }

  return NextResponse.json({ error: 'Unknown admin action' }, { status: 400 });
}

