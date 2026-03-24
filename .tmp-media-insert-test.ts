import { createMedia } from "./server/db";

(async () => {
  try {
    const res = await createMedia({
      projectId: 1020001,
      userId: 1,
      filename: "Gail Wilson Ext North Image.JPG",
      fileKey: "dp1fvan1x/image/upload/v1773977640/qrflrgrvvzxbzthenbpp.jpg",
      url: "https://res.cloudinary.com/dp1fvan1x/image/upload/v1773977640/qrflrgrvvzxbzthenbpp.jpg",
      mimeType: "image/jpeg",
      fileSize: 5173530,
      mediaType: "photo",
      latitude: "32.77395661111111",
      longitude: "-96.46902105555556",
      altitude: "116.257",
      capturedAt: new Date("2025-12-15T20:47:56.000Z"),
      cameraMake: "DJI",
      cameraModel: "FC9113",
      thumbnailUrl: null,
    } as any);
    console.log("INSERT_OK", res?.id);
  } catch (e: any) {
    console.error("INSERT_ERR_NAME", e?.name);
    console.error("INSERT_ERR_MSG", e?.message);
    console.error("INSERT_ERR_CAUSE", e?.cause?.message || e?.cause?.sqlMessage || e?.cause);
    console.error("INSERT_ERR_SQLSTATE", e?.cause?.sqlState);
    console.error("INSERT_ERR_CODE", e?.cause?.code);
  }
})();
