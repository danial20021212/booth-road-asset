// Shrinks a visitor's photo in the browser before it is sent. Phone photos are several MB,
// which would be slow to upload and slower for the AI; 1600 px on the long side is plenty
// for finding signs and cracks. Always returns a JPEG data URL.
export async function prepareUpload(file, maxSide = 1600) {
  if (!file.type.startsWith("image/")) throw new Error("Not an image");

  // createImageBitmap also applies the phone's rotation (EXIF), so portrait photos come out upright.
  const bitmap = await createImageBitmap(file);

  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  return { dataUrl: canvas.toDataURL("image/jpeg", 0.88), width, height };
}