// Cliente mínimo del LLM de la institución (endpoint estilo Ollama /v1 con
// AI_PROVIDER_BASE_URL + AI_MODEL_NAME). Lo usan el acta y el corrector
// ortográfico de comentarios.

const BASE_URL = process.env.AI_PROVIDER_BASE_URL?.replace(/\/+$/, "");
const MODEL = process.env.AI_MODEL_NAME ?? "qwen3.5:9b";

export function isLlmEnabled(): boolean {
  return Boolean(BASE_URL);
}

// Este qwen3.5 en Ollama ignora /no_think, think:false y enable_thinking: razona
// igual (5-30k tokens, 12-25s). El truco que SÍ lo apaga es prellenar el turno
// del asistente con <think></think>: el modelo continúa después y no razona
// (reasoning=0, ~0.3s).
const ASSISTANT_PREFILL = "<think></think>\n";

export function stripThink(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
}

// Una llamada de chat sin razonamiento. Lanza si no hay endpoint, si vence el
// timeout o si la respuesta no es 2xx; el llamador decide el respaldo.
export async function chatCompletion(opts: {
  system: string;
  user: string;
  timeoutMs: number;
  temperature?: number;
}): Promise<string> {
  if (!BASE_URL) throw new Error("LLM no configurado");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), opts.timeoutMs);
  const res = await fetch(`${BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: MODEL,
      temperature: opts.temperature ?? 0.2,
      stream: false,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
        { role: "assistant", content: ASSISTANT_PREFILL },
      ],
    }),
    signal: controller.signal,
  }).finally(() => clearTimeout(timeout));

  if (!res.ok) throw new Error(`respuesta ${res.status}`);
  const data = await res.json();
  return stripThink(data?.choices?.[0]?.message?.content ?? "");
}
