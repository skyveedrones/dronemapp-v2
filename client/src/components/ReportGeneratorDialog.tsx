/**
 * Report Generator Dialog
 * Allows users to generate PDF reports with project info, map, and selected media
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
  Download,
  Eye,
  Loader2,
  Printer,
  ChevronLeft,
} from "lucide-react";
import { useCallback, useState } from "react";
import { toast } from "sonner";

interface ReportGeneratorDialogProps {
  projectId: number;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: Media[];
  isDemoProject?: boolean;
}

export function ReportGeneratorDialog({
  projectId,
  projectName,
  open,
  onOpenChange,
  media,
  isDemoProject,
}: ReportGeneratorDialogProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [selectedMediaIndices, setSelectedMediaIndices] = useState<number[]>([]);
  const [reportOptions, setReportOptions] = useState({
    includeMap: true,
    includeMedia: true,
    includeStats: true,
    mapZoom: 15,
    imageQuality: 'medium' as 'low' | 'medium' | 'high',
  });

  const generateReportMutation = trpc.report.generate.useMutation();
  const emailReportMutation = trpc.report.emailReport.useMutation();

  const handleGeneratePreview = useCallback(async () => {
    setIsGenerating(true);
    try {
      const selectedMedia = selectedMediaIndices.map(i => media[i]);
      const resolutionMap = { low: 'low', medium: 'medium', high: 'high' } as const;
      
      const result = await generateReportMutation.mutateAsync({
        projectId,
        mediaIds: selectedMedia.map(m => m.id),
        resolution: resolutionMap[reportOptions.imageQuality],
        mapStyle: 'hybrid',
        showFlightPath: true,
        includeWatermark: false,
      });

      setPreviewHtml(result.html);
      setShowPreview(true);
      toast.success('Report preview generated!');
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Failed to generate report preview');
    } finally {
      setIsGenerating(false);
    }
  }, [projectId, selectedMediaIndices, reportOptions, media, generateReportMutation]);

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
            margin: 0;
            padding: 0;
          }
          .print-close-button {
            position: fixed;
            top: 12px;
            right: 12px;
            z-index: 10000;
            background: #22c55e;
            color: white;
            border: none;
            border-radius: 4px;
            padding: 8px 16px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
            transition: background 0.2s;
          }
          .print-close-button:hover {
            background: #16a34a;
          }
        </style>
        <button class="print-close-button" onclick="window.close()">Close</button>
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

  const handleEmailReport = async () => {
    if (!previewHtml) return;

    try {
      const userEmail = 'user@example.com'; // Get from auth context in real implementation
      await emailReportMutation.mutateAsync({
        html: previewHtml,
        projectName,
        recipientEmail: userEmail,
      });
      toast.success('Report sent via email!');
      setShowPreview(false);
      setPreviewHtml(null);
    } catch (error) {
      console.error('Error emailing report:', error);
      toast.error('Failed to send report via email');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] flex flex-col">
        {!showPreview ? (
          <>
            <DialogHeader>
              <DialogTitle>Generate Report</DialogTitle>
              <DialogDescription>
                Create a customized PDF report for {projectName}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Report Options */}
              <div className="space-y-4">
                <h3 className="font-semibold">Report Options</h3>

                <div className="flex items-center justify-between">
                  <Label htmlFor="include-map">Include Map</Label>
                  <Switch
                    id="include-map"
                    checked={reportOptions.includeMap}
                    onCheckedChange={(checked) =>
                      setReportOptions({ ...reportOptions, includeMap: checked })
                    }
                  />
                </div>

                {reportOptions.includeMap && (
                  <div className="space-y-2 pl-4 border-l-2 border-green-500">
                    <Label>Map Zoom Level: {reportOptions.mapZoom}</Label>
                    <Slider
                      value={[reportOptions.mapZoom]}
                      onValueChange={([value]) =>
                        setReportOptions({ ...reportOptions, mapZoom: value })
                      }
                      min={5}
                      max={20}
                      step={1}
                      className="w-full"
                    />
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <Label htmlFor="include-media">Include Media</Label>
                  <Switch
                    id="include-media"
                    checked={reportOptions.includeMedia}
                    onCheckedChange={(checked) =>
                      setReportOptions({ ...reportOptions, includeMedia: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="include-stats">Include Statistics</Label>
                  <Switch
                    id="include-stats"
                    checked={reportOptions.includeStats}
                    onCheckedChange={(checked) =>
                      setReportOptions({ ...reportOptions, includeStats: checked })
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="image-quality">Image Quality</Label>
                  <Select
                    value={reportOptions.imageQuality}
                    onValueChange={(value) =>
                      setReportOptions({
                        ...reportOptions,
                        imageQuality: value as 'low' | 'medium' | 'high',
                      })
                    }
                  >
                    <SelectTrigger id="image-quality">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Low (Smaller file)</SelectItem>
                      <SelectItem value="medium">Medium (Balanced)</SelectItem>
                      <SelectItem value="high">High (Best quality)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Media Selection */}
              {reportOptions.includeMedia && media.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Select Media to Include</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (selectedMediaIndices.length === media.length) {
                          setSelectedMediaIndices([]);
                        } else {
                          setSelectedMediaIndices(media.map((_, idx) => idx));
                        }
                      }}
                    >
                      {selectedMediaIndices.length === media.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  <div className="max-h-64 overflow-y-auto grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3 p-3 border rounded-lg">
                    {media.map((m, idx) => (
                      <div key={m.id} className="flex flex-col items-center gap-2 relative">
                        <Checkbox
                          id={`media-${idx}`}
                          checked={selectedMediaIndices.includes(idx)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedMediaIndices([...selectedMediaIndices, idx]);
                            } else {
                              setSelectedMediaIndices(
                                selectedMediaIndices.filter((i) => i !== idx)
                              );
                            }
                          }}
                          className="absolute top-1 left-1 z-10"
                        />
                        <Label htmlFor={`media-${idx}`} className="cursor-pointer w-full">
                          <img src={m.url} alt={m.filename} className="w-full aspect-square object-cover rounded border border-white/10 hover:border-white/30 transition-colors" />
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="flex-wrap gap-2 justify-between">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <div className="flex gap-2">
                <Button
                  onClick={handleGeneratePreview}
                  disabled={isGenerating}
                  variant="outline"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Preview
                    </>
                  )}
                </Button>
              </div>
            </DialogFooter>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Report Preview</DialogTitle>
              <DialogDescription>Review before printing or emailing</DialogDescription>
            </DialogHeader>

            <div className="border rounded-lg p-4 bg-white flex-1 overflow-y-auto">
              <div dangerouslySetInnerHTML={{ __html: previewHtml || '' }} />
            </div>

            <div className="flex items-center justify-between mt-6 pt-4 border-t gap-4 px-4 pb-4 bg-gray-900 text-white relative z-50">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowPreview(false);
                  setPreviewHtml(null);
                }}
                className="gap-2 text-white border-white hover:bg-gray-800"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Report Options
              </Button>
              <Button
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="ml-auto"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Preparing...
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4 mr-2" />
                    Print / Save as PDF
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
