import { prisma } from "@/lib/prisma";
import { canViewTopic, canVote, effectiveRoles } from "@/lib/roles";
import { sendMails, escapeHtml, appUrl } from "@/lib/mailer";

interface MailContent {
  subject: string;
  text: string;
  html: string;
}

interface TopicForMail {
  id: string;
  title: string;
  status: string;
  authorId: string;
  createdAt: Date;
  recusals: { userId: string }[];
}

const topicSelect = {
  id: true,
  title: true,
  description: true,
  status: true,
  authorId: true,
  createdAt: true,
  recusals: { select: { userId: true } },
} as const;

// Entrega un aviso de un tema. Con lista del consejo configurada
// (COMMENT_NOTIFY_TO), un solo correo al grupo. Si el tema tiene vetados, el
// grupo los incluiría: en ese caso, y sin lista, va uno por persona a quienes
// pueden ver el tema según sus periodos (sin la visibilidad total del admin
// técnico), excepto `excludeUserId`, los vetados y quienes desactivaron los
// avisos por correo.
async function deliver(
  topic: TopicForMail,
  excludeUserId: string,
  mail: MailContent,
  onlyVoters = false
): Promise<void> {
  const recused = new Set(topic.recusals.map((r) => r.userId));
  const groupTo = process.env.COMMENT_NOTIFY_TO;
  if (groupTo && recused.size === 0) {
    await sendMails([{ to: groupTo, ...mail }]);
    return;
  }

  const users = await prisma.user.findMany({
    where: {
      id: { not: excludeUserId },
      email: { not: null },
      emailNotifications: true,
    },
    select: {
      id: true,
      email: true,
      roles: true,
      membershipPeriods: { select: { role: true, startDate: true, endDate: true } },
    },
  });

  const recipients = users.filter((u) => {
    if (recused.has(u.id)) return false;
    const roles = effectiveRoles(u.roles, u.membershipPeriods);
    if (onlyVoters && !canVote(roles)) return false;
    return canViewTopic(
      {
        id: u.id,
        isAdmin: false,
        effectiveRoles: roles,
        membershipPeriods: u.membershipPeriods,
      },
      topic
    );
  });

  await sendMails(recipients.map((u) => ({ to: u.email!, ...mail })));
}

export async function notifyCommentByEmail(commentId: string): Promise<void> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: {
      user: { select: { id: true, name: true } },
      topic: { select: topicSelect },
    },
  });
  if (!comment) return;
  await deliver(
    comment.topic,
    comment.userId,
    buildMail(comment.user.name, comment.content, comment.topic)
  );
}

// Aviso de tema abierto a voto provisorio. Se llama cuando el tema queda en
// DISCUSSING con requiresProvisionalVote (al crearlo, aprobarlo o activarlo).
export async function notifyProvisionalVoteByEmail(
  topicId: string,
  actorId: string
): Promise<void> {
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    select: { ...topicSelect, requiresProvisionalVote: true, author: { select: { name: true } } },
  });
  if (!topic || !topic.requiresProvisionalVote || topic.status !== "DISCUSSING") return;

  const link = appUrl(`/temas/${topic.id}#voto-provisorio`);
  const subject = `[Consejo DCC] Voto provisorio: ${topic.title}`;
  const text =
    `${topic.author.name} propuso el tema "${topic.title}", que requiere voto provisorio:\n\n` +
    `${topic.description}\n\n` +
    `Votar: ${link}\n`;
  const html =
    `<p><strong>${escapeHtml(topic.author.name)}</strong> propuso el tema ` +
    `<strong>${escapeHtml(topic.title)}</strong>, que requiere voto provisorio:</p>` +
    quote(topic.description) +
    button(link, "Ver el tema y votar") +
    footer;
  await deliver(topic, actorId, { subject, text, html }, true);
}

export function buildMail(
  author: string,
  content: string,
  topic: { id: string; title: string }
): MailContent {
  const link = appUrl(`/temas/${topic.id}#comentar`);
  const body = content || "(comentario con archivo adjunto)";
  const subject = `[Consejo DCC] Nuevo comentario en: ${topic.title}`;
  const text =
    `${author} comentó en el tema "${topic.title}":\n\n` +
    `${body}\n\n` +
    `Ver el tema y responder: ${link}\n`;
  const html =
    `<p><strong>${escapeHtml(author)}</strong> comentó en el tema ` +
    `<strong>${escapeHtml(topic.title)}</strong>:</p>` +
    quote(body) +
    button(link, "Ver el tema y responder") +
    footer;
  return { subject, text, html };
}

function quote(s: string): string {
  return (
    `<blockquote style="margin:0 0 16px;padding:8px 12px;border-left:3px solid #ccc;white-space:pre-wrap">` +
    `${escapeHtml(s)}</blockquote>`
  );
}

function button(href: string, label: string): string {
  return (
    `<p><a href="${href}" style="display:inline-block;padding:10px 16px;background:#1565c0;color:#fff;text-decoration:none;border-radius:6px">` +
    `${label}</a></p>`
  );
}

const footer = `<p style="color:#888;font-size:12px">Recibes este correo como integrante del Consejo DCC.</p>`;
