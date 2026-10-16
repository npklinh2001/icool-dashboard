import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';

// Serves the static ride map build in reports/cuoc-xe (copied by `npm run sync:cuoc-xe`).
// Kept outside /public so the internal trip data is only served to signed-in users.
const BASE_PATH = '/cuoc-xe/';

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

export const dynamic = 'force-dynamic';

export async function GET(request: Request, ctx: { params: Promise<{ path?: string[] }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  const segments = (await ctx.params).path ?? ['index.html'];
  // No segment may be empty, hidden, ".." or contain a separator, so the path stays inside the site
  if (segments.some((s) => !s || s.startsWith('.') || /[\\/\0]/.test(s))) return notFound();
  const contentType = CONTENT_TYPES[path.extname(segments.at(-1)!).toLowerCase()];
  if (!contentType) return notFound();

  // Scoped statically to reports/cuoc-xe so the build only traces that folder
  const filePath = path.join(process.cwd(), 'reports', 'cuoc-xe', ...segments);

  const info = await stat(filePath).catch(() => null);
  if (!info?.isFile()) return notFound();

  const headers: Record<string, string> = {
    'Content-Type': contentType,
    'X-Content-Type-Options': 'nosniff',
    // Asset URLs carry a content hash (?v=...), so those can be cached; the rest must revalidate
    'Cache-Control': new URL(request.url).searchParams.has('v')
      ? 'private, max-age=31536000, immutable'
      : 'private, no-cache',
  };

  if (contentType.startsWith('text/html')) {
    // Next drops the trailing slash from /cuoc-xe/, so pin the base for the page's relative URLs
    const html = (await readFile(filePath, 'utf8')).replace(
      /<head>/i,
      `<head>\n  <base href="${BASE_PATH}">`,
    );
    return new NextResponse(html, {
      headers: { ...headers, 'Cache-Control': 'private, no-store' },
    });
  }

  // Next does not compress Route Handler responses, so use the .gz copy made by the sync script
  // (data.js is ~24 MB raw, ~4 MB gzipped)
  const gzipPath = `${filePath}.gz`;
  const gzipInfo = acceptsGzip(request) ? await stat(gzipPath).catch(() => null) : null;
  if (gzipInfo?.isFile()) {
    return new NextResponse(streamFile(gzipPath), {
      headers: {
        ...headers,
        'Content-Encoding': 'gzip',
        'Content-Length': String(gzipInfo.size),
        Vary: 'Accept-Encoding',
      },
    });
  }

  return new NextResponse(streamFile(filePath), {
    headers: { ...headers, 'Content-Length': String(info.size), Vary: 'Accept-Encoding' },
  });
}

function acceptsGzip(request: Request): boolean {
  return /\bgzip\b/i.test(request.headers.get('accept-encoding') ?? '');
}

function streamFile(filePath: string): ReadableStream<Uint8Array> {
  return Readable.toWeb(createReadStream(filePath)) as ReadableStream<Uint8Array>;
}

function notFound() {
  return new NextResponse('Not found', { status: 404 });
}
