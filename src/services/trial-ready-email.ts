import { env } from "@/lib/env";

type TrialReadyEmailInput = {
  companyName: string;
  subdomain: string;
  loginUrl: string;
  setupUrl: string;
  adminEmail: string;
  trialEndsAt?: Date | null;
};

function formatDateTime(value?: Date | null) {
  if (!value) {
    return "-";
  }

  return value.toLocaleString("id-ID");
}

export function buildTrialReadyEmail(input: TrialReadyEmailInput) {
  const subject = `Trial ${input.companyName} sudah siap dipakai`;
  const supportPhone = env.TRIAL_CONTACT_WHATSAPP || null;
  const supportLine = supportPhone
    ? `Butuh bantuan? Hubungi WhatsApp ${supportPhone}.`
    : "Butuh bantuan? Hubungi tim Besawit.";

  const text = [
    `Halo ${input.companyName},`,
    "",
    "Trial Besawit Anda sudah siap dipakai.",
    `Subdomain: ${input.subdomain}`,
    `Email admin: ${input.adminEmail}`,
    `Setup password admin: ${input.setupUrl}`,
    `Login tenant: ${input.loginUrl}`,
    `Trial aktif sampai: ${formatDateTime(input.trialEndsAt)}`,
    "",
    "Langkah berikutnya:",
    "1. Buka setup link untuk membuat password admin pertama.",
    "2. Setelah password tersimpan, login ke tenant.",
    "3. Isi data inti dan coba satu transaksi pertama.",
    "",
    supportLine,
  ].join("\n");

  const html = `
    <div style="font-family: Arial, sans-serif; color: #183216; line-height: 1.6;">
      <h2 style="margin-bottom: 8px;">Trial ${input.companyName} sudah siap dipakai</h2>
      <p style="margin-top: 0;">Tenant Besawit Anda sudah selesai diproses dan siap untuk onboarding.</p>
      <ul>
        <li><strong>Subdomain:</strong> ${input.subdomain}</li>
        <li><strong>Email admin:</strong> ${input.adminEmail}</li>
        <li><strong>Trial aktif sampai:</strong> ${formatDateTime(input.trialEndsAt)}</li>
      </ul>
      <p>
        <a href="${input.setupUrl}" style="display:inline-block;padding:12px 18px;background:#d8f26a;color:#183216;text-decoration:none;border-radius:999px;font-weight:700;">
          Buat Password Admin
        </a>
      </p>
      <p>Setelah password tersimpan, login ke tenant Anda:</p>
      <p><a href="${input.loginUrl}">${input.loginUrl}</a></p>
      <p>Butuh bantuan? ${supportPhone ? `Hubungi WhatsApp ${supportPhone}.` : "Hubungi tim Besawit."}</p>
    </div>
  `.trim();

  return {
    subject,
    text,
    html,
  };
}
