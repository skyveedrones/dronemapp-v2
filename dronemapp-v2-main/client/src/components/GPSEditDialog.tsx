/**
 * GPS Edit Dialog Component
 * Allows users to manually add or edit GPS coordinates for media files
 * Features a map picker centered on existing project GPS points
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import { Media } from "../../../drizzle/schema";
import { MapPin, Navigation, Search } from "lucide-react";
import { useState, useCallback, useRef, useEffect } from "react";
import { toast } from "sonner";

interface GPSEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  media: Media | null;
  projectId: number;
  onSuccess?: () => void;
}

interface ProjectMediaPoint {
  lat: number;
  lng: number;
}

export function GPSEditDialog({
  open,
  onOpenChange,
  media,
  projectId,
  onSuccess,
}: GPSEditDialogProps) {
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [altitude, setAltitude] = useState("");
  const [mapReady, setMapReady] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number } | null>(null);
  
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const existingMarkersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);

  // Fetch all media for this project to get existing GPS points
  const { data: mediaList } = trpc.media.list.useQuery({ projectId });
  
  // Update GPS mutation
  const updateGPSMutation = trpc.media.updateGPS.useMutation();
  const utils = trpc.useUtils();

  // Get existing GPS points from project media
  const existingGPSPoints: ProjectMediaPoint[] = (mediaList || [])
    .filter(m => m.latitude !== null && m.longitude !== null && m.id !== media?.id)
    .map(m => ({
      lat: parseFloat(String(m.latitude)),
      lng: parseFloat(String(m.longitude)),
    }));

  // Calculate center from existing points or default
  const getMapCenter = useCallback(() => {
    if (selectedPosition) {
      return selectedPosition;
    }
    if (media?.latitude && media?.longitude) {
      return {
        lat: parseFloat(String(media.latitude)),
        lng: parseFloat(String(media.longitude)),
      };
    }
    if (existingGPSPoints.length > 0) {
      const avgLat = existingGPSPoints.reduce((sum, p) => sum + p.lat, 0) / existingGPSPoints.length;
      const avgLng = existingGPSPoints.reduce((sum, p) => sum + p.lng, 0) / existingGPSPoints.length;
      return { lat: avgLat, lng: avgLng };
    }
    // Default to Forney, TX
    return { lat: 32.7479, lng: -96.4719 };
  }, [existingGPSPoints, media, selectedPosition]);

  // Initialize form values when media changes
  useEffect(() => {
    if (media) {
      setLatitude(media.latitude ? String(media.latitude) : "");
      setLongitude(media.longitude ? String(media.longitude) : "");
      setAltitude(media.altitude ? String(media.altitude) : "");
      if (media.latitude && media.longitude) {
        setSelectedPosition({
          lat: parseFloat(String(media.latitude)),
          lng: parseFloat(String(media.longitude)),
        });
      } else {
        setSelectedPosition(null);
      }
    }
  }, [media]);

  // Create marker element for selected position
  const createSelectedMarkerElement = () => {
    const div = document.createElement("div");
    div.className = "relative";
    div.innerHTML = `
      <div class="w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg border-2 border-white animate-pulse">
        <svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
        </svg>
      </div>
    `;
    return div;
  };

  // Create marker element for existing points
  const createExistingMarkerElement = () => {
    const div = document.createElement("div");
    div.innerHTML = `
      <div class="w-4 h-4 rounded-full bg-muted-foreground/50 border border-white/50"></div>
    `;
    return div;
  };

  // Handle map ready
  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setMapReady(true);

    // Add click listener to map for selecting position
    map.addListener("click", (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setSelectedPosition({ lat, lng });
        setLatitude(lat.toFixed(6));
        setLongitude(lng.toFixed(6));
      }
    });
  }, []);

  // Update markers when map is ready and data changes
  useEffect(() => {
    if (!mapReady || !mapRef.current) return;

    const map = mapRef.current;

    // Clear existing markers
    existingMarkersRef.current.forEach(marker => marker.map = null);
    existingMarkersRef.current = [];

    // Add markers for existing GPS points (other media in project)
    existingGPSPoints.forEach(point => {
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: point,
        content: createExistingMarkerElement(),
      });
      existingMarkersRef.current.push(marker);
    });

    // Update or create selected position marker
    if (selectedPosition) {
      if (markerRef.current) {
        markerRef.current.position = selectedPosition;
      } else {
        markerRef.current = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: selectedPosition,
          content: createSelectedMarkerElement(),
        });
      }
    } else if (markerRef.current) {
      markerRef.current.map = null;
      markerRef.current = null;
    }
  }, [mapReady, existingGPSPoints, selectedPosition]);

  // Handle coordinate input changes
  const handleLatitudeChange = (value: string) => {
    setLatitude(value);
    const lat = parseFloat(value);
    if (!isNaN(lat) && lat >= -90 && lat <= 90) {
      const lng = parseFloat(longitude);
      if (!isNaN(lng)) {
        setSelectedPosition({ lat, lng });
        mapRef.current?.panTo({ lat, lng });
      }
    }
  };

  const handleLongitudeChange = (value: string) => {
    setLongitude(value);
    const lng = parseFloat(value);
    if (!isNaN(lng) && lng >= -180 && lng <= 180) {
      const lat = parseFloat(latitude);
      if (!isNaN(lat)) {
        setSelectedPosition({ lat, lng });
        mapRef.current?.panTo({ lat, lng });
      }
    }
  };

  // Center map on existing points
  const centerOnExistingPoints = () => {
    if (existingGPSPoints.length > 0 && mapRef.current) {
      const bounds = new google.maps.LatLngBounds();
      existingGPSPoints.forEach(point => bounds.extend(point));
      mapRef.current.fitBounds(bounds, 50);
    }
  };

  // Handle save
  const handleSave = async () => {
    if (!media) return;

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const alt = altitude ? parseFloat(altitude) : null;

    // Validate coordinates
    if (latitude && (isNaN(lat) || lat < -90 || lat > 90)) {
      toast.error("Invalid latitude. Must be between -90 and 90.");
      return;
    }
    if (longitude && (isNaN(lng) || lng < -180 || lng > 180)) {
      toast.error("Invalid longitude. Must be between -180 and 180.");
      return;
    }

    try {
      await updateGPSMutation.mutateAsync({
        id: media.id,
        latitude: latitude ? lat : null,
        longitude: longitude ? lng : null,
        altitude: alt,
      });

      toast.success("GPS coordinates updated successfully");
      await utils.media.list.invalidate({ projectId });
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast.error("Failed to update GPS coordinates");
    }
  };

  // Clear coordinates
  const handleClear = () => {
    setLatitude("");
    setLongitude("");
    setAltitude("");
    setSelectedPosition(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Edit GPS Location
          </DialogTitle>
          <DialogDescription>
            {media?.filename ? (
              <>Set GPS coordinates for <strong>{media.filename}</strong>. Click on the map or enter coordinates manually.</>
            ) : (
              "Set GPS coordinates for this media file."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Map */}
          <div className="relative h-64 rounded-lg overflow-hidden border border-border">
            <MapView
              className="w-full h-full"
              initialCenter={getMapCenter()}
              initialZoom={existingGPSPoints.length > 0 ? 14 : 12}
              onMapReady={handleMapReady}
            />
            
            {/* Map controls overlay */}
            <div className="absolute top-2 right-2 flex flex-col gap-1">
              {existingGPSPoints.length > 0 && (
                <Button
                  variant="secondary"
                  size="sm"
                  className="bg-background/90 backdrop-blur-sm text-xs"
                  onClick={centerOnExistingPoints}
                >
                  <Navigation className="h-3 w-3 mr-1" />
                  Center on Project
                </Button>
              )}
            </div>

            {/* Legend */}
            <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded px-2 py-1 text-xs">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded-full bg-primary border border-white"></div>
                  <span>Selected</span>
                </div>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/50"></div>
                  <span>Other Media</span>
                </div>
              </div>
            </div>
          </div>

          {/* Coordinate inputs */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="latitude">Latitude</Label>
              <Input
                id="latitude"
                type="text"
                placeholder="e.g., 32.7479"
                value={latitude}
                onChange={(e) => handleLatitudeChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">-90 to 90</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">Longitude</Label>
              <Input
                id="longitude"
                type="text"
                placeholder="e.g., -96.4719"
                value={longitude}
                onChange={(e) => handleLongitudeChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">-180 to 180</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="altitude">Altitude (m)</Label>
              <Input
                id="altitude"
                type="text"
                placeholder="Optional"
                value={altitude}
                onChange={(e) => setAltitude(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">In meters</p>
            </div>
          </div>

          {/* Help text */}
          <p className="text-xs text-muted-foreground">
            <strong>Tip:</strong> Click anywhere on the map to set the location. 
            {existingGPSPoints.length > 0 && ` Gray dots show ${existingGPSPoints.length} other media locations in this project.`}
          </p>
        </div>

        <DialogFooter className="flex justify-between sm:justify-between">
          <Button variant="outline" onClick={handleClear}>
            Clear
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={updateGPSMutation.isPending}
            >
              {updateGPSMutation.isPending ? "Saving..." : "Save Location"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
