import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth/session';

export const metadata: Metadata = {
  title: 'Hướng dẫn sử dụng · ICOOL RASA TACO Dashboard Map',
};

// Always evaluated per request so the session cookie is checked every time
export const dynamic = 'force-dynamic';

export default async function GuidePage() {
  if (!(await getCurrentUser())) redirect('/login');

  return (
    <main className="guide-page">
      <div className="guide-inner">
        <header className="guide-head">
          <h1>Hướng dẫn sử dụng dashboard</h1>
          <Link className="btn" href="/">
            ← Về dashboard
          </Link>
        </header>

        <section className="guide-section">
          <h2>Video hướng dẫn</h2>
          <video className="guide-video" src="/huong-dan/video" controls preload="metadata" />
        </section>

        <section className="guide-section">
          <div className="guide-section-head">
            <h2>Tài liệu hướng dẫn (PDF)</h2>
            <a className="btn" href="/huong-dan/pdf" target="_blank" rel="noopener noreferrer">
              Mở tab mới
            </a>
          </div>
          <iframe className="guide-pdf" src="/huong-dan/pdf" title="Hướng dẫn sử dụng dashboard (PDF)" />
        </section>
      </div>
    </main>
  );
}
