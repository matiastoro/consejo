const UCAMPUS_API_BASE = "https://puente.test.dcc.uchile.cl/mufasa/ucampus/api/fcfm_mufasa";

export async function fetchPhotoUrl(rut: string): Promise<string | null> {
  const token = process.env.UCAMPUS_API_TOKEN;
  if (!token) return null;

  try {
    const res = await fetch(`${UCAMPUS_API_BASE}/personas?rut=${rut}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const imageUrl = data.i as string | undefined;
    return imageUrl || null;
  } catch (e) {
    console.error("[ucampus] Error fetching photo:", e);
    return null;
  }
}
