import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  FileImage, 
  FileVideo, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Loader2 
} from "lucide-react";

// 1. Refined types to match your JSX usage perfectly
type FileStatus = 'pending' | 'uploading' | 'success' | 'error';

type UploadFile = {
  id: string;
  file: File;           // The actual native File object
  status: FileStatus;
  progress: number;     // Explicitly defined to stop progress squiggles
  uploadSpeed?: number;
};

type MediaUploadDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  files: UploadFile[];
  setFiles: React.Dispatch<React.SetStateAction<UploadFile[]>>;
  addFiles: (files: FileList | File[]) => void;
  isUploading: boolean;
  handleStartUpload: () => void;
};

const MediaUploadDialog: React.FC<MediaUploadDialogProps> = ({
  open,
  onOpenChange,
  files,
  setFiles,
  addFiles,
  isUploading,
  handleStartUpload,
}) => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <Dialog open={open} onOpenChange={(val) => !isUploading && onOpenChange(val)}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Upload Drone Media</DialogTitle>
          <DialogDescription>
            Original quality preserved. GPS data used for mapping.
          </DialogDescription>
        </DialogHeader>

        {/* Upload Zone */}
        <div 
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { 
            e.preventDefault(); 
            addFiles(e.dataTransfer.files); 
          }}
          className="border-2 border-dashed rounded-lg p-10 text-center hover:bg-muted/5 transition-colors cursor-pointer"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p className="text-sm font-medium">Drag drone files here or click to browse</p>
          <input 
            type="file" 
            ref={fileInputRef}
            multiple 
            className="hidden" 
            // Reset value so selecting the same file again triggers onChange
            onClick={(e) => (e.currentTarget.value = '')}
            onChange={(e) => addFiles(e.target.files || [])} 
          />
        </div>

        {/* File List */}
        <ScrollArea className="flex-1 mt-4 pr-4">
          <div className="space-y-3">
            {files.map((file) => (
              <div key={file.id} className="group flex flex-col gap-2 p-3 border rounded-lg bg-muted/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 truncate">
                    {/* Accessing the nested native file object */}
                    {file.file.type.startsWith('image/') ? (
                      <FileImage className="h-4 w-4 text-blue-500" />
                    ) : (
                      <FileVideo className="h-4 w-4 text-purple-500" />
                    )}
                    <span className="text-xs font-medium truncate max-w-[200px]">
                      {file.file.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {file.status === 'success' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                    {file.status === 'error' && <AlertCircle className="h-4 w-4 text-destructive" />}
                    {!isUploading && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 opacity-0 group-hover:opacity-100" 
                        onClick={() => setFiles(prev => prev.filter(f => f.id !== file.id))}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {file.status !== 'pending' && (
                  <>
                    <Progress value={file.progress} className="h-1.5" />
                    <div className="flex justify-between text-[10px] text-muted-foreground">
                      <span>{Math.round(file.progress)}%</span>
                      {file.status === 'uploading' && file.uploadSpeed && (
                        <span>{(file.uploadSpeed / 1024 / 1024).toFixed(1)} MB/s</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <DialogFooter className="mt-6 gap-2">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            disabled={isUploading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleStartUpload} 
            disabled={isUploading || files.length === 0 || files.every(f => f.status === 'success')}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              "Start Upload"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default MediaUploadDialog;
