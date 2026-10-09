// Formateo opcional de la prosa del acta con un LLM de la institución. Reutiliza
// la misma config que el bot (AI_PROVIDER_BASE_URL estilo Ollama /v1 +
// AI_MODEL_NAME). Si no hay endpoint configurado o la llamada falla, se usa el
// texto crudo sin bloquear la generación del acta.
//
// Se hace UNA sola llamada para toda el acta (no una por punto): el modelo
// "piensa" una vez y no se saturan varias peticiones concurrentes sobre la
// misma GPU. El timeout es amplio porque corre en segundo plano y el modelo
// razona antes de responder.

import { chatCompletion, isLlmEnabled, stripThink } from "./llm";

const TIMEOUT_MS = Number(process.env.ACTA_LLM_TIMEOUT_MS ?? 60000);

export function isActaLlmEnabled(): boolean {
  return isLlmEnabled();
}

export interface ActaPointText {
  // Decisión/resolución que va en negrita.
  resolution: string;
  // Contexto que acompaña en texto normal (puede ir vacío).
  context: string;
}

// Insumo para que el LLM resuma un tema: la decisión ya enmarcada (se conserva)
// más todo el material del tema (descripción, resolución, avances, discusión).
export interface ActaTopicInput {
  lead: string;
  material: string;
}

const SYSTEM_PROMPT =
  "Eres un editor que redacta actas formales del Consejo del Departamento de " +
  "Ciencias de la Computación (Universidad de Chile) en español de Chile. " +
  "Para cada tema recibes una línea de decisión y el material del tema " +
  "(descripción, resolución, avances y discusión). Tu tarea es escribir un " +
  "resumen del tema, claro, formal y conciso (dos a cuatro frases), en tercera " +
  "persona, que recoja de qué se trataba y qué se resolvió. No inventes " +
  "información: usa solo lo que está en el material. Conserva la línea de " +
  "decisión tal cual (su inicio: \"Aprobado por el Consejo\", \"Se rechazó\" o " +
  "\"Se discutió\") y mantén montos, nombres y fechas textuales. Sin markdown, " +
  "sin viñetas, sin repetir etiquetas como \"Decisión:\" o \"Material:\".";

// Extrae el JSON de la respuesta: arreglo, o un objeto suelto (que el modelo
// devuelve cuando hay un solo tema) envuelto en arreglo. Tolera texto o ```json.
function extractArray(text: string): unknown[] | null {
  const cleaned = stripThink(text);
  const aStart = cleaned.indexOf("[");
  const aEnd = cleaned.lastIndexOf("]");
  if (aStart !== -1 && aEnd > aStart) {
    try {
      const arr = JSON.parse(cleaned.slice(aStart, aEnd + 1));
      if (Array.isArray(arr)) return arr;
    } catch {
      // sigue al intento de objeto único
    }
  }
  const oStart = cleaned.indexOf("{");
  const oEnd = cleaned.lastIndexOf("}");
  if (oStart !== -1 && oEnd > oStart) {
    try {
      const obj = JSON.parse(cleaned.slice(oStart, oEnd + 1));
      if (obj && typeof obj === "object") return [obj];
    } catch {
      return null;
    }
  }
  return null;
}

// Resume todos los temas en una sola petición y devuelve, por tema, la línea de
// decisión (negrita) y un resumen (contexto). Si algo falla (endpoint caído,
// timeout, JSON inválido o cantidad distinta), devuelve el material de respaldo.
export async function summarizeActaPoints(
  inputs: ActaTopicInput[],
  fallback: ActaPointText[]
): Promise<ActaPointText[]> {
  if (!isLlmEnabled() || inputs.length === 0) return fallback;

  const userContent =
    "Resume los siguientes temas del acta. Devuelve SOLO un arreglo JSON, un " +
    "objeto por tema y en el mismo orden, con las claves \"resolucion\" (la " +
    "línea de decisión, conservada) y \"contexto\" (el resumen del tema).\n\n" +
    inputs
      .map(
        (p, i) =>
          `Tema ${i + 1}:\n` +
          `Decisión: ${p.lead || "(sin decisión)"}\n` +
          `Material del tema:\n${p.material || "(sin material)"}`
      )
      .join("\n\n");

  const points = fallback;
  try {
    const content = await chatCompletion({
      system: SYSTEM_PROMPT,
      user: userContent,
      timeoutMs: TIMEOUT_MS,
    });
    const arr = extractArray(content);
    if (!arr || arr.length !== points.length) {
      console.warn(
        `[acta-llm] JSON inválido o de largo distinto (${arr?.length} vs ${points.length}); se usa el texto crudo`
      );
      return points;
    }

    // Cada punto cae a su texto crudo si el objeto correspondiente viene vacío.
    return points.map((p, i) => {
      const obj = arr[i] as { resolucion?: unknown; contexto?: unknown } | null;
      const resolution = typeof obj?.resolucion === "string" ? obj.resolucion.trim() : "";
      const context = typeof obj?.contexto === "string" ? obj.contexto.trim() : "";
      if (!resolution) return p;
      return { resolution, context };
    });
  } catch (e) {
    console.warn(`[acta-llm] error al llamar al LLM; se usa el texto crudo:`, e instanceof Error ? e.message : e);
    return points;
  }
}
