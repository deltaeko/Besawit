export const reportConfig = {
  transactions: {
    title: "Transactions Report",
    description: "Ringkasan transaksi sawit dan toko lintas modul.",
  },
  margin: {
    title: "Margin Report",
    description: "Pantau margin pembelian dan penjualan TBS.",
  },
  payables: {
    title: "Payables Report",
    description: "Laporan posisi hutang per partner usaha.",
  },
  receivables: {
    title: "Receivables Report",
    description: "Laporan posisi piutang dan penagihan.",
  },
  "store-debt-offsets": {
    title: "Potong Hasil untuk Hutang Toko",
    description: "Pantau kompensasi hasil panen petani yang dipakai untuk menutup piutang toko.",
  },
  deductions: {
    title: "Deduction Report",
    description: "Analisis kualitas deduction pada penjualan TBS.",
  },
  returns: {
    title: "Return Report",
    description: "Pantau return pabrik dan tindak lanjutnya.",
  },
  stock: {
    title: "Stock Report",
    description: "Posisi persediaan, mutasi, dan minimum stock.",
  },
  "stock-take": {
    title: "Stock Take Report",
    description: "Variance stock take dan histori approval.",
  },
  "profit-loss": {
    title: "Profit & Loss",
    description: "Ringkasan performa operasional dan cashflow.",
  },
} as const;

export type ReportKey = keyof typeof reportConfig;

export function isReportKey(value: string): value is ReportKey {
  return value in reportConfig;
}
