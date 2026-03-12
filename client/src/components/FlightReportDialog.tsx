/**
 * Flight Report Dialog
 * Allows users to generate PDF reports for individual flights with flight info, map, and selected media
 */

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
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
  Check,
  Download,
  Eye,
  FileImage,
  FileText,
  Image,
  Loader2,
  Map,
  MapPin,
  Printer,
  Route,
  Upload,
  X,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";

interface FlightReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flightId: number;
  flightName: string;
  media: Media[];
  isDemoProject?: boolean;
}

type ResolutionPreset = "high" | "medium" | "low" | "thumbnail";
type MapStyle = "roadmap" | "satellite" | "hybrid" | "terrain";

const RESOLUTION_OPTIONS: { value: ResolutionPreset; label: string; description: string }[] = [
  { value: "high", label: "High Quality", description: "1920px - Best for printing" },
  { value: "medium", label: "Medium Quality", description: "1280px - Good balance" },
  { value: "low", label: "Low Quality", description: "800px - Smaller file size" },
  { value: "thumbnail", label: "Thumbnail", description: "400px - Smallest file" },
];

const MAP_STYLE_OPTIONS: { value: MapStyle; label: string; description: string }[] = [
  { value: "hybrid", label: "Hybrid", description: "Satellite imagery with labels" },
  { value: "satellite", label: "Satellite", description: "Satellite imagery only" },
  { value: "roadmap", label: "Roadmap", description: "Standard road map" },
  { value: "terrain", label: "Terrain", description: "Physical terrain features" },
];

