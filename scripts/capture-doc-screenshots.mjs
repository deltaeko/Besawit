import "dotenv/config";

import fs from "node:fs/promises";
import path from "node:path";

import { chromium } from "playwright";
import pg from "pg";

const { Client } = pg;

const baseUrl = process.env.BESAWIT_DOC_BASE_URL ?? process.env.APP_URL ?? "http://localhost:6001";
const outputDir = path.resolve("docs/assets/screenshots");

async function getLatestIds() {
  const client = new Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  const queries = {
    palmPurchase: 'select id from tbs_purchases order by created_at desc limit 1',
    palmSale: 'select id from tbs_sales order by created_at desc limit 1',
    storePurchase: 'select id from store_purchases order by created_at desc limit 1',
    storeSale: 'select id from store_sales order by created_at desc limit 1',
    payable: 'select id from payables order by created_at desc limit 1',
    receivable: 'select id from receivables order by created_at desc limit 1',
  };

  const ids = {};
  for (const [key, query] of Object.entries(queries)) {
    const result = await client.query(query);
    ids[key] = result.rows[0]?.id ?? "";
  }

  await client.end();
  return ids;
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });
  const ids = await getLatestIds();

  const shots = [
    {
      file: "01-login.png",
      title: "Halaman Login",
      caption: "Gambar 1. Halaman login Besawit.",
      route: "/login",
      requiresAuth: false,
    },
    {
      file: "02-dashboard.png",
      title: "Dashboard Utama",
      caption: "Gambar 2. Dashboard utama setelah login.",
      route: "/dashboard",
    },
    {
      file: "03-master-customers-list.png",
      title: "Daftar Pelanggan Toko",
      caption: "Gambar 3. Daftar pelanggan toko pada modul Master Data.",
      route: "/master/customers",
    },
    {
      file: "04-master-customers-new.png",
      title: "Form Tambah Pelanggan Toko",
      caption: "Gambar 4. Form tambah pelanggan toko dengan pilihan petani terkait.",
      route: "/master/customers/new",
    },
    {
      file: "05-palm-purchases-list.png",
      title: "Daftar Pembelian TBS",
      caption: "Gambar 5. Daftar transaksi pembelian TBS.",
      route: "/palm/purchases",
    },
    {
      file: "06-palm-purchase-new.png",
      title: "Form Pembelian TBS",
      caption: "Gambar 6. Form pembelian TBS dari petani.",
      route: "/palm/purchases/new",
    },
    {
      file: "07-palm-purchase-detail.png",
      title: "Detail Pembelian TBS",
      caption: "Gambar 7. Halaman detail pembelian TBS.",
      route: `/palm/purchases/${ids.palmPurchase}`,
    },
    {
      file: "08-palm-sale-detail.png",
      title: "Detail Penjualan ke Pabrik",
      caption: "Gambar 8. Halaman detail penjualan TBS ke pabrik.",
      route: `/palm/sales/${ids.palmSale}`,
    },
    {
      file: "09-store-purchases-list.png",
      title: "Daftar Pembelian Barang",
      caption: "Gambar 9. Daftar pembelian barang toko.",
      route: "/store/purchases",
    },
    {
      file: "10-store-purchase-detail.png",
      title: "Detail Pembelian Barang",
      caption: "Gambar 10. Detail pembelian barang toko beserta item dan retur.",
      route: `/store/purchases/${ids.storePurchase}`,
    },
    {
      file: "11-store-sale-detail.png",
      title: "Detail Penjualan Toko",
      caption: "Gambar 11. Detail penjualan toko.",
      route: `/store/sales/${ids.storeSale}`,
    },
    {
      file: "12-finance-payment-form.png",
      title: "Form Pembayaran / Penerimaan",
      caption: "Gambar 12. Form pembayaran atau penerimaan pada modul Finance.",
      route: `/finance/payments?payableId=${ids.payable}`,
    },
    {
      file: "13-finance-payable-detail.png",
      title: "Detail Hutang",
      caption: "Gambar 13. Detail hutang pada modul Finance.",
      route: `/finance/payables/${ids.payable}`,
    },
    {
      file: "14-inventory-stock.png",
      title: "Saldo Stok",
      caption: "Gambar 14. Halaman saldo stok dan posisi TBS pool.",
      route: "/inventory/stock",
    },
    {
      file: "15-report-transactions.png",
      title: "Laporan Transaksi",
      caption: "Gambar 15. Halaman laporan transaksi lintas modul.",
      route: "/reports/transactions",
    },
    {
      file: "16-palm-sale-document.png",
      title: "Preview Dokumen Penjualan Pabrik",
      caption: "Gambar 16. Preview dokumen penjualan TBS ke pabrik.",
      route: `/palm/sales/${ids.palmSale}/document`,
    },
  ];

  const browser = await chromium.launch({
    channel: process.env.PLAYWRIGHT_CHANNEL ?? "msedge",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1100 },
    deviceScaleFactor: 1,
    colorScheme: "light",
  });
  const page = await context.newPage();

  async function gotoStable(route) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle", { timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(800);
  }

  await gotoStable("/login");
  await page.screenshot({
    path: path.join(outputDir, "01-login.png"),
    fullPage: false,
  });

  await page.getByLabel("Email").fill("owner@besawit.local");
  await page.getByLabel("Password").fill("password123");
  await Promise.all([
    page.waitForURL("**/dashboard", { timeout: 15000 }),
    page.getByRole("button", { name: "Login" }).click(),
  ]);
  await page.waitForLoadState("networkidle", { timeout: 2000 }).catch(() => {});
  await page.waitForTimeout(1000);

  for (const shot of shots.filter((item) => item.requiresAuth !== false && item.file !== "01-login.png")) {
    await gotoStable(shot.route);
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(300);
    await page.screenshot({
      path: path.join(outputDir, shot.file),
      fullPage: false,
    });
  }

  await browser.close();

  await fs.writeFile(
    path.join(outputDir, "manifest.json"),
    JSON.stringify(
      shots.map((item) => ({
        file: item.file,
        title: item.title,
        caption: item.caption,
        route: item.route,
      })),
      null,
      2,
    ),
    "utf8",
  );

  console.log(`Captured ${shots.length} screenshots into ${outputDir}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
