import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, unauthorized } from "@/lib/session";
import { chatCompletion, isLlmEnabled } from "@/lib/llm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_CHARS = 8000;
const TIMEOUT_MS = Number(process.env.SPELLCHECK_LLM_TIMEOUT_MS ?? 30000);

const SYSTEM_PROMPT =
  "Eres un corrector ortográfico de español de Chile. Recibes un comentario " +
  "o un apunte de avance escrito en un tema del Consejo del Departamento de Ciencias de la " +
  "Computación. Corrige solo ortografía, tildes, puntuación, mayúsculas y " +
  "errores de tipeo. No cambies el sentido, el tono, el registro ni la " +
  "elección de palabras; no agregues ni quites contenido. Conserva los saltos " +
  "de línea, nombres, siglas, montos, fechas, enlaces y correos tal cual. " +
  "Si el texto está en otro idioma, corrígelo en ese idioma. Devuelve SOLO el " +
  "texto corregido, sin comillas, sin explicaciones y sin markdown.";

// Indica a la UI si mostrar el botón de corrección.
export async function GET() {
  const user = await getAuthUser();
  if (!user) return unauthorized();
  return NextResponse.json({ enabled: isLlmEnabled() });
}

// Corrige la ortografía de un texto con el LLM de la institución. Solo
// devuelve la propuesta: el cliente la aplica y puede revertirla.
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) return unauthorized();

  if (!isLlmEnabled()) {
    return NextResponse.json({ error: "LLM no disponible" }, { status: 503 });
  }

  const body = await request.json().catch(() => ({}));
  const text = typeof body?.text === "string" ? body.text : "";
  if (!text.trim()) {
    return NextResponse.json({ error: "Text is required" }, { status: 400 });
  }
  if (text.length > MAX_CHARS) {
    return NextResponse.json({ error: "Text too long" }, { status: 413 });
  }

  try {
    const corrected = await chatCompletion({
      system: SYSTEM_PROMPT,
      user: text,
      timeoutMs: TIMEOUT_MS,
      temperature: 0,
    });
    // Respuesta vacía o desbocada: no se ofrece como corrección.
    if (!corrected || corrected.length > text.length * 2 + 200) {
      return NextResponse.json({ error: "Respuesta inválida del LLM" }, { status: 502 });
    }
    return NextResponse.json({ text: corrected });
  } catch (e) {
    console.warn("[spellcheck] error al llamar al LLM:", e instanceof Error ? e.message : e);
    return NextResponse.json({ error: "Error del LLM" }, { status: 502 });
  }
}
