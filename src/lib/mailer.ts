import nodemailer, { Transporter } from "nodemailer";

// Cliente SMTP (STARTTLS en el 587). Si falta configuración, el envío se omite
// en silencio para no romper entornos de desarrollo sin SMTP.
let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) return null;
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 587),
      secure: false,
      requireTLS: true,
      pool: true,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });
  }
  return transporter;
}

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

// Envía cada correo por separado (sin exponer destinatarios entre sí). Los
// fallos se registran y no se propagan.
export async function sendMails(messages: MailMessage[]): Promise<void> {
  const t = getTransporter();
  if (!t || messages.length === 0) return;
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;
  const results = await Promise.allSettled(
    messages.map((m) => t.sendMail({ from, ...m }))
  );
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.error(`Error enviando correo a ${messages[i].to}:`, r.reason);
    }
  });
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function appUrl(path: string): string {
  return new URL(path, process.env.NEXTAUTH_URL ?? "http://localhost:3006").toString();
}
