/**
 * Media Upload Dialog
 * Allows users to upload drone photos and videos with drag-and-drop support
 * Features: detailed progress with speed/ETA, chunked uploads for large files, 
 * auto thumbnail extraction, resumable uploads with localStorage persistence
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { trpc } from "@/lib/trpc";
import { 
  CheckCircle, 
  FileImage, 
  FileVideo, 
  Upload, 
  X, 
  AlertCircle,
  Loader2,
  Clock,
  ArrowUpRight,
  RefreshCw,
  Trash2
} from "lucide-react";
import { useCallback, useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import * as tus from "tus-js-client";
import { compressImage, needsCompression, exceedsLimit, CLOUDINARY_MAX_SIZE } from "@/lib/compression";
import { uploadPhotoToS3, UploadProgress } from "@/lib/photoUpload";
import { extractDroneTelemetry, DroneTelementry } from "@/lib/exifExtraction";
import { getGlobalUploadQueue, UploadTask } from "@/lib/uploadQueue";

interface MediaUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: number;
  flightId?: number;
  onUploadComplete?: () => void;
  mediaList?: any[]; // Optional: pass media list for high-res selection
}

interface FileToUpload {
  file: File;
  status: "pending" | "uploading" | "success" | "error" | "paused";
  progress: number;
  error?: string;
  thumbnail?: string; // base64 thumbnail for videos
  uploadSpeed?: number; // bytes per second
  eta?: number; // seconds remaining
  startTime?: number;
  bytesUploaded?: number;
  uploadId?: string; // For resumable uploads
  chunksUploaded?: number; // Track which chunks have been uploaded
  isH265?: boolean; // Flag for H.265/HEVC videos that may have playback issues
  telemetry?: any; // Extracted EXIF/XMP drone telemetry (GPS, altitude, etc.)
}

// Persisted upload state for resumable uploads
interface PersistedUpload {
  uploadId: string;
  projectId: number;
  filename: string;
  fileSize: number;
  mimeType: string;
  totalChunks: number;
  chunksUploaded: number;
  thumbnailData?: string;
  createdAt: number;
  lastUpdated: number;
}

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",
];

const MAX_FILE_SIZE = 3 * 1024 * 1024 * 1024; // 3GB
const CHUNK_SIZE = 2 * 1024 * 1024; // 2MB chunks for large file uploads
const STORAGE_KEY = "mapit_pending_uploads";
const UPLOAD_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

// Format bytes to human readable
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

// Format seconds to human readable time
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

// LocalStorage helpers for persisted uploads
function getPersistedUploads(): PersistedUpload[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return [];
    const uploads = JSON.parse(data) as PersistedUpload[];
    // Filter out expired uploads
    const now = Date.now();
    return uploads.filter(u => now - u.createdAt < UPLOAD_EXPIRY_MS);
  } catch {
    return [];
  }
}

function savePersistedUpload(upload: PersistedUpload): void {
  try {
    const uploads = getPersistedUploads();
    const existingIndex = uploads.findIndex(u => u.uploadId === upload.uploadId);
    if (existingIndex >= 0) {
      uploads[existingIndex] = upload;
    } else {
      uploads.push(upload);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(uploads));
  } catch (e) {
    console.error("Failed to save upload state:", e);
  }
}

function removePersistedUpload(uploadId: string): void {
  try {
    const uploads = getPersistedUploads();
    const filtered = uploads.filter(u => u.uploadId !== uploadId);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error("Failed to remove upload state:", e);
  }
}

function clearExpiredUploads(): void {
  try {
    const uploads = getPersistedUploads(); // Already filters expired
    localStorage.setItem(STORAGE_KEY, JSON.stringify(uploads));
  } catch (e) {
    console.error("Failed to clear expired uploads:", e);
  }
}

// Detect H.265/HEVC codec in video file
async function detectH265Codec(file: File): Promise<boolean> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    
    // Create a MediaSource to check codec support
    const checkCodec = () => {
      // Check if the video can be played - H.265 often fails or shows green
      // We'll use a heuristic based on file characteristics
      
      // DJI drones typically use H.265 for high bitrate 4K video
      // Check video dimensions and estimate bitrate
      const duration = video.duration;
      const estimatedBitrate = duration > 0 ? (file.size * 8) / duration : 0;
      
      // H.265 is commonly used for:
      // - 4K video (3840x2160 or higher)
      // - High bitrate (>50 Mbps for 4K)
      const is4K = video.videoWidth >= 3840 || video.videoHeight >= 2160;
      const isHighBitrate = estimatedBitrate > 50000000; // 50 Mbps
      
      // Also check if browser reports codec issues
      const canPlay = video.canPlayType('video/mp4; codecs="hvc1"') || 
                      video.canPlayType('video/mp4; codecs="hev1"');
      const hasHEVCSupport = canPlay !== '';
      
      // If it's 4K with high bitrate and browser doesn't fully support HEVC, likely H.265
      // Or check filename patterns from DJI drones
      const filename = file.name.toLowerCase();
      const isDJIVideo = filename.includes('dji_') || filename.includes('_d.mp4');
      
      URL.revokeObjectURL(video.src);
      
      // Heuristic: High bitrate 4K from DJI is almost certainly H.265
      if (is4K && isHighBitrate && isDJIVideo) {
        resolve(true);
        return;
      }
      
      // For other high bitrate 4K videos, warn as well
      if (is4K && isHighBitrate) {
        resolve(true);
        return;
      }
      
      resolve(false);
    };
    
    video.onloadedmetadata = checkCodec;
    
    video.onerror = () => {
      URL.revokeObjectURL(video.src);
      // If video fails to load metadata, it might be H.265
      resolve(false);
    };
    
    // Timeout after 5 seconds
    setTimeout(() => {
      URL.revokeObjectURL(video.src);
      resolve(false);
    }, 5000);
    
    video.src = URL.createObjectURL(file);
  });
}

// Extract thumbnail from video
async function extractVideoThumbnail(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const video = document.createElement("video");
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    let resolved = false;
    
    const cleanup = () => {
      if (!resolved) {
        resolved = true;
        try {
          URL.revokeObjectURL(video.src);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
    
    video.preload = "metadata";
    video.muted = true;
    video.playsInline = true;
    // Allow cross-origin for some video sources
    video.crossOrigin = "anonymous";
    
    video.onloadedmetadata = () => {
      console.log(`[Thumbnail] Video metadata loaded: ${video.videoWidth}x${video.videoHeight}, duration: ${video.duration}s`);
    };
    
    video.onloadeddata = () => {
      // Seek to 1 second or 10% of video, whichever is smaller
      const seekTime = Math.min(1, video.duration * 0.1);
      console.log(`[Thumbnail] Seeking to ${seekTime}s`);
      video.currentTime = seekTime;
    };
    
    video.onseeked = () => {
      if (resolved) return;
      
      console.log(`[Thumbnail] Seeked, capturing frame at ${video.videoWidth}x${video.videoHeight}`);
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      try {
        ctx?.drawImage(video, 0, 0);
        const thumbnail = canvas.toDataURL("image/jpeg", 0.7);
        
        // Check if thumbnail is valid (not empty or too small)
        if (thumbnail && thumbnail.length > 1000) {
          console.log(`[Thumbnail] Successfully extracted thumbnail (${Math.round(thumbnail.length / 1024)}KB)`);
          cleanup();
          resolve(thumbnail);
        } else {
          console.warn(`[Thumbnail] Extracted thumbnail too small or empty`);
          cleanup();
          resolve(null);
        }
      } catch (e) {
        console.error(`[Thumbnail] Error capturing frame:`, e);
        cleanup();
        resolve(null);
      }
    };
    
    video.onerror = (e) => {
      console.error(`[Thumbnail] Video error:`, e);
      cleanup();
      resolve(null);
    };
    
    // Timeout after 15 seconds (increased from 10)
    setTimeout(() => {
      if (!resolved) {
        console.warn(`[Thumbnail] Extraction timed out after 15s`);
        cleanup();
        resolve(null);
      }
    }, 15000);
    
    video.src = URL.createObjectURL(file);
  });
}

export function MediaUploadDialog({
  open,
  onOpenChange,
  projectId,
  flightId,
  onUploadComplete,
  mediaList: propMediaList,
}: MediaUploadDialogProps) {
  const [files, setFiles] = useState<FileToUpload[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingResumable, setPendingResumable] = useState<PersistedUpload[]>([]);
  const [h265WarningOpen, setH265WarningOpen] = useState(false);
  const [h265Files, setH265Files] = useState<string[]>([]);
  const [uploadMode, setUploadMode] = useState<'standard' | 'highres'>('standard');
  const [selectedMediaForHighRes, setSelectedMediaForHighRes] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const uploadMutation = trpc.media.upload.useMutation();
  const uploadChunkMutation = trpc.media.uploadChunk.useMutation();
  const finalizeChunkedUploadMutation = trpc.media.finalizeChunkedUpload.useMutation();
  const finalizePhotoUploadMutation = trpc.media.finalizePhotoUpload.useMutation();
  const uploadHighResMutation = trpc.media.uploadHighResolution.useMutation();
  const utils = trpc.useUtils();

  const { data: mediaList = propMediaList || [] } = trpc.media.list.useQuery(
    { projectId, flightId },
    { enabled: uploadMode === 'highres' }
  );

  const mediaWithoutHighRes = (mediaList || []).filter(m => !m.highResUrl);

  // Load pending resumable uploads on mount
  useEffect(() => {
    clearExpiredUploads();
    const pending = getPersistedUploads().filter(u => u.projectId === projectId);
    setPendingResumable(pending);
  }, [projectId, open]);

  const validateFile = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      return `Invalid file type: ${file.type}`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `File too large: ${formatBytes(file.size)} (max 1GB)`;
    }
    return null;
  };

  const addFiles = useCallback(async (newFiles: FileList | File[]) => {
    const filesToAdd: FileToUpload[] = [];
    
    for (let file of Array.from(newFiles)) {
      console.log(`[Upload DEBUG] File selected: name=${file.name}, type=${file.type}, size=${file.size} bytes`);
      const error = validateFile(file);
      
      // Extract drone telemetry immediately (before any format conversion)
      let telemetry: DroneTelementry | undefined = undefined;
      if (file.type.startsWith("image/")) {
        console.log(`[Upload] Extracting telemetry from: ${file.name}`);
        telemetry = await extractDroneTelemetry(file);
        if (telemetry.latitude && telemetry.longitude) {
          console.log(`[Upload] Telemetry extracted: GPS (${telemetry.latitude.toFixed(6)}, ${telemetry.longitude.toFixed(6)}), Alt: ${telemetry.absoluteAltitude}m`);
        }
      }
      
      // NOTE: Do NOT compress images - preserve EXIF/GPS metadata for mapping accuracy
      // Images uploaded directly to S3 in original HD format
      // This preserves critical drone mapping data (GPS, altitude, camera settings)
      
      // Check file size limits
      let finalError = error;
      // Images: allow up to 1GB (direct S3 upload, no Cloudinary limits)
      // Videos: enforce Cloudinary limits
      if (!error && file.type.startsWith("video/") && exceedsLimit(file)) {
        finalError = `Video too large: ${formatBytes(file.size)}. Max ${formatBytes(CLOUDINARY_MAX_SIZE)}. Please compress externally.`;
      }
      if (!error && file.size > MAX_FILE_SIZE) {
        finalError = `File too large: ${formatBytes(file.size)} (max 1GB)`;
      }
      
      const fileItem: FileToUpload = {
        file,
        status: finalError ? "error" : "pending",
        progress: 0,
        error: finalError || undefined,
        telemetry,
      };
      
      // Check for H.265 codec in video files
      if (!finalError && file.type.startsWith("video/")) {
        const isH265 = await detectH265Codec(file);
        if (isH265) {
          fileItem.isH265 = true;
        }
        
        // Extract thumbnail for all videos (browser will handle memory)
        // Note: H.265 videos may produce green/corrupted thumbnails due to codec issues
        console.log(`[Upload] Extracting thumbnail for video: ${file.name} (${Math.round(file.size / 1024 / 1024)}MB)`);
        const thumbnail = await extractVideoThumbnail(file);
        if (thumbnail) {
          fileItem.thumbnail = thumbnail;
          console.log(`[Upload] Thumbnail extracted successfully for: ${file.name}`);
        } else {
          console.warn(`[Upload] Failed to extract thumbnail for: ${file.name}`);
        }
      }
      
      filesToAdd.push(fileItem);
    }

    setFiles((prev) => [...prev, ...filesToAdd]);
    
    // Show H.265 warning if any videos were detected as H.265
    const h265Detected = filesToAdd.filter(f => f.isH265);
    if (h265Detected.length > 0) {
      setH265Files(h265Detected.map(f => f.file.name));
      setH265WarningOpen(true);
    }
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

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
    if (e.dataTransfer.files) {
      addFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files);
    }
  };

  // Convert file to base64 with progress (for smaller files)
  const fileToBase64WithProgress = (
    file: File, 
    onProgress: (loaded: number, total: number) => void
  ): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress(e.loaded, e.total);
        }
      };
      
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(file);
    });
  };

  // Read a chunk of file as base64
  const readChunkAsBase64 = (file: File, start: number, end: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const chunk = file.slice(start, end);
      const reader = new FileReader();
      
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(",")[1];
        resolve(base64);
      };
      
      reader.onerror = (error) => reject(error);
      reader.readAsDataURL(chunk);
    });
  };

  // Upload large file in chunks with retry logic and persistence
  const uploadInChunks = async (
    fileItem: FileToUpload,
    index: number,
    startTime: number,
    resumeFrom?: { uploadId: string; startChunk: number }
  ): Promise<void> => {
    const file = fileItem.file;
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const uploadId = resumeFrom?.uploadId || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const startChunk = resumeFrom?.startChunk || 0;
    
    let uploadedBytes = startChunk * CHUNK_SIZE;
    const maxRetries = 3;
    
    // Save initial state to localStorage
    const persistedState: PersistedUpload = {
      uploadId,
      projectId,
      filename: file.name,
      fileSize: file.size,
      mimeType: file.type,
      totalChunks,
      chunksUploaded: startChunk,
      thumbnailData: fileItem.thumbnail?.split(",")[1],
      createdAt: Date.now(),
      lastUpdated: Date.now(),
    };
    savePersistedUpload(persistedState);
    
    // Update file item with uploadId
    setFiles((prev) =>
      prev.map((f, idx) =>
        idx === index ? { ...f, uploadId, chunksUploaded: startChunk } : f
      )
    );
    
    for (let chunkIndex = startChunk; chunkIndex < totalChunks; chunkIndex++) {
      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const chunkData = await readChunkAsBase64(file, start, end);
      
      // Retry logic for each chunk
      let lastError: Error | null = null;
      for (let attempt = 0; attempt < maxRetries; attempt++) {
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
          break; // Success, exit retry loop
        } catch (err) {
          lastError = err as Error;
          console.warn(`Chunk ${chunkIndex + 1}/${totalChunks} failed (attempt ${attempt + 1}/${maxRetries}):`, err);
          if (attempt < maxRetries - 1) {
            // Wait before retry (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          }
        }
      }
      
      if (lastError) {
        // Save progress before throwing error so upload can be resumed
        persistedState.chunksUploaded = chunkIndex;
        persistedState.lastUpdated = Date.now();
        savePersistedUpload(persistedState);
        
        // Update UI to show paused state
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === index ? { 
              ...f, 
              status: "paused" as const,
              chunksUploaded: chunkIndex,
              error: `Upload paused at ${Math.round((chunkIndex / totalChunks) * 100)}%. You can resume later.`
            } : f
          )
        );
        
        // Refresh pending resumable list
        setPendingResumable(getPersistedUploads().filter(u => u.projectId === projectId));
        
        throw new Error(`Failed to upload chunk ${chunkIndex + 1} after ${maxRetries} attempts: ${lastError.message}`);
      }
      
      // Update persisted state
      persistedState.chunksUploaded = chunkIndex + 1;
      persistedState.lastUpdated = Date.now();
      savePersistedUpload(persistedState);
      
      uploadedBytes = end;
      const elapsed = (Date.now() - startTime) / 1000;
      const speed = (uploadedBytes - (startChunk * CHUNK_SIZE)) / elapsed;
      const remaining = file.size - uploadedBytes;
      const eta = remaining / speed;
      const progress = (uploadedBytes / file.size) * 90; // 90% for upload
      
      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === index ? { 
            ...f, 
            progress,
            uploadSpeed: speed,
            eta,
            bytesUploaded: uploadedBytes,
            chunksUploaded: chunkIndex + 1
          } : f
        )
      );
    }
    
    // Finalize the upload
    setFiles((prev) =>
      prev.map((f, idx) => (idx === index ? { ...f, progress: 95 } : f))
    );
    
    await finalizeChunkedUploadMutation.mutateAsync({
      uploadId,
      projectId,
      flightId,
      filename: file.name,
      mimeType: file.type,
      fileSize: file.size,
      thumbnailData: fileItem.thumbnail?.split(",")[1],
    });
    
    // Remove from persisted uploads on success
    removePersistedUpload(uploadId);
    setPendingResumable(getPersistedUploads().filter(u => u.projectId === projectId));
  };

  // Resume a paused upload
  const resumeUpload = async (persistedUpload: PersistedUpload) => {
    // User needs to re-select the file
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ACCEPTED_TYPES.join(",");
    
    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      
      if (!file) return;
      
      // Verify file matches
      if (file.name !== persistedUpload.filename || file.size !== persistedUpload.fileSize) {
        toast.error("File doesn't match the interrupted upload", {
          description: `Expected: ${persistedUpload.filename} (${formatBytes(persistedUpload.fileSize)})`
        });
        return;
      }
      
      // Add file to list and start upload
      const fileItem: FileToUpload = {
        file,
        status: "uploading",
        progress: (persistedUpload.chunksUploaded / persistedUpload.totalChunks) * 90,
        uploadId: persistedUpload.uploadId,
        chunksUploaded: persistedUpload.chunksUploaded,
      };
      
      // Extract thumbnail if available
      if (file.type.startsWith("video/") && file.size < 500 * 1024 * 1024) {
        const thumbnail = await extractVideoThumbnail(file);
        if (thumbnail) {
          fileItem.thumbnail = thumbnail;
        }
      }
      
      setFiles((prev) => [...prev, fileItem]);
      const fileIndex = files.length;
      
      setIsUploading(true);
      
      try {
        await uploadInChunks(
          fileItem, 
          fileIndex, 
          Date.now(),
          { uploadId: persistedUpload.uploadId, startChunk: persistedUpload.chunksUploaded }
        );
        
        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === fileIndex ? { 
              ...f, 
              status: "success" as const, 
              progress: 100,
              uploadSpeed: undefined,
              eta: undefined
            } : f
          )
        );
        
        toast.success(`Successfully resumed and completed upload: ${file.name}`);
        
        // Invalidate queries
        if (flightId) {
          await utils.media.list.invalidate({ projectId, flightId });
        } else {
          await utils.media.list.invalidate({ projectId });
        }
        await utils.project.get.invalidate({ id: projectId });
        onUploadComplete?.();
      } catch (error) {
        console.error("Resume upload error:", error);
        toast.error("Failed to resume upload", {
          description: error instanceof Error ? error.message : "Unknown error"
        });
      } finally {
        setIsUploading(false);
      }
    };
    
    input.click();
  };

  // Delete a pending resumable upload
  const deletePendingUpload = (uploadId: string) => {
    removePersistedUpload(uploadId);
    setPendingResumable(getPersistedUploads().filter(u => u.projectId === projectId));
    toast.success("Pending upload removed");
  };

  // Upload photo directly to S3 with chunking (preserves metadata)
  const uploadPhotoDirectToS3 = async (
    fileItem: FileToUpload,
    index: number,
    startTime: number
  ): Promise<void> => {
    const file = fileItem.file;
    
    try {
      // Upload photo directly to S3 with chunking
      console.log(`[Upload DEBUG] Starting photo upload: name=${file.name}, type=${file.type}, size=${file.size}`);
      const result = await uploadPhotoToS3(
        projectId,
        file,
        (progress: UploadProgress) => {
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === index
                ? {
                    ...f,
                    progress: progress.progress,
                    uploadSpeed: progress.uploadSpeed,
                    eta: progress.eta,
                    bytesUploaded: progress.bytesUploaded,
                    chunksUploaded: progress.uploadedChunks,
                  }
                : f
            )
          );
        }
      );

      // Finalize the upload
      console.log(`[Upload DEBUG] Finalizing photo: name=${file.name}, type=${file.type}, s3Key=${result.s3Key}`);
      
      // Filter out NaN and null values from telemetry before sending
      const telemetryPayload: any = {
        uploadId: result.uploadId,
        projectId,
        flightId,
        filename: file.name,
        mimeType: file.type,
        fileSize: file.size,
        s3Key: result.s3Key,
      };
      
      // Only include telemetry fields if they have valid numbers (not NaN, not null)
      if (fileItem.telemetry?.latitude !== null && !isNaN(fileItem.telemetry?.latitude)) {
        telemetryPayload.latitude = fileItem.telemetry.latitude;
      }
      if (fileItem.telemetry?.longitude !== null && !isNaN(fileItem.telemetry?.longitude)) {
        telemetryPayload.longitude = fileItem.telemetry.longitude;
      }
      if (fileItem.telemetry?.absoluteAltitude !== null && !isNaN(fileItem.telemetry?.absoluteAltitude)) {
        telemetryPayload.absoluteAltitude = fileItem.telemetry.absoluteAltitude;
      }
      if (fileItem.telemetry?.relativeAltitude !== null && !isNaN(fileItem.telemetry?.relativeAltitude)) {
        telemetryPayload.relativeAltitude = fileItem.telemetry.relativeAltitude;
      }
      if (fileItem.telemetry?.gimbalPitch !== null && !isNaN(fileItem.telemetry?.gimbalPitch)) {
        telemetryPayload.gimbalPitch = fileItem.telemetry.gimbalPitch;
      }
      if (fileItem.telemetry?.capturedAt) {
        telemetryPayload.capturedAt = fileItem.telemetry.capturedAt;
      }
      
      console.log(`[Upload DEBUG] Telemetry payload:`, telemetryPayload);
      await finalizePhotoUploadMutation.mutateAsync(telemetryPayload);
      console.log(`[Upload DEBUG] Finalize complete`);

      // Mark as success
      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === index ? { ...f, status: "success", progress: 100 } : f
        )
      );

      console.log(`[Upload DEBUG] Upload success for: ${file.name}`);
      toast.success(`${file.name} uploaded successfully with metadata preserved`);
    } catch (error) {
      console.error("[Photo Upload] Error:", error);
      console.log(`[Upload DEBUG] Upload failed for: ${file.name}, error:`, error);
      const errorMessage = error instanceof Error ? error.message : "Upload failed";
      console.log(`[Upload DEBUG] Setting error status: ${errorMessage}`);
      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === index ? { ...f, status: "error", error: errorMessage } : f
        )
      );
      toast.error(`Failed to upload ${file.name}: ${errorMessage}`);
    }
  };

  // Upload photo using chunked upload (for large files)
  // Upload video using TUS protocol for better reliability
  const uploadVideoWithTus = async (
    fileItem: FileToUpload,
    index: number,
    startTime: number
  ): Promise<{ url: string }> => {
    return new Promise((resolve, reject) => {
      const file = fileItem.file;
      
      const upload = new tus.Upload(file, {
        endpoint: "/api/video-upload",
        retryDelays: [0, 1000, 3000, 5000, 10000],
        chunkSize: 5 * 1024 * 1024, // 5MB chunks
        metadata: {
          filename: file.name,
          filetype: file.type,
          projectId: projectId.toString(),
        },
        onError: (error) => {
          console.error("TUS upload error:", error);
          reject(error);
        },
        onProgress: (bytesUploaded, bytesTotal) => {
          const elapsed = (Date.now() - startTime) / 1000;
          const speed = bytesUploaded / elapsed;
          const remaining = bytesTotal - bytesUploaded;
          const eta = remaining / speed;
          const progress = (bytesUploaded / bytesTotal) * 90; // 90% for upload
          
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === index ? { 
                ...f, 
                progress,
                uploadSpeed: speed,
                eta,
                bytesUploaded
              } : f
            )
          );
        },
        onSuccess: async () => {
          try {
            // Get the upload URL from the TUS upload
            const uploadUrl = upload.url;
            if (!uploadUrl) {
              throw new Error("No upload URL returned");
            }
            
            // Extract upload ID from URL
            const uploadId = uploadUrl.split("/").pop();
            
            // Get metadata from server
            const response = await fetch(`/api/video-upload-metadata/${uploadId}`);
            if (!response.ok) {
              throw new Error("Failed to get upload metadata");
            }
            
            const metadata = await response.json();
            
            // Create media record in database
            setFiles((prev) =>
              prev.map((f, idx) => (idx === index ? { ...f, progress: 95 } : f))
            );
            
            // Log thumbnail status for debugging
            console.log(`[TUS] Creating media record for: ${file.name}`);
            console.log(`[TUS] Thumbnail available: ${!!fileItem.thumbnail}`);
            if (fileItem.thumbnail) {
              console.log(`[TUS] Thumbnail size: ${Math.round(fileItem.thumbnail.length / 1024)}KB`);
            }
            
            await createMediaMutation.mutateAsync({
              projectId,
              filename: file.name,
              mimeType: file.type,
              fileUrl: metadata.finalUrl,
              fileSize: file.size,
              thumbnailUrl: fileItem.thumbnail ? undefined : null,
              thumbnailData: fileItem.thumbnail?.split(",")[1],
            });
            
            resolve({ url: metadata.finalUrl });
          } catch (err) {
            reject(err);
          }
        },
      });
      
      // Check for previous uploads to resume
      upload.findPreviousUploads().then((previousUploads) => {
        if (previousUploads.length > 0) {
          upload.resumeFromPreviousUpload(previousUploads[0]);
        }
        upload.start();
      });
    });
  };

  // Mutation to create media record after TUS upload
  const createMediaMutation = trpc.media.createFromUrl.useMutation();

  const uploadFiles = async () => {
    // Handle high-resolution upload mode
    if (uploadMode === 'highres' && selectedMediaForHighRes) {
      const pendingFiles = files.filter((f) => f.status === "pending");
      if (pendingFiles.length === 0) {
        toast.error("Please select a file to upload");
        return;
      }

      setIsUploading(true);
      const fileItem = pendingFiles[0];
      const startTime = Date.now();
      const index = files.indexOf(fileItem);

      setFiles((prev) =>
        prev.map((f, idx) =>
          idx === index ? { 
            ...f, 
            status: "uploading" as const, 
            progress: 0,
            startTime,
            bytesUploaded: 0
          } : f
        )
      );

      try {
        const base64Data = await fileToBase64WithProgress(
          fileItem.file,
          (loaded, total) => {
            const elapsed = (Date.now() - startTime) / 1000;
            const speed = loaded / elapsed;
            const remaining = total - loaded;
            const eta = remaining / speed;
            const progress = (loaded / total) * 50;
            
            setFiles((prev) =>
              prev.map((f, idx) =>
                idx === index ? { 
                  ...f, 
                  progress,
                  uploadSpeed: speed,
                  eta,
                  bytesUploaded: loaded
                } : f
              )
            );
          }
        );

        setFiles((prev) =>
          prev.map((f, idx) => (idx === index ? { ...f, progress: 60 } : f))
        );

        await uploadHighResMutation.mutateAsync({
          mediaId: selectedMediaForHighRes,
          filename: fileItem.file.name,
          mimeType: fileItem.file.type,
          fileData: base64Data,
        });

        setFiles((prev) =>
          prev.map((f, idx) =>
            idx === index ? { 
              ...f, 
              status: "success" as const, 
              progress: 100,
              uploadSpeed: undefined,
              eta: undefined
            } : f
          )
        );

        toast.success("High-resolution file uploaded successfully");
        await utils.media.get.invalidate({ id: selectedMediaForHighRes });
        await utils.media.list.invalidate({ projectId });
        
        setUploadMode('standard');
        setSelectedMediaForHighRes(null);
        setFiles([]);
        onUploadComplete?.();
      } catch (error) {
        console.error("High-res upload error:", error);
        setFiles((prev) =>
          prev.map((f, idx) => (
            idx === index ? {
              ...f,
              status: "error" as const,
              error: error instanceof Error ? error.message : "Upload failed",
              uploadSpeed: undefined,
              eta: undefined
            } : f
          ))
        );
      }

      setIsUploading(false);
      return;
    }

    // Standard upload mode - use queue to limit concurrent uploads
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    abortControllerRef.current = new AbortController();

    // Get upload queue with max 5 concurrent uploads to prevent DB connection pool exhaustion
    const uploadQueue = getGlobalUploadQueue({ maxConcurrent: 5 });
    uploadQueue.reset(); // Clear any previous uploads

    // Create upload tasks for all pending files
    const uploadTasks: UploadTask<void>[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const fileItem = files[i];
      if (fileItem.status !== "pending") continue;

      const startTime = Date.now();
      const fileIndex = i; // Capture index for closure

      const task: UploadTask<void> = {
        id: `${projectId}-${fileItem.file.name}-${i}`,
        execute: async () => {
          // Mark as uploading
          setFiles((prev) =>
            prev.map((f, idx) =>
              idx === fileIndex ? { 
                ...f, 
                status: "uploading" as const, 
                progress: 0,
                startTime,
                bytesUploaded: 0
              } : f
            )
          );

          try {
            // Use TUS for video uploads, direct-to-S3 for photos
            const isVideo = fileItem.file.type.startsWith("video/");
            const isPhoto = fileItem.file.type.startsWith("image/");
            
            if (isVideo) {
              // Video: use TUS protocol for better reliability and resumability
              await uploadVideoWithTus(fileItem, fileIndex, startTime);
            } else if (isPhoto) {
              // Photo: use direct-to-S3 chunked upload to preserve metadata
              await uploadPhotoDirectToS3(fileItem, fileIndex, startTime);
            } else {
              // Other file types: use base64 upload
              const base64Data = await fileToBase64WithProgress(
                fileItem.file,
                (loaded, total) => {
                  const elapsed = (Date.now() - startTime) / 1000;
                  const speed = loaded / elapsed;
                  const remaining = total - loaded;
                  const eta = remaining / speed;
                  const progress = (loaded / total) * 50; // First 50% is reading
                  
                  setFiles((prev) =>
                    prev.map((f, idx) =>
                      idx === fileIndex ? { 
                        ...f, 
                        progress,
                        uploadSpeed: speed,
                        eta,
                        bytesUploaded: loaded
                      } : f
                    )
                  );
                }
              );

              setFiles((prev) =>
                prev.map((f, idx) => (idx === fileIndex ? { ...f, progress: 60 } : f))
              );

              await uploadMutation.mutateAsync({
                projectId,
                flightId,
                filename: fileItem.file.name,
                mimeType: fileItem.file.type,
                fileData: base64Data,
                thumbnailData: fileItem.thumbnail?.split(",")[1],
              });
            }

            // Mark as success
            setFiles((prev) =>
              prev.map((f, idx) =>
                idx === fileIndex ? { 
                  ...f, 
                  status: "success" as const, 
                  progress: 100,
                  uploadSpeed: undefined,
                  eta: undefined
                } : f
              )
            );
          } catch (error) {
            console.error("Upload error:", error);
            // Mark as error (chunked uploads will be marked as paused instead)
            setFiles((prev) =>
              prev.map((f, idx) => {
                if (idx !== fileIndex) return f;
                // If it's already paused (from chunked upload), keep that state
                if (f.status === "paused") return f;
                return {
                  ...f,
                  status: "error" as const,
                  error: error instanceof Error ? error.message : "Upload failed",
                  uploadSpeed: undefined,
                  eta: undefined
                };
              })
            );
            throw error; // Re-throw to mark task as failed in queue
          }
        },
      };

      uploadTasks.push(task);
    }

    // Execute all tasks with concurrency control
    try {
      await uploadQueue.addTasks(uploadTasks);
    } catch (error) {
      console.error("Queue error:", error);
      // Errors are already handled per-task, just log the queue error
    }

    setIsUploading(false);
    abortControllerRef.current = null;

    // Invalidate queries to refresh data
    if (flightId) {
      await utils.media.list.invalidate({ projectId, flightId });
    } else {
      await utils.media.list.invalidate({ projectId });
    }
    await utils.project.get.invalidate({ id: projectId });
    await utils.project.list.invalidate();

    // Check if all uploads succeeded
    const successCount = files.filter((f) => f.status === "success").length;
    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} file(s)`);
      onUploadComplete?.();
    }
  };

  const handleClose = () => {
    if (!isUploading) {
      setFiles([]);
      onOpenChange(false);
    }
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const successCount = files.filter((f) => f.status === "success").length;
  const errorCount = files.filter((f) => f.status === "error").length;
  const pausedCount = files.filter((f) => f.status === "paused").length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload Media</DialogTitle>
          <DialogDescription>
            {uploadMode === 'standard' 
              ? 'Upload drone photos and videos. GPS data extracted automatically.'
              : 'Upload high-resolution version of existing media to preserve original quality'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 border-b">
          <button
            onClick={() => {
              setUploadMode('standard');
              setFiles([]);
              setSelectedMediaForHighRes(null);
            }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${uploadMode === 'standard' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Standard Upload
          </button>
          <button
            onClick={() => {
              setUploadMode('highres');
              setFiles([]);
            }}
            className={`px-4 py-2 text-sm font-medium transition-colors ${uploadMode === 'highres' ? 'border-b-2 border-primary text-primary' : 'text-muted-foreground hover:text-foreground'}`}
          >
            High-Resolution Upload
          </button>
        </div>

        {/* High-Resolution Media Selector */}
        {uploadMode === 'highres' && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">Select Media for High-Resolution Upload</h4>
            <p className="text-xs text-muted-foreground mb-3">Choose which media item to upload the high-resolution version for</p>
            {mediaWithoutHighRes.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">All media items already have high-resolution versions</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {mediaWithoutHighRes.map((media) => (
                  <label key={media.id} className="flex items-center gap-3 p-2 rounded hover:bg-blue-500/5 cursor-pointer">
                    <input
                      type="radio"
                      name="media-selection"
                      value={media.id}
                      checked={selectedMediaForHighRes === media.id}
                      onChange={(e) => setSelectedMediaForHighRes(parseInt(e.target.value))}
                      className="w-4 h-4"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{media.filename}</p>
                      <p className="text-xs text-muted-foreground">{media.mediaType === 'video' ? '🎬 Video' : '📷 Photo'}</p>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="flex-1 overflow-auto space-y-4">
          {/* Pending Resumable Uploads */}
          {pendingResumable.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <h4 className="text-sm font-medium text-amber-600 dark:text-amber-400 mb-2 flex items-center gap-2">
                <RefreshCw className="h-4 w-4" />
                Interrupted Uploads ({pendingResumable.length})
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                These uploads were interrupted. Select the same file to resume.
              </p>
              <div className="space-y-2">
                {pendingResumable.map((upload) => (
                  <div 
                    key={upload.uploadId}
                    className="flex items-center justify-between bg-background/50 rounded p-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{upload.filename}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBytes(upload.fileSize)} • {Math.round((upload.chunksUploaded / upload.totalChunks) * 100)}% uploaded
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => resumeUpload(upload)}
                        disabled={isUploading}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Resume
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={() => deletePendingUpload(upload.uploadId)}
                        disabled={isUploading}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Drop Zone */}
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              isDragging
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-10 w-10 mx-auto mb-4 text-muted-foreground" />
            <p className="text-sm text-muted-foreground mb-2">
              Drag and drop files here, or click to browse
            </p>
            <p className="text-xs text-muted-foreground mb-4">
              Supports JPEG, PNG, WebP, HEIC images and MP4, MOV, AVI, WebM videos<br />
              <span className="text-primary">Images are automatically compressed if needed (10MB upload limit)</span>
            </p>
            <input
              type="file"
              multiple
              accept={ACCEPTED_TYPES.join(",")}
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
              disabled={isUploading}
            />
            <label htmlFor="file-upload">
              <Button variant="outline" asChild disabled={isUploading}>
                <span>Browse Files</span>
              </Button>
            </label>
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">
                  Files ({files.length})
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

              <div className="space-y-2 max-h-[300px] overflow-auto">
                {files.map((fileItem, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 rounded-lg bg-card border border-border"
                  >
                    {/* Thumbnail or Icon */}
                    <div className="w-12 h-12 rounded bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {fileItem.thumbnail ? (
                        <img 
                          src={fileItem.thumbnail} 
                          alt="Video thumbnail" 
                          className="w-full h-full object-cover"
                        />
                      ) : fileItem.file.type.startsWith("image/") ? (
                        <FileImage className="h-6 w-6 text-muted-foreground" />
                      ) : (
                        <FileVideo className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>

                    {/* File Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {fileItem.file.name}
                      </p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatBytes(fileItem.file.size)}</span>
                        {fileItem.file.size > 50 * 1024 * 1024 && (
                          <span className="text-blue-500">(Resumable)</span>
                        )}
                        {fileItem.isH265 && (
                          <span className="text-amber-500 font-medium">(H.265 - may not play in browser)</span>
                        )}
                        {fileItem.uploadSpeed && fileItem.status === "uploading" && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <ArrowUpRight className="h-3 w-3" />
                              {formatBytes(fileItem.uploadSpeed)}/s
                            </span>
                            {fileItem.eta && fileItem.eta > 0 && (
                              <>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {formatTime(fileItem.eta)} left
                                </span>
                              </>
                            )}
                          </>
                        )}
                        {fileItem.status === "paused" && fileItem.chunksUploaded && (
                          <span className="text-amber-500">
                            Paused at {Math.round((fileItem.chunksUploaded / Math.ceil(fileItem.file.size / CHUNK_SIZE)) * 100)}%
                          </span>
                        )}
                      </div>

                      {/* Progress Bar */}
                      {(fileItem.status === "uploading" || fileItem.status === "paused") && (
                        <Progress 
                          value={fileItem.progress} 
                          className={`h-1 mt-2 ${fileItem.status === "paused" ? "opacity-50" : ""}`} 
                        />
                      )}

                      {/* Error Message */}
                      {fileItem.error && (
                        <p className="text-xs text-destructive mt-1">
                          {fileItem.error}
                        </p>
                      )}
                    </div>

                    {/* Status Icon */}
                    <div className="flex-shrink-0">
                      {fileItem.status === "pending" && !isUploading && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => removeFile(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                      {fileItem.status === "uploading" && (
                        <Loader2 className="h-5 w-5 animate-spin text-primary" />
                      )}
                      {fileItem.status === "success" && (
                        <CheckCircle className="h-5 w-5 text-green-500" />
                      )}
                      {fileItem.status === "error" && (
                        <AlertCircle className="h-5 w-5 text-destructive" />
                      )}
                      {fileItem.status === "paused" && (
                        <RefreshCw className="h-5 w-5 text-amber-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {pendingCount > 0 && `${pendingCount} pending`}
            {successCount > 0 && ` • ${successCount} uploaded`}
            {errorCount > 0 && ` • ${errorCount} failed`}
            {pausedCount > 0 && ` • ${pausedCount} paused`}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleClose} disabled={isUploading}>
              {isUploading ? "Uploading..." : "Close"}
            </Button>
            <Button
              onClick={uploadFiles}
              disabled={pendingCount === 0 || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload {pendingCount > 0 ? `(${pendingCount})` : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* H.265 Warning Dialog */}
      <Dialog open={h265WarningOpen} onOpenChange={setH265WarningOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-500">
              <AlertCircle className="h-5 w-5" />
              H.265/HEVC Video Detected
            </DialogTitle>
            <DialogDescription>
              The following video(s) appear to be encoded in H.265/HEVC format, which may not play correctly in web browsers:
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-lg max-h-32 overflow-y-auto">
              <ul className="text-sm space-y-1">
                {h265Files.map((filename, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <FileVideo className="h-4 w-4 text-muted-foreground" />
                    <span className="truncate">{filename}</span>
                  </li>
                ))}
              </ul>
            </div>
            
            <div className="bg-blue-500/10 border border-blue-500/20 p-4 rounded-lg">
              <h4 className="font-medium text-blue-400 mb-2">Recommended: Convert to H.264</h4>
              <p className="text-sm text-muted-foreground mb-3">
                For best browser compatibility, convert your videos to H.264 format using <strong>HandBrake</strong> (free software):
              </p>
              <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Download HandBrake from <a href="https://handbrake.fr" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">handbrake.fr</a></li>
                <li>Open your video file in HandBrake</li>
                <li>Select "Fast 1080p30" or "Fast 2160p60 4K" preset</li>
                <li>Ensure Video Codec is set to "H.264 (x264)"</li>
                <li>Click "Start Encode" and upload the converted file</li>
              </ol>
            </div>
            
            <div className="text-sm text-muted-foreground">
              <strong>Tip:</strong> On your DJI drone, you can change the video codec from H.265 to H.264 in the camera settings to avoid this issue for future recordings.
            </div>
          </div>
          
          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                // Remove H.265 files from the upload list
                setFiles(prev => prev.filter(f => !f.isH265));
                setH265WarningOpen(false);
              }}
            >
              Remove & Convert First
            </Button>
            <Button
              variant="secondary"
              onClick={() => setH265WarningOpen(false)}
            >
              Upload Anyway
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
