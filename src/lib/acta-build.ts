// Construcción del PDF del acta (cuerpo + anexos). Se usa tanto desde la
// generación en segundo plano como desde cualquier regeneración. Separado del
// route handler para poder invocarlo sin pasar por HTTP.
import { readFile, writeFile, mkdir } from "fs/promises";
import path from "path";
import { PDFDocument } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { UPLOADS_DIR, resolveAttachmentPaths } from "@/lib/uploads";
import { activeMembersAt, formatAttendee, primaryGoverningRole } from "@/lib/acta";
import { effectiveRoles } from "@/lib/roles";
import { summarizeActaPoints } from "@/lib/acta-llm";
import { renderActaToBuffer, type ActaPoint } from "@/app/api/sessions/[id]/acta/ActaDocument";

const RESOLVED = ["APROBADO", "RECHAZADO", "CERRADO"] as const;

// Arma el encabezado del punto según el estado del tema, igual que en las actas
// oficiales: "Aprobado por el Consejo…", "Rechazado por el Consejo…" o, para los
// temas cerrados sin votación, "Se discutió…". El encabezado va en negrita y el
// resto como contexto.
function framePoint(
  status: string,
  title: string,
  resolution: string | null,
  description: string
): ActaPoint {
  const res = resolution?.trim() ?? "";
  const desc = description.trim();
  const t = title.trim();
  // Si la resolución ya empieza con el verbo de decisión, no lo dupliques.
  const alreadyFramed = /^(aprob|se aprob|rechaz|se rechaz|se discut)/i.test(res);

  const withPeriod = (s: string) => (/[.!?]$/.test(s.trim()) ? s.trim() : `${s.trim()}.`);

  if (status === "CERRADO") {
    const lead = alreadyFramed ? withPeriod(res) : `Se discutió ${withPeriod(t)}`;
    const context = alreadyFramed ? desc : res || desc;
    return { resolution: lead, context: context === lead ? "" : context };
  }

  const subject = res || t;
  let lead: string;
  if (alreadyFramed) {
    lead = withPeriod(subject);
  } else if (status === "RECHAZADO") {
    lead = `Se rechazó ${withPeriod(subject)}`;
  } else {
    lead = `Aprobado por el Consejo: ${withPeriod(subject)}`;
  }
  // Si la resolución se usó como encabezado, el contexto es la descripción; si
  // no había resolución, el encabezado es el título y la descripción es contexto.
  const context = desc && desc !== subject ? desc : "";
  return { resolution: lead, context };
}

// Reúne todo el contenido del tema para que el LLM lo resuma: descripción,
// resolución, avances y discusión. Se recorta para no inflar el prompt.
function buildMaterial(
  description: string,
  resolution: string | null,
  notes: { content: string }[],
  comments: { content: string }[]
): string {
  const parts: string[] = [];
  if (description.trim()) parts.push(`Descripción: ${description.trim()}`);
  if (resolution?.trim()) parts.push(`Resolución: ${resolution.trim()}`);
  if (notes.length) parts.push("Avances:\n" + notes.map((n) => `- ${n.content.trim()}`).join("\n"));
  if (comments.length)
    parts.push("Discusión:\n" + comments.map((c) => `- ${c.content.trim()}`).join("\n"));
  const text = parts.join("\n\n");
  return text.length > 4000 ? `${text.slice(0, 4000)}…` : text;
}

