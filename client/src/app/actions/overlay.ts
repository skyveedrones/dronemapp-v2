/**
 * Client-side action for uploading a PDF/image overlay to a project.
 * POSTs multipart form data to POST /api/overlay/upload.
 */
export async function uploadProjectOverlay(
  formData: FormData,
  projectId: number
): Promise<{ success: boolean; overlay?: { id: number; fileUrl: string; coordinates: unknown } }> {
  formData.set("projectId", String(projectId));

  const res = await fetch(`/api/overlay/upload`, {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`Overlay upload failed (${res.status}): ${text}`);
  }

  return res.json();
}
