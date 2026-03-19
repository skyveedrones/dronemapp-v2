/**
 * Media Metadata Display Component
 * Shows EXIF/GPS data extracted from drone photos
 * Displays coordinates, altitude, camera info, and capture timestamp
 */

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Camera,
  Clock,
  Gauge,
  AlertCircle,
} from "lucide-react";

interface MediaMetadataDisplayProps {
  latitude?: number | null;
  longitude?: number | null;
  altitude?: number | null;
  capturedAt?: Date | null;
  cameraMake?: string | null;
  cameraModel?: string | null;
  fileSize?: number;
  onEditGps?: () => void;
  canEdit?: boolean;
  onViewOnMap?: () => void;
  mediaId?: string | number;
}

export function MediaMetadataDisplay({
  latitude,
  longitude,
  altitude,
  capturedAt,
  cameraMake,
  cameraModel,
  fileSize,
  onEditGps,
  canEdit = false,
  onViewOnMap,
  mediaId,
}: MediaMetadataDisplayProps) {
  // Check if we have any metadata
  const hasGpsData = latitude !== null && latitude !== undefined && longitude !== null && longitude !== undefined;
  const hasCameraData = cameraMake || cameraModel;
  const hasMetadata = hasGpsData || hasCameraData || altitude || capturedAt;

  if (!hasMetadata && !canEdit) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <AlertCircle className="h-4 w-4" />
        <span>No metadata available</span>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* GPS Coordinates - Always visible */}
      <Card className="p-3">
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 mt-0.5 text-green-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs font-medium text-foreground">GPS Location</p>
              {canEdit && onEditGps && (
                <button
                  onClick={onEditGps}
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  Edit
                </button>
              )}
            </div>
            {hasGpsData ? (
              <>
                <p className="text-xs text-muted-foreground font-mono break-all">
                  {latitude?.toFixed(7)}, {longitude?.toFixed(7)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  <button
                    onClick={onViewOnMap}
                    className="text-blue-600 hover:underline"
                  >
                    View on Project Map
                  </button>
                </p>
                {/* Mapping Grade Indicator */}
                <div className="mt-2 flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    Mapping Grade
                  </Badge>
                  <span className="text-xs text-green-600 font-medium">
                    ✓ 1.0m-2.0m accuracy
                  </span>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted-foreground italic">
                No GPS Location
              </p>
            )}
          </div>
        </div>
      </Card>

      {/* Altitude */}
      {altitude !== null && altitude !== undefined && (
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-blue-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">Altitude</p>
              <p className="text-xs text-muted-foreground">
                {(parseFloat(altitude.toString()) / 12).toFixed(1)} ft
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Camera Information */}
      {hasCameraData && (
        <Card className="p-3">
          <div className="flex items-start gap-2">
            <Camera className="h-4 w-4 mt-0.5 text-purple-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">Camera</p>
              {cameraMake && (
                <p className="text-xs text-muted-foreground">{cameraMake}</p>
              )}
              {cameraModel && (
                <p className="text-xs text-muted-foreground">{cameraModel}</p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Capture Timestamp */}
      {capturedAt && (
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-orange-600 flex-shrink-0" />
            <div>
              <p className="text-xs font-medium text-foreground">Captured</p>
              <p className="text-xs text-muted-foreground">
                {new Date(capturedAt).toLocaleString()}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* File Size */}
      {fileSize && (
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 text-gray-600 flex-shrink-0">📦</div>
            <div>
              <p className="text-xs font-medium text-foreground">File Size</p>
              <p className="text-xs text-muted-foreground">
                {(fileSize / (1024 * 1024)).toFixed(1)} MB
              </p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
