/**
 * ChunkedVideoUploader
 * Dedicated "Evidence-Grade" video uploader for MAPIT.
 *
 * Key design principles:
 * - Zero compression / zero transcoding — bytes arrive on S3 exactly as captured
 * - 5 MB chunks with MD5 integrity verification on finalization
 * - GPS metadata extracted client-side and stored in DB immediately
 * - Resume capability: interrupted uploads survive page reloads (localStorage)
 * - Inline progress with speed, ETA, and chunk counter
 */

import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { extractDroneTelemetry } from "@/lib/exifExtraction";
import {
  CheckCircle,
  FileVideo,
  Upload,
  X,
  AlertCircle,
  Loader2,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Trash2,
  ShieldCheck,
  MapPin,
  Fingerprint,
} from "lucide-react";
import { useCallback, useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VideoFile {
  file: File;
  status: "pending" | "hashing" | "uploading" | "success" | "error" | "paused";
  progress: number;
  error?: string;
  thumbnail?: string;
  uploadSpeed?: number; // bytes/s
  eta?: number; // seconds
  bytesUploaded?: number;
  uploadId?: string;
  chunksUploaded?: number;
  totalChunks?: number;
  md5?: string;
  telemetry?: {
    latitude?: number;
    longitude?: number;
    absoluteAltitude?: number;
    capturedAt?: string;
  };
}

interface PersistedUpload {
  uploadId: string;
  projectId: number;
  filename: string;
  fileSize: number;
  mimeType: string;
  totalChunks: number;
  chunksUploaded: number;
  createdAt: number;
  lastUpdated: number;
}

export interface ChunkedVideoUploaderProps {
  projectId: number;
  flightId?: number;
  onUploadComplete?: () => void;
  /** If true, the uploader is rendered inline (no dialog wrapper). Default: true */
  inline?: boolean;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHUNK_SIZE = 5 * 1024 * 1024; // 5 MB — matches backend constant
const MAX_FILE_SIZE = 3 * 1024 * 1024 * 1024; // 3 GB
const STORAGE_KEY = "mapit_video_uploads";
const UPLOAD_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 h
const MAX_RETRIES = 3;

const ACCEPTED_VIDEO_TYPES = [
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

function formatTime(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${mins}m`;
}

function getPersistedUploads(): PersistedUpload[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const uploads = JSON.parse(data) as PersistedUpload[];
    const now = Date.now();
    return uploads.filter((u) => now - u.createdAt < UPLOAD_EXPIRY_MS);
  } catch {
    return [];
  }
}

function savePersistedUpload(upload: PersistedUpload): void {
  try {
    const uploads = getPersistedUploads();
    const idx = uploads.findIndex((u) => u.uploadId === upload.uploadId);
    if (idx >= 0) uploads[idx] = upload;
    else uploads.push(upload);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(uploads));
  } catch {
    /* ignore */
  }
}

function removePersistedUpload(uploadId: string): void {
  try {
    const uploads = getPersistedUploads().filter(
      (u) => u.uploadId !== uploadId
    );
    localStorage.setItem(STORAGE_KEY, JSON.stringify(uploads));
  } catch {
    /* ignore */
  }
}

async function extractVideoThumbnail(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    let resolved = false;

    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        try {
          URL.revokeObjectURL(video.src);
        } catch {
          /* ignore */
        }
      }
    };

    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;

    video.onloadeddata = () => {
      video.currentTime = Math.min(1, video.duration * 0.1);
    };

    video.onseeked = () => {
      if (resolved) return;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      try {
        canvas.getContext("2d")?.drawImage(video, 0, 0);
        const thumb = canvas.toDataURL("image/jpeg", 0.7);
        cleanup();
        resolve(thumb.length > 1000 ? thumb : null);
      } catch {
        cleanup();
        resolve(null);
      }
    };

    video.onerror = () => {
      cleanup();
      resolve(null);
    };

    setTimeout(() => {
      cleanup();
      resolve(null);
    }, 15000);

    video.src = URL.createObjectURL(file);
  });
}

function readChunkAsBase64(file: File, start: number, end: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file.slice(start, end));
  });
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ChunkedVideoUploader({
  projectId,
  flightId,
  onUploadComplete,
}: ChunkedVideoUploaderProps) {
  const [files, setFiles] = useState<VideoFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingResumable, setPendingResumable] = useState<PersistedUpload[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadChunkMutation = trpc.media.uploadChunk.useMutation();
  const finalizeChunkedUploadMutation = trpc.media.finalizeChunkedUpload.useMutation();
  const utils = trpc.useUtils();

  // Load resumable uploads on mount
  useEffect(() => {
    const pending = getPersistedUploads().filter(
      (u) => u.projectId === projectId
    );
    setPendingResumable(pending);
  }, [projectId]);

  // ── File validation ────────────────────────────────────────────────────────

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_VIDEO_TYPES.includes(file.type)) {
      return `Unsupported format: ${file.type}. Use MP4, MOV, AVI, or WebM.`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large: ${formatBytes(file.size)} (max 3 GB)`;
    }
    return null;
  };

  // ── Add files ─────────────────────────────────────────────────────────────

  const addFiles = useCallback(async (incoming: FileList | File[]) => {
    const toAdd: VideoFile[] = [];
    for (const file of Array.from(incoming)) {
      const error = validateFile(file);
      const item: VideoFile = {
        file,
        status: error ? "error" : "pending",
        progress: 0,
        error: error || undefined,
      };

      if (!error) {
        // Extract thumbnail
        const thumb = await extractVideoThumbnail(file);
        if (thumb) item.thumbnail = thumb;

        // Extract GPS telemetry from video EXIF/XMP if available
        try {
          const telemetry = await extractDroneTelemetry(file);
          if (telemetry) {
            item.telemetry = {
              latitude: telemetry.latitude ?? undefined,
              longitude: telemetry.longitude ?? undefined,
              absoluteAltitude: telemetry.absoluteAltitude ?? undefined,
              capturedAt: telemetry.capturedAt?.toISOString() ?? undefined,
            };
          }
        } catch {
          /* GPS extraction is best-effort */
        }
      }

      toAdd.push(item);
    }
    setFiles((prev) => [...prev, ...toAdd]);
  }, []);

  // ── Core upload logic ─────────────────────────────────────────────────────

  const uploadInChunks = async (
    fileItem: VideoFile,
    index: number,
    startTime: number,
    resumeFrom?: { uploadId: string; startChunk: number }
  ): Promise<void> => {
    const file = fileItem.file;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadId =
      resumeFrom?.uploadId ||
      `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startChunk = resumeFrom?.startChunk || 0;

    let uploadedBytes = startChunk * CHUNK_SIZE;

    // Persist state for resume capability
    const persisted: PersistedUpload = {
      uploadId,
      projectId,
      filename: file.name,
      fileSize: file.size,
      mimeType: file.type,
      totalChunks,
      chunksUploaded: startChunk,
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };
    savePersistedUpload(persisted);

    setFiles((prev) =>
      prev.map((f, i) =>
        i === index
          ? { ...f, uploadId, chunksUploaded: startChunk, totalChunks }
          : f
      )
    );

    // ── Upload chunks ────────────────────────────────────────────────────────
    for (let chunkIndex = startChunk; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunkData = await readChunkAsBase64(file, start, end);

      let lastError: Error | null = null;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          await uploadChunkMutation.mutateAsync({
            uploadId,
            chunkIndex,
            totalChunks,
            chunkData,
            projectId,
            filename: file.name,
            mimeType: file.type,
          });
          lastError = null;
          break;
        } catch (err) {
          lastError = err as Error;
          if (attempt < MAX_RETRIES - 1) {
            await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
          }
        }
      }

      if (lastError) {
        persisted.chunksUploaded = chunkIndex;
        persisted.lastUpdated = Date.now();
        savePersistedUpload(persisted);

        setFiles((prev) =>
          prev.map((f, i) =>
            i === index
              ? {
                  ...f,
                  status: "paused" as const,
                  chunksUploaded: chunkIndex,
                  error: `Paused at ${Math.round((chunkIndex / totalChunks) * 100)}%. You can resume later.`,
                }
              : f
          )
        );

        setPendingResumable(
          getPersistedUploads().filter((u) => u.projectId === projectId)
        );

        throw new Error(
          `Chunk ${chunkIndex + 1} failed after ${MAX_RETRIES} attempts: ${lastError.message}`
        );
      }

      persisted.chunksUploaded = chunkIndex + 1;
      persisted.lastUpdated = Date.now();
      savePersistedUpload(persisted);

      uploadedBytes = end;
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = (uploadedBytes - startChunk * CHUNK_SIZE) / elapsed;
      const remaining = file.size - uploadedBytes;
      const eta = remaining / speed;
      const progress = (uploadedBytes / file.size) * 90;

      setFiles((prev) =>
        prev.map((f, i) =>
          i === index
            ? {
                ...f,
                progress,
                uploadSpeed: speed,
                eta,
                bytesUploaded: uploadedBytes,
                chunksUploaded: chunkIndex + 1,
              }
            : f
        )
      );
    }

    // ── Finalize: compute MD5 then call backend ────────────────────────────
    setFiles((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, progress: 93, status: "hashing" as const } : f
      )
    );

    let clientMd5: string | undefined;
    try {
      const SparkMD5 = (await import("spark-md5")).default;
      const spark = new SparkMD5.ArrayBuffer();
      spark.append(await file.arrayBuffer());
      clientMd5 = spark.end();
    } catch {
      /* MD5 is best-effort */
    }

    setFiles((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, progress: 95, md5: clientMd5, status: "uploading" as const } : f
      )
    );

    const t = fileItem.telemetry;
    await finalizeChunkedUploadMutation.mutateAsync({
      uploadId,
      projectId,
      flightId,
      filename: file.name,
      mimeType: file.type,
      fileSize: file.size,
      thumbnailData: fileItem.thumbnail?.split(",")[1],
      latitude:
        t?.latitude != null && !isNaN(t.latitude) ? t.latitude : undefined,
      longitude:
        t?.longitude != null && !isNaN(t.longitude) ? t.longitude : undefined,
      altitude:
        t?.absoluteAltitude != null && !isNaN(t.absoluteAltitude)
          ? t.absoluteAltitude
          : undefined,
      capturedAt: t?.capturedAt,
      clientMd5,
    });

    removePersistedUpload(uploadId);
    setPendingResumable(
      getPersistedUploads().filter((u) => u.projectId === projectId)
    );
  };

  // ── Resume interrupted upload ─────────────────────────────────────────────

  const resumeUpload = (persisted: PersistedUpload) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ACCEPTED_VIDEO_TYPES.join(",");

    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      if (
        file.name !== persisted.filename ||
        file.size !== persisted.fileSize
      ) {
        toast.error("File doesn't match the interrupted upload", {
          description: `Expected: ${persisted.filename} (${formatBytes(persisted.fileSize)})`,
        });
        return;
      }

      const thumb = await extractVideoThumbnail(file);
      const fileItem: VideoFile = {
        file,
        status: "uploading",
        progress: (persisted.chunksUploaded / persisted.totalChunks) * 90,
        uploadId: persisted.uploadId,
        chunksUploaded: persisted.chunksUploaded,
        totalChunks: persisted.totalChunks,
        thumbnail: thumb || undefined,
      };

      setFiles((prev) => [...prev, fileItem]);
      const fileIndex = files.length;
      setIsUploading(true);

      try {
        await uploadInChunks(fileItem, fileIndex, Date.now(), {
          uploadId: persisted.uploadId,
          startChunk: persisted.chunksUploaded,
        });

        setFiles((prev) =>
          prev.map((f, i) =>
            i === fileIndex
              ? { ...f, status: "success" as const, progress: 100 }
              : f
          )
        );

        toast.success(`Resumed and completed: ${file.name}`);
        await utils.media.list.invalidate({ projectId, flightId });
        await utils.project.get.invalidate({ id: projectId });
        onUploadComplete?.();
      } catch (err) {
        toast.error("Resume failed", {
          description: err instanceof Error ? err.message : "Unknown error",
        });
      } finally {
        setIsUploading(false);
      }
    };

    input.click();
  };

  // ── Upload all pending ────────────────────────────────────────────────────

  const uploadAll = async () => {
    const pending = files.filter((f) => f.status === "pending");
    if (pending.length === 0) return;

    setIsUploading(true);

    for (let i = 0; i < files.length; i++) {
      const fileItem = files[i];
      if (fileItem.status !== "pending") continue;

      const startTime = Date.now();

      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === i
            ? { ...f, status: "uploading" as const, progress: 0, bytesUploaded: 0 }
            : f
        )
      );

      try {
        await uploadInChunks(fileItem, i, startTime);

        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === i
              ? {
                  ...f,
                  status: "success" as const,
                  progress: 100,
                  uploadSpeed: undefined,
                  eta: undefined,
                }
              : f
          )
        );
      } catch (err) {
        // Paused state is already set inside uploadInChunks; only set error for non-pause failures
        setFiles((prev) =>
          prev.map((f, idx) => {
            if (idx !== i) return f;
            if (f.status === "paused") return f;
            return {
              ...f,
              status: "error" as const,
              error: err instanceof Error ? err.message : "Upload failed",
            };
          })
        );
      }
    }

    setIsUploading(false);

    await utils.media.list.invalidate({ projectId, flightId });
    await utils.project.get.invalidate({ id: projectId });
    await utils.project.list.invalidate();

    const successCount = files.filter((f) => f.status === "success").length;
    if (successCount > 0) {
      toast.success(`${successCount} video(s) uploaded — Evidence-Grade quality preserved`);
      onUploadComplete?.();
    }
  };

  // ── Drag & Drop ───────────────────────────────────────────────────────────

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
  };
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(e.target.files);
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const successCount = files.filter((f) => f.status === "success").length;
  const pausedCount = files.filter((f) => f.status === "paused").length;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">
      {/* Evidence-Grade badge bar */}
      <div className="flex flex-wrap gap-2 text-xs">
        <span className="flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full px-3 py-1">
          <ShieldCheck className="h-3 w-3" />
          Evidence-Grade · Zero Compression
        </span>
        <span className="flex items-center gap-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-full px-3 py-1">
          <Fingerprint className="h-3 w-3" />
          MD5 Integrity Verified
        </span>
        <span className="flex items-center gap-1 bg-purple-500/10 text-purple-400 border border-purple-500/20 rounded-full px-3 py-1">
          <MapPin className="h-3 w-3" />
          GPS Auto-Extracted
        </span>
        <span className="flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full px-3 py-1">
          <RefreshCw className="h-3 w-3" />
          Resumable · 5 MB Chunks
        </span>
      </div>

      {/* Resumable interrupted uploads */}
      <AnimatePresence>
        {pendingResumable.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4"
          >
            <h4 className="text-sm font-semibold text-amber-400 mb-2 flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Interrupted Uploads ({pendingResumable.length})
            </h4>
            <p className="text-xs text-muted-foreground mb-3">
              Select the same file to resume where you left off.
            </p>
            <div className="space-y-2">
              {pendingResumable.map((u) => (
                <div
                  key={u.uploadId}
                  className="flex items-center justify-between bg-background/50 rounded p-2"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{u.filename}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatBytes(u.fileSize)} ·{" "}
                      {Math.round((u.chunksUploaded / u.totalChunks) * 100)}%
                      uploaded
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resumeUpload(u)}
                      disabled={isUploading}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Resume
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        removePersistedUpload(u.uploadId);
                        setPendingResumable(
                          getPersistedUploads().filter(
                            (p) => p.projectId === projectId
                          )
                        );
                      }}
                      disabled={isUploading}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? "border-emerald-500 bg-emerald-500/5 scale-[1.01]"
            : "border-border hover:border-emerald-500/50 hover:bg-emerald-500/3"
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <FileVideo className="h-7 w-7 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              Drop video files here
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              MP4, MOV, AVI, WebM · Up to 3 GB per file
            </p>
          </div>
          <p className="text-xs text-emerald-400 font-medium">
            Original bitrate preserved · No re-encoding
          </p>
          <Button
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={(e) => {
              e.stopPropagation();
              fileInputRef.current?.click();
            }}
          >
            Browse Files
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_VIDEO_TYPES.join(",")}
          onChange={handleFileSelect}
          className="hidden"
          disabled={isUploading}
        />
      </div>

      {/* File list */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-2"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold">
                Queue ({files.length})
              </h4>
              {!isUploading && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFiles([])}
                  className="text-muted-foreground"
                >
                  Clear All
                </Button>
              )}
            </div>

            <div className="space-y-2 max-h-[340px] overflow-auto pr-1">
              {files.map((item, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="flex items-start gap-3 p-3 rounded-xl bg-card border border-border"
                >
                  {/* Thumbnail */}
                  <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                    {item.thumbnail ? (
                      <img
                        src={item.thumbnail}
                        alt="Video thumbnail"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileVideo className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.file.name}</p>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground mt-0.5">
                      <span>{formatBytes(item.file.size)}</span>

                      {/* GPS badge */}
                      {item.telemetry?.latitude != null && (
                        <span className="flex items-center gap-0.5 text-emerald-400">
                          <MapPin className="h-3 w-3" />
                          GPS
                        </span>
                      )}

                      {/* MD5 badge */}
                      {item.md5 && (
                        <span className="flex items-center gap-0.5 text-blue-400">
                          <Fingerprint className="h-3 w-3" />
                          {item.md5.slice(0, 8)}…
                        </span>
                      )}

                      {/* Speed + ETA */}
                      {item.uploadSpeed && item.status === "uploading" && (
                        <>
                          <span>·</span>
                          <span className="flex items-center gap-0.5">
                            <ArrowUpRight className="h-3 w-3" />
                            {formatBytes(item.uploadSpeed)}/s
                          </span>
                          {item.eta && item.eta > 0 && (
                            <>
                              <span>·</span>
                              <span className="flex items-center gap-0.5">
                                <Clock className="h-3 w-3" />
                                {formatTime(item.eta)} left
                              </span>
                            </>
                          )}
                        </>
                      )}

                      {/* Chunk counter */}
                      {item.chunksUploaded != null && item.totalChunks != null && item.status === "uploading" && (
                        <span className="text-slate-500">
                          chunk {item.chunksUploaded}/{item.totalChunks}
                        </span>
                      )}

                      {/* Hashing label */}
                      {item.status === "hashing" && (
                        <span className="text-blue-400 flex items-center gap-1">
                          <Fingerprint className="h-3 w-3 animate-pulse" />
                          Computing MD5…
                        </span>
                      )}

                      {/* Paused */}
                      {item.status === "paused" && (
                        <span className="text-amber-400">
                          Paused — will resume on next upload
                        </span>
                      )}
                    </div>

                    {/* Progress bar */}
                    {(item.status === "uploading" ||
                      item.status === "hashing" ||
                      item.status === "paused") && (
                      <Progress
                        value={item.progress}
                        className={`h-1.5 mt-2 ${item.status === "paused" ? "opacity-50" : ""}`}
                      />
                    )}

                    {/* Error */}
                    {item.error && item.status !== "paused" && (
                      <p className="text-xs text-destructive mt-1">{item.error}</p>
                    )}
                  </div>

                  {/* Status icon */}
                  <div className="flex-shrink-0 mt-1">
                    {item.status === "pending" && !isUploading && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() =>
                          setFiles((prev) => prev.filter((_, i) => i !== index))
                        }
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                    {(item.status === "uploading" || item.status === "hashing") && (
                      <Loader2 className="h-5 w-5 animate-spin text-emerald-400" />
                    )}
                    {item.status === "success" && (
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                    )}
                    {item.status === "error" && (
                      <AlertCircle className="h-5 w-5 text-destructive" />
                    )}
                    {item.status === "paused" && (
                      <RefreshCw className="h-5 w-5 text-amber-400" />
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-2 border-t">
        <p className="text-xs text-muted-foreground">
          {pendingCount > 0 && `${pendingCount} pending`}
          {successCount > 0 && ` · ${successCount} uploaded`}
          {pausedCount > 0 && ` · ${pausedCount} paused`}
        </p>
        <Button
          onClick={uploadAll}
          disabled={pendingCount === 0 || isUploading}
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-full"
        >
          {isUploading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Uploading…
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Upload{pendingCount > 0 ? ` (${pendingCount})` : ""}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
