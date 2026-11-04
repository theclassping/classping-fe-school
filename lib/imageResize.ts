// Phone photos are often 3-5 MB; shrink them in the browser before they are
// PUT to the presigned URL so storage and parents' data usage stay small.

export const MAX_IMAGE_EDGE = 1600;
export const IMAGE_QUALITY = 0.82;
// Files already this small and within MAX_IMAGE_EDGE are uploaded untouched.
const SKIP_BELOW_BYTES = 300 * 1024;
// Animated or vector formats would be flattened or rasterised by a canvas.
const PASSTHROUGH_TYPES = new Set(["image/gif", "image/svg+xml"]);

export function fitWithin(width: number, height: number, maxEdge = MAX_IMAGE_EDGE) {
  const longest = Math.max(width, height);
  if (longest <= maxEdge) return { width, height };
  const scale = maxEdge / longest;
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

export function jpegName(name: string) {
  const base = name.replace(/\.[^./\\]+$/, "") || "image";
  return `${base}.jpg`;
}

export function shouldResize(type: string) {
  return type.startsWith("image/") && !PASSTHROUGH_TYPES.has(type);
}

export async function resizeImageForUpload(
  file: File,
  { maxEdge = MAX_IMAGE_EDGE, quality = IMAGE_QUALITY } = {},
): Promise<File> {
  if (!shouldResize(file.type) || typeof createImageBitmap !== "function") return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file; // Formats the browser cannot decode (e.g. HEIC on Chrome) go up as-is.
  }

  try {
    const target = fitWithin(bitmap.width, bitmap.height, maxEdge);
    const needsResize = target.width !== bitmap.width || target.height !== bitmap.height;
    if (!needsResize && file.size <= SKIP_BELOW_BYTES) return file;

    const canvas = document.createElement("canvas");
    canvas.width = target.width;
    canvas.height = target.height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    // JPEG has no alpha channel; paint white so transparent PNGs don't turn black.
    context.fillStyle = "#fff";
    context.fillRect(0, 0, target.width, target.height);
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, target.width, target.height);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    // Flat screenshots can compress better as PNG than JPEG; never upload more bytes than the original.
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], jpegName(file.name), { type: "image/jpeg", lastModified: file.lastModified });
  } finally {
    bitmap.close();
  }
}
