/**
 * Project Logo Dialog Component
 * Allows users to upload a logo for their project
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
import { ImagePlus, Loader2, Trash2, Upload, X } from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface ProjectLogoDialogProps {
  projectId: number;
  currentLogoUrl?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProjectLogoDialog({
  projectId,
  currentLogoUrl,
  open,
  onOpenChange,
}: ProjectLogoDialogProps) {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const utils = trpc.useUtils();
  const uploadMutation = trpc.projectLogo.upload.useMutation();
  const deleteMutation = trpc.projectLogo.delete.useMutation();

  // Handle file selection
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file (PNG, JPG, etc.)");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo image must be less than 5MB");
      return;
    }

    setLogoFile(file);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setLogoPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  // Upload logo
  const handleUpload = async () => {
    if (!logoFile) return;

    setIsUploading(true);

    try {
      // Convert file to base64
      const reader = new FileReader();
      const fileData = await new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          const base64 = result.split(",")[1];
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(logoFile);
      });

      const result = await uploadMutation.mutateAsync({
        projectId,
        fileData,
        filename: logoFile.name,
        mimeType: logoFile.type,
      });

      // Optimistically update the cache with new logo URL
      utils.project.get.setData({ id: projectId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          logoUrl: result.logoUrl || old.logoUrl,
          logoKey: result.logoKey || old.logoKey,
        };
      });

      toast.success("Project logo uploaded successfully");
      // Force refetch to ensure new logo displays immediately
      await utils.project.get.invalidate({ id: projectId });
      handleClose(false);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload logo");
    } finally {
      setIsUploading(false);
    }
  };

  // Delete logo
  const handleDelete = async () => {
    try {
      await deleteMutation.mutateAsync({ projectId });

      // Optimistically update the cache to remove logo
      utils.project.get.setData({ id: projectId }, (old) => {
        if (!old) return old;
        return {
          ...old,
          logoUrl: null,
          logoKey: null,
        };
      });

      toast.success("Project logo removed");
      // Force refetch to ensure logo removal displays immediately
      await utils.project.get.invalidate({ id: projectId });
      handleClose(false);
    } catch (error) {
      console.error("Delete error:", error);
      toast.error("Failed to remove logo");
    }
  };

  // Reset dialog state
  const handleClose = (open: boolean) => {
    if (!open) {
      setLogoFile(null);
      setLogoPreview(null);
    }
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ImagePlus className="h-5 w-5" />
            Project Logo
          </DialogTitle>
          <DialogDescription>
            Upload a logo for this project. It will be displayed in project reports and exports.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Current Logo */}
          {currentLogoUrl && !logoPreview && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Current Logo</p>
              <div className="relative inline-block">
                <img
                  src={`${currentLogoUrl}?t=${Date.now()}`}
                  alt="Current project logo"
                  className="max-h-24 rounded border border-border bg-white/10 p-2"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* New Logo Preview */}
          {logoPreview && (
            <div className="space-y-2">
              <p className="text-sm font-medium">New Logo Preview</p>
              <div className="relative inline-block">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="max-h-24 rounded border border-border bg-white/10 p-2"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={() => {
                    setLogoFile(null);
                    setLogoPreview(null);
                  }}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            </div>
          )}

          {/* Upload Area */}
          {!logoPreview && (
            <div className="space-y-2">
              <p className="text-sm font-medium">{currentLogoUrl ? "Replace Logo" : "Upload Logo"}</p>
              <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border px-4 py-6 hover:border-primary/50 hover:bg-muted/50 transition-colors justify-center">
                <Upload className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Click to upload logo image
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
              </label>
              <p className="text-xs text-muted-foreground">
                Recommended: PNG or JPG, max 5MB. Transparent backgrounds work best.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancel
          </Button>
          {logoPreview && (
            <Button onClick={handleUpload} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload Logo
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
