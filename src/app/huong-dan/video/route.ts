import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { Readable } from 'node:stream';
import { NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth/session';

// Kept outside /public so the video is only served to signed-in users
const VIDEO_PATH = path.join(process.cwd(), 'docs', 'huong-dan-su-dung-dashboard.mp4');

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.redirect(new URL('/login', request.url));

  const { size } = await stat(VIDEO_PATH);
  const headers: Record<string, string> = {
    'Content-Type': 'video/mp4',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, no-store',
  };

  // Browsers stream and seek video with Range requests, so serve partial content
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') ?? '');
  if (!range || (!range[1] && !range[2])) {
    return new NextResponse(toWebStream(0, size - 1), {
      headers: { ...headers, 'Content-Length': String(size) },
    });
  }

  // "bytes=-N" asks for the last N bytes
  const start = range[1] ? Number(range[1]) : Math.max(size - Number(range[2]), 0);
  const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
  if (start >= size || start > end) {
    return new NextResponse(null, {
      status: 416,
      headers: { ...headers, 'Content-Range': `bytes */${size}` },
    });
  }

  return new NextResponse(toWebStream(start, end), {
    status: 206,
    headers: {
      ...headers,
      'Content-Length': String(end - start + 1),
      'Content-Range': `bytes ${start}-${end}/${size}`,
    },
  });
}

function toWebStream(start: number, end: number): ReadableStream<Uint8Array> {
  return Readable.toWeb(createReadStream(VIDEO_PATH, { start, end })) as ReadableStream<Uint8Array>;
}
