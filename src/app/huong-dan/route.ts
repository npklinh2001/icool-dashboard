import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';

// Kept outside /public so the guide is only served to signed-in users
const GUIDE_PATH = path.join(process.cwd(), 'docs', 'huong-dan-su-dung-dashboard.pdf');
const GUIDE_FILENAME = 'Hướng dẫn sử dụng dashboard.pdf';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  const pdf = await readFile(GUIDE_PATH);
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(GUIDE_FILENAME)}`,
      'Cache-Control': 'private, no-store',
    },
  });
}
