import { NextResponse } from 'next/server';
import { sqlServerEmployeeRepository } from '@/lib/auth/employee-repository';
import { authenticateEmployee } from '@/lib/auth/login-service';
import { loginRateLimiter } from '@/lib/auth/login-rate-limiter';
import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  getSessionMaxAgeSeconds,
} from '@/lib/auth/session';
import { logger } from '@/lib/logger';

const FIELD_MAX_LENGTH = 50;

interface LoginBody {
  sale: string;
  pin: string;
}

function parseLoginBody(raw: unknown): LoginBody | null {
  if (typeof raw !== 'object' || raw === null) return null;
  const { sale, pin } = raw as Record<string, unknown>;
  if (typeof sale !== 'string' || typeof pin !== 'string') return null;
  const trimmedSale = sale.trim();
  if (!trimmedSale || !pin) return null;
  if (trimmedSale.length > FIELD_MAX_LENGTH || pin.length > FIELD_MAX_LENGTH) return null;
  return { sale: trimmedSale, pin };
}

function getClientAddress(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

const errorResponse = (message: string, status: number) =>
  NextResponse.json({ error: message }, { status });

export async function POST(request: Request) {
  let body: LoginBody | null;
  try {
    body = parseLoginBody(await request.json());
  } catch {
    body = null;
  }
  if (!body) return errorResponse('Vui lòng nhập tên đăng nhập và mã PIN hợp lệ', 400);

  const attemptKey = `${getClientAddress(request)}|${body.sale.toLowerCase()}`;
  if (loginRateLimiter.isBlocked(attemptKey)) {
    logger.warn('login blocked by rate limiter', { sale: body.sale });
    return errorResponse('Đăng nhập sai quá nhiều lần, vui lòng thử lại sau', 429);
  }

  try {
    const result = await authenticateEmployee(sqlServerEmployeeRepository, body);
    if (!result.ok) {
      loginRateLimiter.recordFailure(attemptKey);
      logger.info('login rejected', { sale: body.sale, reason: result.reason });
      return result.reason === 'account_disabled'
        ? errorResponse('Tài khoản đã bị khóa hoặc ngừng hoạt động', 403)
        : errorResponse('Sai tên đăng nhập hoặc mã PIN', 401);
    }

    loginRateLimiter.reset(attemptKey);
    const response = NextResponse.json({ name: result.user.name });
    response.cookies.set(SESSION_COOKIE_NAME, await createSessionToken(result.user), {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: getSessionMaxAgeSeconds(),
    });
    logger.info('login succeeded', { sale: result.user.sale });
    return response;
  } catch (error) {
    logger.error('login failed due to server error', {
      sale: body.sale,
      error: error instanceof Error ? error.message : 'unknown',
    });
    return errorResponse('Không thể đăng nhập lúc này, vui lòng thử lại sau', 500);
  }
}