export async function buildActaPdf(sessionId: string, useLlm: boolean): Promise<Buffer> {
  const session = await prisma.councilSession.findUnique({
    where: { id: sessionId },
    include: {
      topics: true,
      attendees: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              roles: true,
              membershipPeriods: { select: { role: true, startDate: true, endDate: true } },
            },
          },
        },
      },
      actaAttachments: {
        orderBy: { order: "asc" },
        include: { attachment: { select: { id: true, fileUrl: true } } },
      },
    },
  });

  if (!session) throw new Error("Session not found");

  const sessionDate = new Date(session.date);

  // --- Asistentes / invitados ---
  const attendeeUsers = session.attendees.map((a) => a.user);
  const active = activeMembersAt(attendeeUsers, sessionDate);
  const activeById = new Map(active.map((m) => [m.id, m]));

  const formattedAttendees = session.attendees
    .map((a) => {
      const m = activeById.get(a.userId);
      const role =
        m?.role ??
        primaryGoverningRole(effectiveRoles(a.user.roles, a.user.membershipPeriods, sessionDate)) ??
        (a.isGuest ? "INVITADO" : "CONSEJERO");
      return {
        label: formatAttendee(a.user.name, role),
        name: a.user.name,
        isGuest: a.isGuest,
        rank: m?.rank ?? 99,
      };
    })
    .sort((x, y) => x.rank - y.rank || x.name.localeCompare(y.name, "es"));

  const attendees = formattedAttendees.filter((a) => !a.isGuest).map((a) => a.label);
  const guests = formattedAttendees.filter((a) => a.isGuest).map((a) => a.label);

  // --- Temas resueltos en esta sesión, en el orden de la sesión ---
  const topics = await prisma.topic.findMany({
    where: { status: { in: [...RESOLVED] }, resolvedInSessionId: sessionId },
    select: {
      id: true,
      title: true,
      description: true,
      resolution: true,
      status: true,
      notes: { select: { content: true }, orderBy: { createdAt: "asc" } },
      comments: { select: { content: true }, orderBy: { createdAt: "asc" } },
    },
  });

  const orderMap = new Map(session.topics.map((st) => [st.topicId, st.order]));
  topics.sort((a, b) => {
    const oa = orderMap.get(a.id);
    const ob = orderMap.get(b.id);
    if (oa != null && ob != null) return oa - ob;
    if (oa != null) return -1;
    if (ob != null) return 1;
    return 0;
  });

  const framed: ActaPoint[] = topics.map((t) =>
    framePoint(t.status, t.title, t.resolution, t.description)
  );

  // Con IA, cada punto es un resumen del tema (decisión + qué se trató/resolvió);
  // sin IA, queda la decisión más la descripción tal cual.
  let points = framed;
  if (useLlm) {
    const inputs = topics.map((t, i) => ({
      lead: framed[i].resolution,
      material: buildMaterial(t.description, t.resolution, t.notes, t.comments),
    }));
    points = await summarizeActaPoints(inputs, framed);
  }

  const dateLabel = sessionDate.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const generatedLabel = new Date().toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const actaBuffer = await renderActaToBuffer({
    dateLabel,
    location: session.location,
    attendees,
    guests,
    points,
    generatedLabel,
  });

  // --- Anexar PDFs seleccionados ---
  const merged = await PDFDocument.load(actaBuffer);
  for (const sel of session.actaAttachments) {
    const candidates = resolveAttachmentPaths(sel.attachment.fileUrl);
    let bytes: Buffer | null = null;
    for (const filePath of candidates) {
      bytes = await readFile(filePath).catch(() => null);
      if (bytes) break;
    }
    if (!bytes) continue;
    try {
      const src = await PDFDocument.load(bytes);
      const pages = await merged.copyPages(src, src.getPageIndices());
      pages.forEach((pg) => merged.addPage(pg));
    } catch {
      // PDF corrupto o cifrado: se omite sin romper el acta.
    }
  }

  return Buffer.from(await merged.save());
}

// Guarda el PDF del acta en disco (sobrescribe el anterior) y devuelve el
// fileUrl relativo y el tamaño, para registrarlos en SessionActa.
export async function saveActaFile(
  sessionId: string,
  buffer: Buffer
): Promise<{ fileUrl: string; fileSize: number }> {
  const dir = path.join(UPLOADS_DIR, "actas");
  await mkdir(dir, { recursive: true });
  const fileName = `${sessionId}.pdf`;
  await writeFile(path.join(dir, fileName), buffer);
  return { fileUrl: `/uploads/actas/${fileName}`, fileSize: buffer.length };
}
