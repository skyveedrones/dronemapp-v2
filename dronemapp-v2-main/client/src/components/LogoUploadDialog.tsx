/**
 * Logo Upload Dialog
 * Allows users to upload their company/client logo for branding
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
import { trpc } from "@/lib/trpc";
import { Check, ImagePlus, Loader2, Trash2, Upload, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

interface LogoUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function LogoUploadDialog({ open, onOpenChange }: LogoUploadDialogProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileData, setFileData] = useState<string | null>(null);
  const [filename, setFilename] = useState<string>("");
  const [mimeType, setMimeType] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const { data: currentLogo, isLoading: isLoadingLogo } = trpc.logo.get.useQuery();
  const uploadMutation = trpc.logo.upload.useMutation();
  const deleteMutation = trpc.logo.delete.useMutation();

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo file must be less than 5MB");
      return;
    }

    // Create preview URL
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setPreviewUrl(result);
      // Extract base64 data (remove data:image/...;base64, prefix)
      const base64Data = result.split(",")[1];
      setFileData(base64Data);
      setFilename(file.name);
      setMimeType(file.type);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleUpload = async () => {
    if (!fileData || !filename || !mimeType) {
      toast.error("Please select a logo image first");
      return;
    }

    setIsUploading(true);
    try {
      await uploadMutation.mutateAsync({
        fileData,
        filename,
        mimeType,
      });
      toast.success("Logo uploaded successfully!");
      utils.logo.get.invalidate();
      utils.auth.me.invalidate();
      // Reset state
      setPreviewUrl(null);
      setFileData(null);
      setFilename("");
      setMimeType("");
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to upload logo:", error);
      toast.error("Failed to upload logo");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync();
      toast.success("Logo removed");
      utils.logo.get.invalidate();
      utils.auth.me.invalidate();
    } catch (error) {
      console.error("Failed to delete logo:", error);
      toast.error("Failed to remove logo");
    }
  };

  const handleClose = () => {
    setPreviewUrl(null);
    setFileData(null);
    setFilename("");
    setMimeType("");
    onOpenChange(false);
  };

  // Determine which logo to show
  const displayLogo = previewUrl || currentLogo?.logoUrl;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5" />
            Upload Logo
          </DialogTitle>
          <DialogDescription>
            Upload your company or client logo. It will appear on your dashboard and project reports.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Logo Preview Area */}
          <div className="flex flex-col items-center gap-4">
            <div
              className={`w-48 h-48 rounded-lg border-2 border-dashed flex items-center justify-center overflow-hidden ${
                displayLogo ? "border-emerald-500 bg-emerald-500/5" : "border-muted-foreground/30 bg-muted/30"
              }`}
            >
              {isLoadingLogo ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : displayLogo ? (
                <img
                  src={displayLogo}
                  alt="Logo preview"
                  className="max-w-full max-h-full object-contain p-2"
                />
              ) : (
                <div className="text-center text-muted-foreground p-4">
                  <ImagePlus className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No logo uploaded</p>
                </div>
              )}
            </div>

            {/* Status indicator */}
            {previewUrl && (
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                New logo selected - click Save to upload
              </div>
            )}
            {currentLogo?.logoUrl && !previewUrl && (
              <div className="flex items-center gap-2 text-sm text-emerald-600">
                <Check className="h-4 w-4" />
                Current logo
              </div>
            )}
          </div>

          {/* File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="w-full"
            >
              <Upload className="h-4 w-4 mr-2" />
              {displayLogo ? "Choose Different Logo" : "Select Logo Image"}
            </Button>

            {currentLogo?.logoUrl && !previewUrl && (
              <Button
                variant="outline"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Remove Current Logo
              </Button>
            )}
          </div>

          {/* Help text */}
          <p className="text-xs text-muted-foreground text-center">
            Recommended: PNG or SVG with transparent background. Max 5MB.
          </p>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            onClick={handleUpload}
            disabled={!previewUrl || isUploading}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isUploading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Save Logo
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
