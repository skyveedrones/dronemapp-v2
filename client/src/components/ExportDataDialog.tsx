import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { Download, FileJson, FileSpreadsheet, Globe, MapPin, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ExportDataDialogProps {
  projectId: number;
  projectName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ExportFormat = "kml" | "csv" | "geojson" | "gpx";

const formatInfo = {
  kml: {
    name: "KML",
    description: "Google Earth format with markers and flight path",
    icon: Globe,
    color: "text-blue-400",
  },
  csv: {
    name: "CSV",
    description: "Spreadsheet format for data analysis",
    icon: FileSpreadsheet,
    color: "text-green-400",
  },
  geojson: {
    name: "GeoJSON",
    description: "Standard format for GIS applications",
    icon: FileJson,
    color: "text-purple-400",
  },
  gpx: {
    name: "GPX",
    description: "GPS Exchange format for navigation devices",
    icon: MapPin,
    color: "text-orange-400",
  },
};

export function ExportDataDialog({
  projectId,
  projectName,
  open,
  onOpenChange,
}: ExportDataDialogProps) {
  const [exportingFormat, setExportingFormat] = useState<ExportFormat | null>(null);

  // Export queries - we'll use refetch to trigger them on demand
  const kmlExport = trpc.export.kml.useQuery(
    { projectId },
    { enabled: false }
  );
  const csvExport = trpc.export.csv.useQuery(
    { projectId },
    { enabled: false }
  );
  const geojsonExport = trpc.export.geojson.useQuery(
    { projectId },
    { enabled: false }
  );
  const gpxExport = trpc.export.gpx.useQuery(
    { projectId },
    { enabled: false }
  );

  const exportQueries = {
    kml: kmlExport,
    csv: csvExport,
    geojson: geojsonExport,
    gpx: gpxExport,
  };

  const handleExport = async (format: ExportFormat) => {
    setExportingFormat(format);
    
    try {
      const query = exportQueries[format];
      const result = await query.refetch();
      
      if (result.data) {
        // Create blob and download
        const blob = new Blob([result.data.content], { type: result.data.mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = result.data.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast.success(`${formatInfo[format].name} file downloaded`, {
          description: result.data.filename,
        });
      }
    } catch (error) {
      toast.error(`Failed to export ${formatInfo[format].name}`, {
        description: "Please try again or check if the project has GPS data.",
      });
    } finally {
      setExportingFormat(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Export GPS Data
          </DialogTitle>
          <DialogDescription>
            Download GPS coordinates from "{projectName}" in your preferred format.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-4">
          {(Object.keys(formatInfo) as ExportFormat[]).map((format) => {
            const info = formatInfo[format];
            const Icon = info.icon;
            const isExporting = exportingFormat === format;

            return (
              <Button
                key={format}
                variant="outline"
                className="h-auto p-4 justify-start gap-4 border-border hover:border-primary/50 hover:bg-primary/5"
                onClick={() => handleExport(format)}
                disabled={exportingFormat !== null}
              >
                <div className={`p-2 rounded-lg bg-background ${info.color}`}>
                  {isExporting ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : (
                    <Icon className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-foreground">{info.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {info.description}
                  </div>
                </div>
                <Download className="h-4 w-4 text-muted-foreground" />
              </Button>
            );
          })}
        </div>

        <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
          <strong>Note:</strong> Only media files with GPS coordinates will be included in the export.
          Upload drone photos with embedded GPS data to see them in the export.
        </div>
      </DialogContent>
    </Dialog>
  );
}
