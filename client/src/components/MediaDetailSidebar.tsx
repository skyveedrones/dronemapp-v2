import { Download, Gauge, MapPin, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export interface CockpitMediaDetails {
  id: number;
  filename: string;
  url: string;
  thumbnailUrl: string | null;
  mediaType: "photo" | "video";
  latitude: number;
  longitude: number;
  altitude: number | null;
  capturedAt: Date | null;
}

interface MediaDetailSidebarProps {
  media: CockpitMediaDetails | null;
  isOpen: boolean;
  onClose: () => void;
}

export function MediaDetailSidebar({ media, isOpen, onClose }: MediaDetailSidebarProps) {
  const handleDownload = async () => {
    if (!media) return;

    try {
      const response = await fetch(media.url);
      if (!response.ok) throw new Error("Download failed");

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = objectUrl;
      anchor.download = media.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(objectUrl);
      toast.success("Media downloaded successfully");
    } catch (error) {
      console.error("Cockpit media download failed:", error);
      toast.error("Failed to download media");
    }
  };

  const formattedCapturedAt = media?.capturedAt
    ? new Date(media.capturedAt).toLocaleString()
    : "N/A";

  return (
    <>
      {isOpen && <div className="fixed inset-0 bg-black/30 z-30 lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed top-0 right-0 h-full w-full sm:w-96 bg-white shadow-xl z-40 transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {media ? (
          <div className="flex h-full flex-col">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white p-4">
              <h2 className="text-lg font-semibold text-gray-900">Media Details</h2>
              <Button type="button" size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </header>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              <Card className="overflow-hidden bg-gray-100 border-gray-200">
                {media.mediaType === "video" ? (
                  <video
                    src={media.url}
                    className="w-full h-auto object-cover max-h-72"
                    controls
                    preload="metadata"
                  />
                ) : (
                  <img
                    src={media.thumbnailUrl || media.url}
                    alt={media.filename}
                    className="w-full h-auto object-cover max-h-72"
                  />
                )}
              </Card>

              <section className="space-y-3 text-sm text-gray-700">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 font-medium">
                    <MapPin className="h-4 w-4 text-emerald-600" />
                    GPS Coordinates
                  </div>
                  <div className="pl-6 text-gray-600">
                    <div>Latitude: {media.latitude.toFixed(6)}</div>
                    <div>Longitude: {media.longitude.toFixed(6)}</div>
                  </div>
                </div>

                {media.altitude !== null && (
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 font-medium">
                      <Gauge className="h-4 w-4 text-emerald-600" />
                      Altitude
                    </div>
                    <div className="pl-6 text-gray-600">{media.altitude.toFixed(2)} m</div>
                  </div>
                )}

                <div>
                  <div className="font-medium">Captured</div>
                  <div className="text-gray-600">{formattedCapturedAt}</div>
                </div>

                <div>
                  <div className="font-medium">Filename</div>
                  <div className="text-gray-600 break-all">{media.filename}</div>
                </div>
              </section>
            </div>

            <footer className="sticky bottom-0 border-t border-gray-200 bg-white p-4">
              <Button type="button" className="w-full bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download Media
              </Button>
            </footer>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-gray-500">Select a media marker to view details</div>
        )}
      </aside>
    </>
  );
}
