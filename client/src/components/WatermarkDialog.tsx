/**
 * Watermark Dialog Component
 * Allows users to apply watermarks permanently to selected images and videos
 * - Supports uploading new watermark or using saved watermark
 * - Permanently applies watermarks to stored images/videos and thumbnails in S3
 * - Default position: upper-left corner
 * - Live preview showing how watermark will look on sample image
 * - Video watermarking uses FFmpeg for processing
 */

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { trpc } from "@/lib/trpc";
import { Media } from "../../../drizzle/schema";
import {
  ImagePlus,
  Loader2,
  Upload,
  X,
  CheckCircle,
  AlertCircle,
  Trash2,
  Video,
  Image,
} from "lucide-react";
import { useCallback, useState, useEffect, useMemo, useRef } from "react";
import { toast } from "sonner";

interface WatermarkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMedia: Media[];
  projectId: number;
  onWatermarkApplied?: () => void;
  isDemoProject?: boolean;
}

type Position = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "center";

// Position CSS classes for watermark overlay
const positionStyles: Record<Position, string> = {
  "top-left": "top-2 left-2",
  "top-right": "top-2 right-2",
  "bottom-left": "bottom-2 left-2",
  "bottom-right": "bottom-2 right-2",
  "center": "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
};

export function WatermarkDialog({
  open,
  onOpenChange,
  selectedMedia,
  projectId,
  onWatermarkApplied,
  isDemoProject = false,
}: WatermarkDialogProps) {
  const [watermarkFile, setWatermarkFile] = useState<File | null>(null);
  const [watermarkPreview, setWatermarkPreview] = useState<string | null>(null);
  const [position, setPosition] = useState<Position>("top-left");
  const [opacity, setOpacity] = useState(70);
  const [scale, setScale] = useState(15);
  const [isProcessing, setIsProcessing] = useState(false);
  const [useSavedWatermark, setUseSavedWatermark] = useState(false);
  const [saveWatermarkForFuture, setSaveWatermarkForFuture] = useState(false);
  const [results, setResults] = useState<{ mediaId: number; success: boolean; error?: string; type: "photo" | "video" }[]>([]);
  const [showPreview, setShowPreview] = useState(true);
  const [currentProcessing, setCurrentProcessing] = useState<string | null>(null);
  const [videoProgress, setVideoProgress] = useState(0);
  const previewContainerRef = useRef<HTMLDivElement>(null);

  // Fetch saved watermark
  const { data: savedWatermark, refetch: refetchSavedWatermark } = trpc.watermark.getSavedWatermark.useQuery(
    undefined,
    { enabled: open }
  );

  const applyPermanentMutation = trpc.watermark.applyPermanent.useMutation();
  const applyVideoWatermarkMutation = trpc.watermark.applyVideoWatermark.useMutation();
  const saveWatermarkMutation = trpc.watermark.saveWatermark.useMutation();
  const deleteWatermarkMutation = trpc.watermark.deleteWatermark.useMutation();

  // Get sample image for preview (first photo from selection)
  const sampleImage = useMemo(() => {
    const photos = selectedMedia.filter(m => m.mediaType === "photo");
    return photos.length > 0 ? photos[0] : null;
  }, [selectedMedia]);

  // Reset to use saved watermark if available
  useEffect(() => {
    if (open && savedWatermark?.watermarkUrl) {
      setUseSavedWatermark(true);
      setWatermarkPreview(savedWatermark.watermarkUrl);
    }
  }, [open, savedWatermark]);

  // Handle watermark file upload
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG recommended for transparency)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Watermark image must be less than 5MB");
      return;
    }

    setWatermarkFile(file);
    setUseSavedWatermark(false);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setWatermarkPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Apply watermark permanently to selected images and videos
  const handleApplyWatermark = async () => {
    if (!useSavedWatermark && !watermarkFile) {
      toast.error("Please upload a watermark or use your saved watermark");
      return;
    }

    if (selectedMedia.length === 0) {
      toast.error("Please select media to watermark");
      return;
    }

    // Separate photos and videos
    const photos = selectedMedia.filter(m => m.mediaType === "photo");
    const videos = selectedMedia.filter(m => m.mediaType === "video");

    if (photos.length === 0 && videos.length === 0) {
      toast.error("No photos or videos selected for watermarking.");
      return;
    }

    setIsProcessing(true);
    setResults([]);
    setVideoProgress(0);

    try {
      let watermarkBase64: string | undefined;

      // If using a new watermark file, convert to base64
      if (!useSavedWatermark && watermarkFile) {
        watermarkBase64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(",")[1];
            resolve(base64);
          };
          reader.onerror = reject;
          reader.readAsDataURL(watermarkFile);
        });

        // Save watermark for future use if requested
        if (saveWatermarkForFuture && watermarkBase64) {
          try {
            await saveWatermarkMutation.mutateAsync({ watermarkData: watermarkBase64 });
            await refetchSavedWatermark();
            toast.success("Watermark saved for future use");
          } catch (error) {
            console.error("Failed to save watermark:", error);
            // Continue with applying watermark even if save fails
          }
        }
      }

      const allResults: typeof results = [];

      // Process photos first (faster)
      if (photos.length > 0) {
        setCurrentProcessing(`Processing ${photos.length} photo${photos.length > 1 ? "s" : ""}...`);
        
        const photoResult = await applyPermanentMutation.mutateAsync({
          mediaIds: photos.map(m => m.id),
          watermarkData: watermarkBase64,
          useSavedWatermark: useSavedWatermark,
          position,
          opacity,
          scale,
        });

        allResults.push(...photoResult.results.map(r => ({ ...r, type: "photo" as const })));

        if (photoResult.successCount > 0) {
          toast.success(`Watermark applied to ${photoResult.successCount} photo${photoResult.successCount > 1 ? "s" : ""}`);
        }
      }

      // Process videos one at a time (slower, more resource intensive)
      if (videos.length > 0) {
        for (let i = 0; i < videos.length; i++) {
          const video = videos[i];
          setCurrentProcessing(`Processing video ${i + 1} of ${videos.length}: ${video.filename}`);
          setVideoProgress(0);

          try {
            await applyVideoWatermarkMutation.mutateAsync({
              mediaId: video.id,
              watermarkData: watermarkBase64,
              useSavedWatermark: useSavedWatermark,
              position,
              opacity,
              scale,
            });

            allResults.push({ mediaId: video.id, success: true, type: "video" });
            toast.success(`Watermark applied to video: ${video.filename}`);
          } catch (error) {
            console.error(`Failed to watermark video ${video.id}:`, error);
            allResults.push({ 
              mediaId: video.id, 
              success: false, 
              error: error instanceof Error ? error.message : "Processing failed",
              type: "video" 
            });
            toast.error(`Failed to watermark video: ${video.filename}`);
          }

          setVideoProgress(100);
        }
      }

      setResults(allResults);
      setCurrentProcessing(null);

      const successCount = allResults.filter(r => r.success).length;
      const failCount = allResults.filter(r => !r.success).length;

      if (successCount > 0) {
        onWatermarkApplied?.();
      }
      if (failCount > 0 && successCount === 0) {
        toast.error(`Failed to process all ${failCount} item${failCount > 1 ? "s" : ""}`);
      }
    } catch (error) {
      console.error("Watermark error:", error);
      toast.error("Failed to apply watermark");
    } finally {
      setIsProcessing(false);
      setCurrentProcessing(null);
      setVideoProgress(0);
    }
  };

  // Delete saved watermark
  const handleDeleteSavedWatermark = async () => {
    try {
      await deleteWatermarkMutation.mutateAsync();
      await refetchSavedWatermark();
      setUseSavedWatermark(false);
      setWatermarkPreview(null);
      toast.success("Saved watermark deleted");
    } catch (error) {
      console.error("Failed to delete watermark:", error);
      toast.error("Failed to delete saved watermark");
    }
  };

  // Reset dialog state
  const handleClose = (open: boolean) => {
    if (!open) {
      setWatermarkFile(null);
      setWatermarkPreview(null);
      setResults([]);
      setSaveWatermarkForFuture(false);
      setUseSavedWatermark(false);
      setShowPreview(true);
      setCurrentProcessing(null);
      setVideoProgress(0);
    }
    onOpenChange(open);
  };

  const photoCount = selectedMedia.filter(m => m.mediaType === "photo").length;
  const videoCount = selectedMedia.filter(m => m.mediaType === "video").length;
  const totalCount = photoCount + videoCount;
  const successCount = results.filter(r => r.success).length;
  const hasSavedWatermark = !!savedWatermark?.watermarkUrl;
  const hasWatermark = useSavedWatermark ? hasSavedWatermark : !!watermarkPreview;

  // Build description text
  const getDescriptionText = () => {
    const parts: string[] = [];
    if (photoCount > 0) {
      parts.push(`${photoCount} photo${photoCount !== 1 ? "s" : ""}`);
    }
    if (videoCount > 0) {
      parts.push(`${videoCount} video${videoCount !== 1 ? "s" : ""}`);
    }
    return parts.join(" and ");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5" />
            Apply Watermark
          </DialogTitle>
          <DialogDescription>
            Permanently apply your watermark to {getDescriptionText()}.
            This will replace the original files with watermarked versions.
            {videoCount > 0 && (
              <span className="block mt-1 text-amber-500">
                Note: Video processing may take several minutes depending on file size.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="grid md:grid-cols-2 gap-6 py-4">
          {/* Left Column - Settings */}
          <div className="space-y-4">
            {/* Media Summary */}
            <div className="flex gap-4 p-3 rounded-lg border border-border bg-muted/30">
              {photoCount > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Image className="h-4 w-4 text-blue-500" />
                  <span>{photoCount} photo{photoCount !== 1 ? "s" : ""}</span>
                </div>
              )}
              {videoCount > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <Video className="h-4 w-4 text-purple-500" />
                  <span>{videoCount} video{videoCount !== 1 ? "s" : ""}</span>
                </div>
              )}
            </div>

            {/* Saved Watermark Option */}
            {hasSavedWatermark && (
              <div className="space-y-3 p-3 rounded-lg border border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="use-saved"
                      checked={useSavedWatermark}
                      onCheckedChange={(checked) => {
                        setUseSavedWatermark(checked);
                        if (checked) {
                          setWatermarkFile(null);
                          setWatermarkPreview(savedWatermark.watermarkUrl);
                        } else {
                          setWatermarkPreview(null);
                        }
                      }}
                    />
                    <Label htmlFor="use-saved" className="cursor-pointer text-sm">
                      Use saved watermark
                    </Label>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={handleDeleteSavedWatermark}
                    disabled={deleteWatermarkMutation.isPending || isDemoProject}
                    title={isDemoProject ? "Disabled in demo mode" : ""}
                  >
                    {deleteWatermarkMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Trash2 className="h-3 w-3" />
                    )}
                  </Button>
                </div>
                {useSavedWatermark && savedWatermark.watermarkUrl && (
                  <div className="flex items-center gap-2">
                    <img
                      src={savedWatermark.watermarkUrl}
                      alt="Saved watermark"
                      className="max-h-12 rounded border border-border bg-white/10 p-1"
                    />
                    <span className="text-xs text-muted-foreground">Your saved watermark</span>
                  </div>
                )}
              </div>
            )}

            {/* Watermark Upload */}
            {!useSavedWatermark && (
              <div className="space-y-2">
                <Label>Watermark Image</Label>
                {watermarkPreview && !useSavedWatermark ? (
                  <div className="relative inline-block">
                    <img
                      src={watermarkPreview}
                      alt="Watermark preview"
                      className="max-h-16 rounded border border-border bg-muted/50 p-2"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => {
                        setWatermarkFile(null);
                        setWatermarkPreview(null);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <label className={`flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-3 py-2 hover:border-primary/50 hover:bg-muted/50 transition-colors ${
                    isDemoProject ? "opacity-50 cursor-not-allowed" : ""
                  }`}>
                    <Upload className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {isDemoProject ? "Upload watermark (Demo)" : "Upload watermark"}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                      disabled={isDemoProject}
                    />
                  </label>
                )}
                <p className="text-xs text-muted-foreground">
                  PNG with transparent background recommended
                </p>

                {/* Save for future option */}
                {watermarkFile && !hasSavedWatermark && (
                  <div className="flex items-center gap-2 pt-1">
                    <Switch
                      id="save-watermark"
                      checked={saveWatermarkForFuture}
                      onCheckedChange={setSaveWatermarkForFuture}
                    />
                    <Label htmlFor="save-watermark" className="cursor-pointer text-xs text-muted-foreground">
                      Save for future use
                    </Label>
                  </div>
                )}
              </div>
            )}

            {/* Position */}
            <div className="space-y-2">
              <Label>Position</Label>
              <Select value={position} onValueChange={(v) => setPosition(v as Position)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="top-left">Top Left</SelectItem>
                  <SelectItem value="top-right">Top Right</SelectItem>
                  <SelectItem value="bottom-left">Bottom Left</SelectItem>
                  <SelectItem value="bottom-right">Bottom Right</SelectItem>
                  <SelectItem value="center">Center</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Opacity */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Opacity</Label>
                <span className="text-xs text-muted-foreground">{opacity}%</span>
              </div>
              <Slider
                value={[opacity]}
                onValueChange={([v]) => setOpacity(v)}
                min={10}
                max={100}
                step={5}
              />
            </div>

            {/* Scale */}
            <div className="space-y-2">
              <div className="flex justify-between">
                <Label>Size</Label>
                <span className="text-xs text-muted-foreground">{scale}% of image width</span>
              </div>
              <Slider
                value={[scale]}
                onValueChange={([v]) => setScale(v)}
                min={5}
                max={50}
                step={1}
              />
            </div>
          </div>

          {/* Right Column - Preview & Results */}
          <div className="space-y-4">
            {/* Preview */}
            {showPreview && sampleImage && hasWatermark && (
              <div className="space-y-2">
                <Label className="flex items-center justify-between">
                  <span>Preview</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs"
                    onClick={() => setShowPreview(false)}
                  >
                    Hide
                  </Button>
                </Label>
                <div
                  ref={previewContainerRef}
                  className="relative rounded-lg border border-border overflow-hidden bg-muted/30"
                >
                  <img
                    src={sampleImage.thumbnailUrl || sampleImage.url}
                    alt="Preview"
                    className="w-full h-auto max-h-48 object-contain"
                  />
                  {watermarkPreview && (
                    <img
                      src={watermarkPreview}
                      alt="Watermark"
                      className={`absolute pointer-events-none ${positionStyles[position]}`}
                      style={{
                        width: `${scale}%`,
                        height: "auto",
                        opacity: opacity / 100,
                      }}
                    />
                  )}
                </div>
                <p className="text-xs text-muted-foreground text-center">
                  Approximate preview - actual result may vary
                </p>
              </div>
            )}

            {/* Processing Status */}
            {isProcessing && currentProcessing && (
              <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/30">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span className="text-sm font-medium">{currentProcessing}</span>
                </div>
                {videoProgress > 0 && (
                  <Progress value={videoProgress} className="h-2" />
                )}
              </div>
            )}

            {/* Results */}
            {results.length > 0 && (
              <div className="space-y-2 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    {successCount} of {results.length} processed
                  </span>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {results.map((result) => {
                    const media = selectedMedia.find(m => m.id === result.mediaId);
                    return (
                      <div
                        key={result.mediaId}
                        className="flex items-center gap-2 text-xs"
                      >
                        {result.success ? (
                          <CheckCircle className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="h-3 w-3 text-destructive flex-shrink-0" />
                        )}
                        {result.type === "video" ? (
                          <Video className="h-3 w-3 text-purple-500 flex-shrink-0" />
                        ) : (
                          <Image className="h-3 w-3 text-blue-500 flex-shrink-0" />
                        )}
                        <span className="truncate flex-1">
                          {media?.filename || `Media ${result.mediaId}`}
                        </span>
                        {!result.success && (
                          <span className="text-destructive truncate">{result.error}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={isProcessing}>
            {results.length > 0 ? "Done" : "Cancel"}
          </Button>
          {results.length === 0 && (
            <Button
              onClick={handleApplyWatermark}
              disabled={!hasWatermark || totalCount === 0 || isProcessing}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <ImagePlus className="h-4 w-4 mr-2" />
                  Apply Permanently
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
