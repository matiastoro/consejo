import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthUser, unauthorized } from "@/lib/session";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  const { id } = await params;

  const session = await prisma.councilSession.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      topics: true,
    },
  });

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  // Fetch only topics resolved in THIS session
  const allTopics = await prisma.topic.findMany({
    where: { status: { in: ["APROBADO", "RECHAZADO"] }, resolvedInSessionId: id },
    include: {
      author: { select: { name: true } },
      votes: { include: { user: { select: { name: true } } } },
      comments: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
      notes: {
        include: { user: { select: { name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  const sessionTopicMap = new Map(
    session.topics.map((st) => [st.topicId, st])
  );

  // Apply custom order if exists
  const orderedTopics = allTopics.map((topic) => {
    const st = sessionTopicMap.get(topic.id);
    return { topic, discussed: st?.discussed ?? false, customOrder: st?.order ?? null };
  });
  orderedTopics.sort((a, b) => {
    if (a.customOrder !== null && b.customOrder !== null) return a.customOrder - b.customOrder;
    if (a.customOrder !== null) return -1;
    if (b.customOrder !== null) return 1;
    return 0;
  });

  const statusLabel: Record<string, string> = {
    PENDING_APPROVAL: "Pendiente",
    DISCUSSING: "En discusión",
    APROBADO: "Aprobado",
    RECHAZADO: "Rechazado",
  };

  let topicsHtml = "";
  for (const { topic, discussed } of orderedTopics) {
    const aFavor = topic.votes.filter((v) => v.voteType === "A_FAVOR");
    const enContra = topic.votes.filter((v) => v.voteType === "EN_CONTRA");
    const masDatos = topic.votes.filter((v) => v.voteType === "MAS_DATOS");

    topicsHtml += `
      <div class="topic ${discussed ? "discussed" : "not-discussed"}">
        <h3>${escapeHtml(topic.title)}</h3>
        <p class="meta">Autor: ${escapeHtml(topic.author.name)} · Estado: ${statusLabel[topic.status] ?? topic.status}
        ${discussed ? " · <strong>Discutido en sesión</strong>" : " · No discutido"}</p>
        <p class="desc">${escapeHtml(topic.description)}</p>

        ${topic.notes.length > 0 ? `
        <div class="section">
          <h4>Avances / Apuntes</h4>
          ${topic.notes.map((n) => `<p class="note"><strong>${escapeHtml(n.user.name)}:</strong> ${escapeHtml(n.content)}</p>`).join("")}
        </div>
        ` : ""}

        ${topic.inPersonOnly ? `
        <div class="section">
          <h4>Votación</h4>
          <p class="note">Tema discutido presencialmente (sin votación en línea).</p>
        </div>
        ` : `
        <div class="section">
          <h4>Votación</h4>
          <table>
            <tr><td>A favor (${aFavor.length})</td><td>${aFavor.map((v) => escapeHtml(v.user.name)).join(", ") || "-"}</td></tr>
            <tr><td>En contra (${enContra.length})</td><td>${enContra.map((v) => escapeHtml(v.user.name)).join(", ") || "-"}</td></tr>
            <tr><td>Más datos (${masDatos.length})</td><td>${masDatos.map((v) => escapeHtml(v.user.name)).join(", ") || "-"}</td></tr>
          </table>
        </div>
        `}

        ${topic.resolution ? `
        <div class="section">
          <h4>Resolución</h4>
          <p class="desc">${escapeHtml(topic.resolution)}</p>
        </div>
        ` : ""}

        ${topic.comments.length > 0 ? `
        <div class="section">
          <h4>Discusión (${topic.comments.length} comentarios)</h4>
          ${topic.comments.map((c) => `
            <p class="comment"><strong>${escapeHtml(c.user.name)}</strong> <span class="date">(${new Date(c.createdAt).toLocaleString("es-CL")})</span>: ${escapeHtml(c.content)}</p>
          `).join("")}
        </div>
        ` : ""}
      </div>
    `;
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Acta - ${escapeHtml(session.title)}</title>
  <style>
    @media print { body { margin: 0; } }
    body { font-family: 'Segoe UI', Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #333; }
    h1 { text-align: center; border-bottom: 2px solid #1a5276; padding-bottom: 10px; }
    h2 { color: #1a5276; margin-top: 30px; }
    h3 { color: #2c3e50; margin-bottom: 5px; }
    h4 { color: #555; margin: 10px 0 5px; font-size: 14px; }
    .header-info { text-align: center; color: #666; margin-bottom: 30px; }
    .topic { border: 1px solid #ddd; border-radius: 8px; padding: 15px 20px; margin-bottom: 20px; page-break-inside: avoid; }
    .topic.discussed { border-left: 4px solid #27ae60; }
    .topic.not-discussed { border-left: 4px solid #95a5a6; }
    .meta { color: #666; font-size: 13px; margin: 5px 0 10px; }
    .section { margin-top: 12px; padding-top: 8px; border-top: 1px solid #eee; }
    .comment, .note { font-size: 13px; margin: 4px 0; line-height: 1.5; white-space: pre-wrap; }
    .desc { white-space: pre-wrap; }
    .date { color: #999; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; }
    table td { padding: 4px 8px; border: 1px solid #eee; }
    table td:first-child { width: 130px; font-weight: 600; }
    .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Acta de Sesión</h1>
  <div class="header-info">
    <p><strong>${escapeHtml(session.title)}</strong></p>
    <p>Fecha: ${new Date(session.date).toLocaleDateString("es-CL", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
    <p>Creado por: ${escapeHtml(session.createdBy.name)}</p>
  </div>

  <h2>Temas (${orderedTopics.length})</h2>
  ${topicsHtml}

  <div class="footer">
    <p>Consejo Departamental - Departamento de Ciencias de la Computación - Universidad de Chile</p>
    <p>Generado el ${new Date().toLocaleString("es-CL")}</p>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `inline; filename="acta-${session.title.replace(/\s+/g, "-").toLowerCase()}.html"`,
    },
  });
}
