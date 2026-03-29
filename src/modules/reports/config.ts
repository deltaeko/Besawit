export const reportConfig = {
  transactions: {
    title: "Laporan Transaksi",
    description: "Ringkasan transaksi sawit dan toko lintas modul.",
  },
  margin: {
    title: "Laporan Margin",
    description: "Pantau margin pembelian dan penjualan TBS.",
  },
  payables: {
    title: "Laporan Hutang",
    description: "Laporan posisi hutang per partner usaha.",
  },
  receivables: {
    title: "Laporan Piutang",
    description: "Laporan posisi piutang dan penagihan.",
  },
  "store-debt-offsets": {
    title: "Potong Hasil untuk Hutang Toko",
    description: "Pantau kompensasi hasil panen petani yang dipakai untuk menutup piutang toko.",
  },
  deductions: {
    title: "Laporan Potongan",
    description: "Analisis kualitas deduction pada penjualan TBS.",
  },
  returns: {
    title: "Laporan Retur",
    description: "Pantau return pabrik dan tindak lanjutnya.",
  },
  stock: {
    title: "Laporan Stok",
    description: "Posisi persediaan, mutasi, dan stok minimum.",
  },
  "stock-take": {
    title: "Laporan Stock Take",
    description: "Selisih stock take dan histori approval.",
  },
  "profit-loss": {
    title: "Laporan Laba Rugi",
    description: "Ringkasan performa operasional dan cashflow.",
  },
} as const;

export type ReportKey = keyof typeof reportConfig;

export function isReportKey(value: string): value is ReportKey {
  return value in reportConfig;
}
