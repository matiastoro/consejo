import { writeFile, mkdir } from "fs/promises";
import path from "path";

// Los adjuntos se guardan FUERA de public/ para que el servidor estático (y el
// proxy) no puedan entregarlos directamente. El único acceso es vía
// /api/attachments/[id], que autoriza al usuario antes de servir el archivo.
export const UPLOADS_DIR = path.join(process.cwd(), "uploads");
// Ubicación heredada: archivos subidos antes de mover el directorio fuera de public.
export const LEGACY_UPLOADS_DIR = path.join(process.cwd(), "public", "uploads");

export interface SavedFile {
  fileName: string;
  // Ruta relativa con prefijo /uploads/ (se usa para derivar el archivo físico
  // en el endpoint; no es una URL pública servible).
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Persiste un archivo subido en UPLOADS_DIR/<subdir> y devuelve los metadatos
 * para crear el registro Attachment.
 */
export async function saveUploadedFile(file: File, subdir: string): Promise<SavedFile> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const dir = path.join(UPLOADS_DIR, subdir);
  await mkdir(dir, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storedName = `${Date.now()}-${safeName}`;
  await writeFile(path.join(dir, storedName), buffer);

  return {
    fileName: file.name,
    fileUrl: `/uploads/${subdir}/${storedName}`,
    fileSize: buffer.length,
    mimeType: file.type || "application/octet-stream",
  };
}

/**
 * Convierte el fileUrl almacenado (ej: "/uploads/comments/<id>/<archivo>") en la
 * ruta física, probando primero la ubicación nueva y luego la heredada.
 * Devuelve null si la ruta es inválida (path traversal) o no existe.
 */
export function resolveAttachmentPaths(fileUrl: string): string[] {
  const rel = fileUrl.replace(/^\/?(api\/)?uploads\//, "");
  // Bloquear path traversal: la ruta normalizada no debe salir del directorio base.
  const normalized = path.normalize(rel);
  if (normalized.startsWith("..") || path.isAbsolute(normalized)) return [];
  return [
    path.join(UPLOADS_DIR, normalized),
    path.join(LEGACY_UPLOADS_DIR, normalized),
  ];
}
