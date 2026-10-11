import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { getAuthConfig } from '@/lib/config/env';
import type { AuthenticatedUser } from './login-service';

export const SESSION_COOKIE_NAME = 'icool_session';
const SECONDS_PER_HOUR = 3600;
const SIGNING_ALGORITHM = 'HS256';

export type SessionUser = AuthenticatedUser;

const encodeSecret = (secret: string) => new TextEncoder().encode(secret);

export function getSessionMaxAgeSeconds(): number {
  return getAuthConfig().sessionHours * SECONDS_PER_HOUR;
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  const { secret } = getAuthConfig();
  return new SignJWT({ sale: user.sale, name: user.name })
    .setProtectedHeader({ alg: SIGNING_ALGORITHM })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${getSessionMaxAgeSeconds()}s`)
    .sign(encodeSecret(secret));
}

// Returns null for any missing, tampered or expired token
export async function verifySessionToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  try {
    const { secret } = getAuthConfig();
    const { payload } = await jwtVerify(token, encodeSecret(secret), {
      algorithms: [SIGNING_ALGORITHM],
    });
    if (!payload.sub || typeof payload.sale !== 'string' || typeof payload.name !== 'string') {
      return null;
    }
    return { id: payload.sub, sale: payload.sale, name: payload.name };
  } catch {
    // Invalid signature or expiry is an expected, non-error outcome for anonymous visitors
    return null;
  }
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  return verifySessionToken(cookieStore.get(SESSION_COOKIE_NAME)?.value);
}
