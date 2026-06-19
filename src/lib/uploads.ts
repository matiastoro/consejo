import { writeFile, mkdir } from "fs/promises";
import path from "path";

export interface SavedFile {
  fileName: string;
  fileUrl: string;
  fileSize: number;
  mimeType: string;
}

/**
 * Persists an uploaded file under public/uploads/<subdir> and returns the
 * metadata needed to create an Attachment record.
 */
export async function saveUploadedFile(file: File, subdir: string): Promise<SavedFile> {
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const uploadsDir = path.join(process.cwd(), "public", "uploads", subdir);
  await mkdir(uploadsDir, { recursive: true });

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storedName = `${Date.now()}-${safeName}`;
  await writeFile(path.join(uploadsDir, storedName), buffer);

  return {
    fileName: file.name,
    fileUrl: `/uploads/${subdir}/${storedName}`,
    fileSize: buffer.length,
    mimeType: file.type || "application/octet-stream",
  };
}
