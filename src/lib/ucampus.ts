const UCAMPUS_API_BASE = "https://apps.dcc.uchile.cl/servicios/puente/ucampus/api/fcfm_mufasa";

export interface PhotoResult {
  url: string | null;
  // HTTP status from Mufasa, or null on network/config failure.
  status: number | null;
  error?: string;
}

export async function fetchPhotoResult(rut: string): Promise<PhotoResult> {
  const token = process.env.UCAMPUS_API_TOKEN;
  if (!token) {
    return { url: null, status: null, error: "UCAMPUS_API_TOKEN no configurado" };
  }

  try {
    const res = await fetch(`${UCAMPUS_API_BASE}/personas?rut=${rut}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      return {
        url: null,
        status: res.status,
        error: `Mufasa respondió HTTP ${res.status}`,
      };
    }

    const data = await res.json();
    const imageUrl = (data.i as string | undefined) || null;
    return { url: imageUrl, status: res.status };
  } catch (e) {
    console.error("[ucampus] Error fetching photo:", e);
    return { url: null, status: null, error: "No se pudo conectar con Mufasa" };
  }
}

// Thin wrapper for callers that only need the URL and should never fail
// (e.g. login: a missing photo must not block access).
export async function fetchPhotoUrl(rut: string): Promise<string | null> {
  return (await fetchPhotoResult(rut)).url;
}
