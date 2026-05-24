export async function uploadToCloudinary(file: File): Promise<string> {
  const url = `https://api.cloudinary.com/v1_1/dfyiv2esq/upload`;
  const form = new FormData();
  form.append("upload_preset", "committee_uploads"); // updated preset
  form.append("file", file);

  const response = await fetch(url, { method: "POST", body: form });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error?.message ?? "Cloudinary upload failed");
  return data.secure_url;
}
