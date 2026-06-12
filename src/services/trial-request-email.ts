type TrialRequestLeadEmailInput = {
  companyName: string;
  fullName: string;
  email: string;
  phone: string;
  city?: string | null;
  requestedSubdomain?: string | null;
  assignedSubdomain: string;
  notes?: string | null;
  requestId: string;
  createdAt: Date;
};

export function buildTrialRequestLeadEmail(input: TrialRequestLeadEmailInput) {
  const subject = `Trial request baru - ${input.companyName}`;
  const text = [
    "Lead trial baru masuk ke Besawit.",
    "",
    `Nama usaha: ${input.companyName}`,
    `PIC: ${input.fullName}`,
    `Email: ${input.email}`,
    `WhatsApp: ${input.phone}`,
    `Kota: ${input.city || "-"}`,
    `Subdomain diminta: ${input.requestedSubdomain || "-"}`,
    `Subdomain dicadangkan: ${input.assignedSubdomain}`,
    `Request ID: ${input.requestId}`,
    `Waktu masuk: ${input.createdAt.toLocaleString("id-ID")}`,
    `Catatan: ${input.notes || "-"}`,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #183216;">
      <h2>Lead trial baru masuk</h2>
      <table style="border-collapse: collapse;">
        <tbody>
          <tr><td style="padding:4px 12px 4px 0;"><strong>Nama usaha</strong></td><td>${input.companyName}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;"><strong>PIC</strong></td><td>${input.fullName}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;"><strong>Email</strong></td><td>${input.email}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;"><strong>WhatsApp</strong></td><td>${input.phone}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;"><strong>Kota</strong></td><td>${input.city || "-"}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;"><strong>Subdomain diminta</strong></td><td>${input.requestedSubdomain || "-"}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;"><strong>Subdomain dicadangkan</strong></td><td>${input.assignedSubdomain}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;"><strong>Request ID</strong></td><td>${input.requestId}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;"><strong>Waktu masuk</strong></td><td>${input.createdAt.toLocaleString("id-ID")}</td></tr>
          <tr><td style="padding:4px 12px 4px 0;"><strong>Catatan</strong></td><td>${input.notes || "-"}</td></tr>
        </tbody>
      </table>
    </div>
  `.trim();

  return { subject, text, html };
}
