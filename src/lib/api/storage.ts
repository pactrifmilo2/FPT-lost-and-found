import { supabase } from "../supabase";
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const extensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
export function validateImage(file: Pick<File, "size" | "type">) {
  if (!extensions[file.type])
    throw new Error("Chỉ chấp nhận ảnh JPEG, PNG hoặc WebP.");
  if (file.size > MAX_IMAGE_BYTES)
    throw new Error("Ảnh phải có dung lượng tối đa 5 MB.");
  if (file.size === 0) throw new Error("Tệp ảnh trống.");
}
export async function uploadImage(
  userId: string,
  reportId: string,
  file: File,
) {
  validateImage(file);
  const path = `${userId}/${reportId}/${crypto.randomUUID()}.${extensions[file.type]}`;
  const { error } = await supabase.storage
    .from("item-images")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) throw error;
  return path;
}
export async function removeImage(path?: string | null) {
  if (!path) return;
  const { error } = await supabase.storage.from("item-images").remove([path]);
  if (error) throw error;
}
export async function signImage(path: string) {
  const { data, error } = await supabase.storage
    .from("item-images")
    .createSignedUrl(path, 600);
  if (error) throw error;
  return data.signedUrl;
}
export async function cleanupImage(path?: string | null) {
  try {
    await removeImage(path);
  } catch {
    /* Best-effort orphan cleanup; report saves remain successful. */
  }
}
