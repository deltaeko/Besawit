import fs from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";
import { marked } from "marked";

const docsDir = path.resolve("docs");
const markdownPath = path.join(docsDir, "Panduan_Penggunaan_Aplikasi_Besawit.md");
const htmlPath = path.join(docsDir, "Panduan_Penggunaan_Aplikasi_Besawit.html");
const pdfPath = path.join(docsDir, "Panduan_Penggunaan_Aplikasi_Besawit.pdf");

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024F\s-]/gi, "")
    .trim()
    .replace(/\s+/g, "-");
}

async function main() {
  const markdown = await fs.readFile(markdownPath, "utf8");
  const tokens = marked.lexer(markdown);
  const tocEntries = [];

  const renderer = new marked.Renderer();
  renderer.heading = ({ tokens, depth }) => {
    const text = tokens.map((token) => token.raw ?? "").join("").trim();
    const id = slugify(text);

    if (depth === 2 || depth === 3) {
      tocEntries.push({ depth, text, id });
    }

    const tag = `h${depth}`;
    return `<${tag} id="${id}">${text}</${tag}>`;
  };

  const contentHtml = marked.parse(markdown, { renderer });
  const tocHtml = tocEntries
    .map((item) => {
      const cls = item.depth === 2 ? "toc-level-2" : "toc-level-3";
      return `<li class="${cls}"><a href="#${item.id}">${item.text}</a></li>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Panduan Penggunaan Aplikasi Besawit</title>
  <style>
    :root {
      --text: #1f2a1f;
      --muted: #5a665b;
      --line: #d9e2d3;
      --accent: #2f6f46;
      --soft: #f5f7f2;
    }
    @page {
      size: A4;
      margin: 18mm 14mm 18mm 14mm;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--text);
      font-family: "Segoe UI", Arial, sans-serif;
      line-height: 1.65;
      font-size: 11pt;
      background: white;
    }
    .cover {
      min-height: 250mm;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 18mm 16mm;
      border: 1px solid var(--line);
      border-radius: 18px;
      background: linear-gradient(180deg, #ffffff 0%, #f5f8f3 100%);
      page-break-after: always;
    }
    .cover-kicker {
      font-size: 10pt;
      letter-spacing: 0.35em;
      text-transform: uppercase;
      color: var(--accent);
      margin-bottom: 16px;
    }
    .cover h1 {
      font-size: 26pt;
      line-height: 1.2;
      margin: 0 0 14px 0;
    }
    .cover p {
      max-width: 75%;
      color: var(--muted);
      margin: 0 0 10px 0;
    }
    .cover-meta {
      margin-top: 24px;
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 10px 18px;
      max-width: 70%;
      font-size: 10pt;
      color: var(--muted);
    }
    .toc {
      page-break-after: always;
      border: 1px solid var(--line);
      border-radius: 18px;
      padding: 18px 22px;
      background: white;
    }
    .toc h2 {
      margin-top: 0;
      border-bottom: 2px solid var(--line);
      padding-bottom: 8px;
    }
    .toc ol {
      margin: 0;
      padding-left: 18px;
    }
    .toc li { margin: 6px 0; }
    .toc-level-3 { margin-left: 16px; font-size: 10pt; }
    .toc a {
      color: var(--text);
      text-decoration: none;
    }
    main {
      max-width: 100%;
    }
    h1 {
      font-size: 22pt;
      margin: 0 0 18px 0;
    }
    h2 {
      font-size: 16pt;
      margin-top: 28px;
      margin-bottom: 10px;
      border-bottom: 1px solid var(--line);
      padding-bottom: 6px;
    }
    h3 {
      font-size: 13pt;
      margin-top: 22px;
      margin-bottom: 8px;
    }
    p, ul, ol, blockquote {
      margin-top: 0;
      margin-bottom: 10px;
    }
    ul, ol {
      padding-left: 20px;
    }
    li {
      margin: 4px 0;
    }
    hr {
      border: 0;
      border-top: 1px solid var(--line);
      margin: 20px 0;
    }
    blockquote {
      margin-left: 0;
      padding: 10px 14px;
      border-left: 4px solid var(--accent);
      background: var(--soft);
      color: var(--muted);
    }
    img {
      display: block;
      width: 100%;
      max-width: 100%;
      border: 1px solid var(--line);
      border-radius: 12px;
      margin: 14px 0 6px;
      page-break-inside: avoid;
    }
    p > em:only-child {
      display: block;
      margin-bottom: 14px;
      color: var(--muted);
      font-size: 9.5pt;
      text-align: center;
    }
    code {
      background: #f0f4ee;
      padding: 1px 5px;
      border-radius: 6px;
      font-size: 9.5pt;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 14px 0;
      font-size: 10pt;
    }
    th, td {
      border: 1px solid var(--line);
      padding: 8px 10px;
      vertical-align: top;
    }
    th {
      background: var(--soft);
      text-align: left;
    }
    .page-break {
      page-break-before: always;
    }
  </style>
</head>
<body>
  <section class="cover">
    <div class="cover-kicker">Besawit</div>
    <h1>Panduan Penggunaan Aplikasi Besawit</h1>
    <p>Panduan operasional untuk pengguna Besawit yang menangani pembelian TBS, penjualan ke pabrik, toko pertanian, persediaan, hutang, piutang, pembayaran, dan laporan.</p>
    <p>Dokumen ini disusun berdasarkan implementasi aplikasi yang benar-benar tersedia pada codebase dan aplikasi lokal saat penyusunan.</p>
    <div class="cover-meta">
      <div><strong>Versi dokumen</strong><br />1.0</div>
      <div><strong>Tanggal</strong><br />29 Maret 2026</div>
      <div><strong>Bahasa</strong><br />Indonesia</div>
      <div><strong>Tujuan</strong><br />Training, onboarding, dan referensi operasional</div>
    </div>
  </section>
  <section class="toc">
    <h2>Daftar Isi</h2>
    <ol>${tocHtml}</ol>
  </section>
  <main>${contentHtml}</main>
</body>
</html>`;

  await fs.writeFile(htmlPath, html, "utf8");

  const browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge",
    headless: true,
  });
  const page = await browser.newPage();
  await page.goto(`file:///${htmlPath.replace(/\\/g, "/")}`, {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(1500);

  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    displayHeaderFooter: true,
    headerTemplate: `<div style="width:100%; font-size:9px; color:#6b7280; padding:0 10mm; text-align:right;"></div>`,
    footerTemplate: `
      <div style="width:100%; font-size:9px; color:#6b7280; padding:0 10mm; display:flex; justify-content:space-between;">
        <span>Panduan Penggunaan Aplikasi Besawit</span>
        <span><span class="pageNumber"></span> / <span class="totalPages"></span></span>
      </div>
    `,
    margin: {
      top: "18mm",
      right: "14mm",
      bottom: "18mm",
      left: "14mm",
    },
  });

  await browser.close();
  console.log(`Generated ${htmlPath}`);
  console.log(`Generated ${pdfPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
