import nodemailer, { Transporter } from "nodemailer";

// Cliente SMTP. En producción apunta al Postfix local (localhost:25, sin
// autenticación), que encola, reintenta y reenvía al SMTP del DCC. Con
// SMTP_USER se autentica directo contra el servidor (exige STARTTLS), útil en
// desarrollo. Sin SMTP_HOST el envío se omite.
let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!process.env.SMTP_HOST) return null;
  if (!transporter) {
    const user = process.env.SMTP_USER;
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT ?? 25),
      secure: false,
      ...(user
        ? { requireTLS: true, auth: { user, pass: process.env.SMTP_PASS } }
        : { ignoreTLS: true }),
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
// fallos se registran y no se propagan; los reintentos son tarea del relé.
export async function sendMails(messages: MailMessage[]): Promise<void> {
  if (messages.length === 0) return;
  const t = getTransporter();
  if (!t) {
    console.warn("SMTP no configurado (SMTP_HOST): no se envían correos");
    return;
  }
  const from = process.env.SMTP_FROM ?? process.env.SMTP_USER;
  for (const m of messages) {
    try {
      const info = await t.sendMail({ from, ...m });
      console.log(
        `Correo a ${m.to}: aceptados=${(info.accepted ?? []).join(",")} ` +
          `rechazados=${(info.rejected ?? []).join(",")} respuesta="${info.response}"`
      );
    } catch (e) {
      console.error(`Error enviando correo a ${m.to}:`, e);
    }
  }
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