export function FlightReportDialog({
  open,
  onOpenChange,
  flightId,
  flightName,
  media,
  isDemoProject = false,
}: FlightReportDialogProps) {
  const [selectedMediaIds, setSelectedMediaIds] = useState<Set<number>>(new Set());
  const [resolution, setResolution] = useState<ResolutionPreset>("medium");
  const [mapStyle, setMapStyle] = useState<MapStyle>("hybrid");
  const [showFlightPath, setShowFlightPath] = useState(true);
  const [includeWatermark, setIncludeWatermark] = useState(false);
  const [watermarkData, setWatermarkData] = useState<string | null>(null);
  const [watermarkPosition, setWatermarkPosition] = useState<"top-left" | "top-right" | "center" | "bottom-left" | "bottom-right">("bottom-right");
  const [watermarkOpacity, setWatermarkOpacity] = useState(70);
  const [watermarkScale, setWatermarkScale] = useState(15);
  const [isGenerating, setIsGenerating] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  
  const watermarkInputRef = useRef<HTMLInputElement>(null);

  const generateMutation = trpc.report.generateFlight.useMutation();

  // Fetch user logo for report header
  const { data: userLogo } = trpc.logo.get.useQuery();

  // Filter to only show photos
  const photos = media.filter(m => m.mediaType === "photo");

  const handleSelectAll = () => {
    if (selectedMediaIds.size === photos.length) {
      setSelectedMediaIds(new Set());
    } else {
      setSelectedMediaIds(new Set(photos.map(m => m.id)));
    }
  };

  const handleToggleMedia = (mediaId: number) => {
    const newSet = new Set(selectedMediaIds);
    if (newSet.has(mediaId)) {
      newSet.delete(mediaId);
    } else {
      newSet.add(mediaId);
    }
    setSelectedMediaIds(newSet);
  };

  const handleWatermarkUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      setWatermarkData(base64);
      toast.success("Watermark image uploaded");
    };
    reader.readAsDataURL(file);
  }, []);

  const generateSampleReport = () => {
    const mediaToInclude = selectedMediaIds.size > 0 ? Array.from(selectedMediaIds) : photos.map(m => m.id);
    const selectedPhotos = photos.filter(p => mediaToInclude.includes(p.id));
    
    const mediaHtml = selectedPhotos.map((photo, idx) => `
      <div style="page-break-inside: avoid; margin-bottom: 20px;">
        <img src="${photo.url}" style="width: 100%; max-height: 400px; object-fit: cover; border: 1px solid #ddd;" />
        <p style="margin: 10px 0 0 0; font-size: 12px; color: #666;">${photo.filename}</p>
      </div>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
          .header { border-bottom: 2px solid #1abc9c; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #000; margin-bottom: 10px; }
          .logo-text { color: #1abc9c; }
          .title { font-size: 28px; font-weight: bold; margin: 20px 0 10px 0; }
          .subtitle { color: #666; font-size: 14px; }
          .section { margin: 30px 0; }
          .section-title { font-size: 16px; font-weight: bold; color: #000; margin-bottom: 15px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px; }
          .info-item { }
          .info-label { font-weight: bold; color: #1abc9c; font-size: 12px; text-transform: uppercase; }
          .info-value { font-size: 14px; margin-top: 5px; }
          .description { background: #f9f9f9; padding: 15px; border-left: 3px solid #1abc9c; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">MAP<span class="logo-text">IT</span></div>
          <div class="title">${flightName}</div>
          <div class="subtitle">Flight Report • Generated ${new Date().toLocaleDateString()}</div>
        </div>

        <div class="section">
          <div class="section-title">FLIGHT INFORMATION</div>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">📍 Location</div>
              <div class="info-value">Manhattan, New York</div>
            </div>
            <div class="info-item">
              <div class="info-label">👤 Pilot</div>
              <div class="info-value">Joe Pilot</div>
            </div>
            <div class="info-item">
              <div class="info-label">📅 Flight Date</div>
              <div class="info-value">${new Date().toLocaleDateString()}</div>
            </div>
            <div class="info-item">
              <div class="info-label">📸 Media Items</div>
              <div class="info-value">${selectedPhotos.length} photos</div>
            </div>
            <div class="info-item">
              <div class="info-label">📋 FAA License</div>
              <div class="info-value">11111111</div>
            </div>
            <div class="info-item">
              <div class="info-label">🎯 LAANC Auth</div>
              <div class="info-value">LAANC</div>
            </div>
          </div>
        </div>

        <div class="section">
          <div class="section-title">DESCRIPTION</div>
          <div class="description">
            High-resolution aerial survey of Manhattan with 5 GPS waypoints. This sample report demonstrates the professional format and layout of Mapit flight reports.
          </div>
        </div>

        <div class="section">
          <div class="section-title">FLIGHT MEDIA</div>
          ${mediaHtml}
        </div>

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #999;">
          Generated by SkyVee Drone Mapping • www.skyveedrones.com
        </div>
      </body>
      </html>
    `;
  };

  const handleGenerateReport = async () => {
    if (selectedMediaIds.size === 0 && !isDemoProject) {
      toast.error("Please select at least one photo");
      return;
    }

    if (includeWatermark && !watermarkData) {
      toast.error("Please upload a watermark image");
      return;
    }

    setIsGenerating(true);
    try {
      // For demo projects, generate a sample report
      if (isDemoProject) {
        const sampleHtml = generateSampleReport();
        setPreviewHtml(sampleHtml);
        setShowPreview(true);
        toast.success(`Sample report generated with ${photos.length} photos`);
        setIsGenerating(false);
        return;
      }

      const result = await generateMutation.mutateAsync({
        flightId,
        mediaIds: Array.from(selectedMediaIds),
        resolution,
        mapStyle,
        showFlightPath,
        includeWatermark,
        watermarkData: watermarkData || undefined,
        watermarkPosition,
        watermarkOpacity,
        watermarkScale,
        userLogoUrl: userLogo?.logoUrl || undefined,
      });

      setPreviewHtml(result.html);
      setShowPreview(true);
      toast.success(`Report generated with ${result.mediaCount} photos`);
    } catch (error) {
      console.error("Failed to generate report:", error);
      toast.error("Failed to generate report");
    } finally {
      setIsGenerating(false);
    }
  };

  const [isDownloading, setIsDownloading] = useState(false);
  const downloadPdfMutation = trpc.report.downloadPdf.useMutation();

  const handleDownloadPdf = async () => {
    if (!previewHtml) return;
    setIsDownloading(true);
    toast.info("Opening print dialog — select 'Save as PDF' as the destination.");

    try {
      // Inject print-optimized styles into the report HTML
      const printStyles = `
        <style>
          @media print {
            body {
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            @page {
              size: letter;
              margin: 0.4in;
            }
            img {
              max-width: 100% !important;
              page-break-inside: avoid;
            }
            .page-break {
              page-break-before: always;
            }
          }
          /* Also apply styles for screen view in the print window */
          body {
            font-family: Arial, Helvetica, sans-serif;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        </style>
        <script>
          // Auto-trigger print once everything is loaded
          window.addEventListener('load', function() {
            // Wait for all images to finish loading
            var images = document.querySelectorAll('img');
            var loaded = 0;
            var total = images.length;
            
            function checkReady() {
              loaded++;
              if (loaded >= total) {
                // Small delay to ensure rendering is complete
                setTimeout(function() { window.print(); }, 1500);
              }
            }
            
            if (total === 0) {
              setTimeout(function() { window.print(); }, 1500);
            } else {
              images.forEach(function(img) {
                if (img.complete) {
                  checkReady();
                } else {
                  img.addEventListener('load', checkReady);
                  img.addEventListener('error', checkReady);
                }
              });
            }
            
            // Safety fallback: trigger print after 30 seconds no matter what
            setTimeout(function() { window.print(); }, 30000);
          });
        </script>
      `;

      // Insert print styles before </head> or at the start of the HTML
      let enhancedHtml = previewHtml;
      if (enhancedHtml.includes('</head>')) {
        enhancedHtml = enhancedHtml.replace('</head>', printStyles + '</head>');
      } else {
        enhancedHtml = printStyles + enhancedHtml;
      }

      // Open in a new window — the browser's native renderer handles oklch perfectly
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        toast.error("Pop-up blocked! Please allow pop-ups for this site and try again.");
        setIsDownloading(false);
        return;
      }

      printWindow.document.open();
      printWindow.document.write(enhancedHtml);
      printWindow.document.close();

      toast.success("Print dialog will open automatically. Select 'Save as PDF' to download.");
    } catch (error) {
      console.error("[PDF Generation Error]:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleClose = () => {
    setShowPreview(false);
    setPreviewHtml(null);
    onOpenChange(false);
  };

  // Preview mode
  if (showPreview && previewHtml) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Report Preview
            </DialogTitle>
            <DialogDescription>
              Review your report before downloading. Use the Download button to save as PDF.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto border rounded-lg bg-white">
            <iframe
              srcDoc={previewHtml}
              className="w-full h-[60vh] border-0"
              title="Report Preview"
            />
          </div>

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              <X className="h-4 w-4 mr-2" />
              Back to Options
            </Button>
            <Button 
              onClick={handleDownloadPdf} 
              disabled={isDownloading}
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating PDF...
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4 mr-2" />
                  Print / Save as PDF
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Generate Flight Report
          </DialogTitle>
          <DialogDescription>
            Create a PDF report with flight information, map, and selected media files.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto space-y-6 py-4">
          {/* Media Selection */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base font-semibold">Select Photos</Label>
              <Button variant="outline" size="sm" onClick={handleSelectAll}>
                {selectedMediaIds.size === photos.length ? (
                  <>
                    <X className="h-4 w-4 mr-1" />
                    Deselect All
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Select All ({photos.length})
                  </>
                )}
              </Button>
            </div>
            
            <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-48 overflow-auto p-2 border rounded-lg bg-muted/30">
              {photos.length === 0 ? (
                <p className="col-span-full text-center text-muted-foreground py-4">
                  No photos available in this project
                </p>
              ) : (
                photos.map((item) => (
                  <div
                    key={item.id}
                    className={`relative aspect-square rounded-md overflow-hidden cursor-pointer border-2 transition-all ${
                      selectedMediaIds.has(item.id)
                        ? "border-emerald-500 ring-2 ring-emerald-500/30"
                        : "border-transparent hover:border-muted-foreground/30"
                    }`}
                    onClick={() => handleToggleMedia(item.id)}
                  >
                    <img
                      src={item.thumbnailUrl || item.url}
                      alt={item.filename}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-1 left-1">
                      <Checkbox
                        checked={selectedMediaIds.has(item.id)}
                        className="bg-white/90 border-gray-400"
                      />
                    </div>
                    {!item.latitude && (
                      <div className="absolute bottom-1 right-1 bg-amber-500 text-white text-xs px-1 rounded">
                        <MapPin className="h-3 w-3" />
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {selectedMediaIds.size} of {photos.length} photos selected
            </p>
          </div>

          {/* Resolution Selection */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Image Resolution</Label>
            <Select value={resolution} onValueChange={(v) => setResolution(v as ResolutionPreset)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOLUTION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex flex-col">
                      <span>{option.label}</span>
                      <span className="text-xs text-muted-foreground">{option.description}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Map Options */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
            <div className="flex items-center gap-2">
              <Map className="h-5 w-5 text-emerald-500" />
              <Label className="text-base font-semibold">Map Options</Label>
            </div>
            <p className="text-sm text-muted-foreground -mt-2">
              Configure how the project map appears in your report
            </p>
            
            {/* Map Style */}
            <div className="space-y-2">
              <Label>Map Style</Label>
              <Select value={mapStyle} onValueChange={(v) => setMapStyle(v as MapStyle)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAP_STYLE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      <div className="flex flex-col">
                        <span>{option.label}</span>
                        <span className="text-xs text-muted-foreground">{option.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Flight Path Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Route className="h-4 w-4 text-emerald-500" />
                <div className="space-y-0.5">
                  <Label>Show Flight Path</Label>
                  <p className="text-xs text-muted-foreground">
                    Draw a line connecting GPS points in capture order
                  </p>
                </div>
              </div>
              <Switch
                checked={showFlightPath}
                onCheckedChange={setShowFlightPath}
              />
            </div>
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleGenerateReport}
            disabled={isGenerating || selectedMediaIds.size === 0}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Eye className="h-4 w-4 mr-2" />
                Preview Report
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
