const UCAMPUS_API_BASE = "https://apps.dcc.uchile.cl/servicios/puente/ucampus/api/fcfm_mufasa";

export interface PersonaResult {
  // HTTP status from Ucampus, or null on network/config failure.
  status: number | null;
  error?: string;
  // Nombre corto para mostrar (ej: "Matías Toro I.").
  alias: string | null;
  // Nombre completo armado desde Ucampus.
  fullName: string | null;
  // URL de la foto.
  image: string | null;
}

export async function fetchPersona(rut: string): Promise<PersonaResult> {
  const empty = { alias: null, fullName: null, image: null };

  const token = process.env.UCAMPUS_API_TOKEN;
  if (!token) {
    return { ...empty, status: null, error: "UCAMPUS_API_TOKEN no configurado" };
  }

  try {
    const res = await fetch(`${UCAMPUS_API_BASE}/personas?rut=${rut}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return { ...empty, status: res.status, error: `Ucampus respondió HTTP ${res.status}` };
    }

    const data = await res.json();
    const fullName =
      [data.nombre1, data.nombre2, data.apellido1, data.apellido2]
        .map((p) => (typeof p === "string" ? p.trim() : ""))
        .filter(Boolean)
        .join(" ") || null;

    return {
      status: res.status,
      alias: (data.alias as string | undefined)?.trim() || null,
      fullName,
      image: (data.i as string | undefined) || null,
    };
  } catch (e) {
    console.error("[ucampus] Error consultando Ucampus:", e);
    return { ...empty, status: null, error: "No se pudo conectar con Ucampus" };
  }
}
