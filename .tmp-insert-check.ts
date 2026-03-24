import { createMedia } from "./server/db";

(async () => {
  try {
    const res = await createMedia({
      projectId: 1020001,
      userId: 1,
      filename: "insert-check.jpg",
      fileKey: "dev/insert-check.jpg",
      url: "https://example.com/insert-check.jpg",
      mimeType: "image/jpeg",
      fileSize: 12345,
      mediaType: "image",
      latitude: null,
      longitude: null,
      altitude: null,
      capturedAt: null,
      cameraMake: null,
      cameraModel: null,
      thumbnailUrl: null,
    } as any);
    console.log("INSERT_OK", res?.id);
  } catch (e: any) {
    console.error("INSERT_ERR", e?.cause?.sqlMessage || e?.message || e);
    process.exitCode = 1;
  }
})();
