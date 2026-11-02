// Bundles the dashboard UI and report tree into one HTML file that opens straight from disk,
// to check the layout without deploying. Login and logout do not work in it; the guide
// button opens preview/huong-dan.html, which plays the files in docs/.
// Usage: npm run preview:html
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { build } from 'vite';

const root = path.resolve(import.meta.dirname, '..');
const outFile = path.join(root, 'preview', 'dashboard.html');
const guideFile = path.join(root, 'preview', 'huong-dan.html');
const outDir = await mkdtemp(path.join(tmpdir(), 'icool-preview-'));

try {
  await build({
    root,
    configFile: false,
    logLevel: 'warn',
    resolve: {
      alias: {
        '@': path.join(root, 'src'),
        'next/navigation': path.join(import.meta.dirname, 'preview', 'next-navigation.ts'),
      },
    },
    define: { 'process.env.NODE_ENV': '"production"' },
    build: {
      outDir,
      emptyOutDir: true,
      lib: {
        entry: path.join(import.meta.dirname, 'preview', 'main.tsx'),
        formats: ['iife'],
        name: 'IcoolPreview',
        fileName: () => 'preview.js',
        cssFileName: 'preview',
      },
      rolldownOptions: {
        // 'use client' only matters to Next
        onwarn(warning, warn) {
          if (warning.code !== 'MODULE_LEVEL_DIRECTIVE') warn(warning);
        },
      },
    },
  });

  const files = await readdir(outDir);
  const builtJs = await readFile(path.join(outDir, 'preview.js'), 'utf8');
  const cssName = files.find((name) => name.endsWith('.css'));
  const css = cssName ? await readFile(path.join(outDir, cssName), 'utf8') : '';

  // /huong-dan is served by Next; point the header button at the static copy written below
  const js = builtJs.replace(/(["'`])\/huong-dan\1/g, `$1${path.basename(guideFile)}$1`);
  if (js === builtJs) throw new Error('Không tìm thấy link "/huong-dan" trong bundle');

  // Inline code must not close its own tag early
  const page = (title, body) => `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;600;700&display=swap">
<style>:root { --font-be-vietnam: 'Be Vietnam Pro'; }</style>
<style>${css.replace(/<\/style/gi, '<\\/style')}</style>
</head>
<body>
${body}
</body>
</html>
`;

  // Same markup as src/app/huong-dan/page.tsx, reading the files in docs/ directly
  const docs = path
    .relative(path.dirname(guideFile), path.join(root, 'docs'))
    .replaceAll('\\', '/');
  const guide = page(
    'Hướng dẫn sử dụng · ICOOL RASA TACO Dashboard Map · Xem trước',
    `<main class="guide-page">
<div class="guide-inner">
<header class="guide-head">
<h1>Hướng dẫn sử dụng dashboard</h1>
<a class="btn" href="${path.basename(outFile)}">← Về dashboard</a>
</header>
<section class="guide-section">
<h2>Video hướng dẫn</h2>
<video class="guide-video" src="${docs}/huong-dan-su-dung-dashboard.mp4" controls preload="metadata"></video>
</section>
<section class="guide-section">
<div class="guide-section-head">
<h2>Tài liệu hướng dẫn (PDF)</h2>
<a class="btn" href="${docs}/huong-dan-su-dung-dashboard.pdf" target="_blank" rel="noopener noreferrer">Mở tab mới</a>
</div>
<iframe class="guide-pdf" src="${docs}/huong-dan-su-dung-dashboard.pdf" title="Hướng dẫn sử dụng dashboard (PDF)"></iframe>
</section>
</div>
</main>`,
  );

  await mkdir(path.dirname(outFile), { recursive: true });
  await writeFile(
    outFile,
    page(
      'ICOOL RASA TACO Dashboard Map · Xem trước',
      `<div id="root"></div>\n<script>${js.replace(/<\/script/gi, '<\\/script')}</script>`,
    ),
  );
  await writeFile(guideFile, guide);
  console.log(`Đã tạo ${outFile}`);
} finally {
  await rm(outDir, { recursive: true, force: true });
}
