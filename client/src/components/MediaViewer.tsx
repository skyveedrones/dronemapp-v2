import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, X, ZoomIn, ZoomOut } from "lucide-react";
import { toast } from "sonner";

interface MediaViewerProps {
  isOpen: boolean;
  onClose: () => void;
  media: {
    id: number;
    filename: string;
    url: string;
    thumbnailUrl?: string;
    highResUrl?: string;
    highResFileSize?: number;
    originalWidth?: number;
    originalHeight?: number;
    mediaType: "photo" | "video";
    capturedAt?: Date;
    cameraMake?: string;
    cameraModel?: string;
    altitude?: number;
    latitude?: number;
    longitude?: number;
  };
}

export function MediaViewer({ isOpen, onClose, media }: MediaViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadHighRes = async () => {
    if (!media.highResUrl) {
      toast.error("High-resolution version not available");
      return;
    }

    try {
      setIsDownloading(true);
      const response = await fetch(media.highResUrl);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = media.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Download started");
    } catch (error) {
      toast.error("Failed to download file");
      console.error(error);
    } finally {
      setIsDownloading(false);
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown";
    const mb = bytes / (1024 * 1024);
    return mb > 1 ? `${mb.toFixed(2)} MB` : `${(bytes / 1024).toFixed(2)} KB`;
  };

  const formatDate = (date?: Date) => {
    if (!date) return "Unknown";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{media.filename}</span>
            <button
              onClick={onClose}
              className="p-1 hover:bg-muted rounded-md transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Media Display */}
          <div className="bg-muted rounded-lg overflow-hidden flex items-center justify-center min-h-[400px]">
            {media.mediaType === "photo" ? (
              <img
                src={media.url}
                alt={media.filename}
                className="max-w-full max-h-[500px] object-contain"
                style={{ transform: `scale(${zoom})` }}
              />
            ) : (
              <video
                src={media.url}
                controls
                className="max-w-full max-h-[500px] object-contain"
              />
            )}
          </div>

          {/* Zoom Controls (for photos only) */}
          {media.mediaType === "photo" && (
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              >
                <ZoomOut className="w-4 h-4" />
              </Button>
              <span className="px-4 py-2 text-sm text-muted-foreground">
                {Math.round(zoom * 100)}%
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setZoom(Math.min(3, zoom + 0.1))}
              >
                <ZoomIn className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Metadata */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            {media.originalWidth && media.originalHeight && (
              <div>
                <p className="text-muted-foreground">Resolution</p>
                <p className="font-medium">
                  {media.originalWidth} × {media.originalHeight}
                </p>
              </div>
            )}
            {media.capturedAt && (
              <div>
                <p className="text-muted-foreground">Captured</p>
                <p className="font-medium">{formatDate(media.capturedAt)}</p>
              </div>
            )}
            {media.cameraMake && (
              <div>
                <p className="text-muted-foreground">Camera</p>
                <p className="font-medium">
                  {media.cameraMake}
                  {media.cameraModel ? ` ${media.cameraModel}` : ""}
                </p>
              </div>
            )}
            {media.altitude && (
              <div>
                <p className="text-muted-foreground">Altitude</p>
                <p className="font-medium">{parseFloat(media.altitude.toString()).toFixed(1)} m</p>
              </div>
            )}
            {media.latitude && media.longitude && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Location</p>
                <p className="font-medium">
                  {parseFloat(media.latitude.toString()).toFixed(6)}, {parseFloat(media.longitude.toString()).toFixed(6)}
                </p>
              </div>
            )}
          </div>

          {/* Download Section */}
          {media.highResUrl && (
            <div className="bg-muted p-4 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">High-Resolution Download</p>
                  <p className="text-sm text-muted-foreground">
                    {formatFileSize(media.highResFileSize)}
                  </p>
                </div>
                <Button
                  onClick={handleDownloadHighRes}
                  disabled={isDownloading}
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  {isDownloading ? "Downloading..." : "Download"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Download the original high-resolution version of this image for professional use, printing, or archival.
              </p>
            </div>
          )}

          {/* Close Button */}
          <Button onClick={onClose} variant="outline" className="w-full">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
