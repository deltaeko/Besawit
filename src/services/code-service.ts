export function generateTransactionCode(prefix: string) {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:TZ.]/g, "")
    .slice(0, 17);
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();

  return `${prefix}-${stamp}-${suffix}`;
}
