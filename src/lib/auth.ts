import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { Role } from '@prisma/client';
import { prisma } from './prisma';

const SESSION_COOKIE = 'janseva_session';
const SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'janseva-dev-secret-change-in-production-32chars'
);

export interface SessionPayload {
  userId: string;
  email: string;
  name: string;
  role: Role;
  departmentId: string | null;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function signSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(SECRET);
}

export async function verifySessionToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET);
    if (!payload.userId || !payload.role) return null;
    return {
      userId: String(payload.userId),
      email: String(payload.email || ''),
      name: String(payload.name || ''),
      role: payload.role as Role,
      departmentId: payload.departmentId ? String(payload.departmentId) : null,
    };
  } catch {
    return null;
  }
}

export async function getSessionUser(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = await verifySessionToken(token);
  if (!payload) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, active: true, role: true, name: true, email: true, departmentId: true },
  });
  if (!dbUser || !dbUser.active) return null;

  return {
    userId: dbUser.id,
    email: dbUser.email,
    name: dbUser.name,
    role: dbUser.role,
    departmentId: dbUser.departmentId,
  };
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function requireRole(allowedRoles: Role[]): Promise<
  | { user: SessionPayload; error?: never }
  | { user?: never; error: NextResponse }
> {
  const user = await getSessionUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: 'Authentication required' }, { status: 401 }),
    };
  }
  if (!allowedRoles.includes(user.role)) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden: insufficient role permissions' },
        { status: 403 }
      ),
    };
  }
  return { user };
}

