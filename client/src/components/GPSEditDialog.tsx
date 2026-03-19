/**
 * GPS Edit Dialog Component
 * Allows users to manually add or edit GPS coordinates for media files
 * Features a Mapbox map picker centered on existing project GPS points
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
import { trpc } from "@/lib/trpc";
import { Media } from "../../../drizzle/schema";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin, Navigation } from "lucide-react";
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
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number } | null>(null);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const selectedMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const existingMarkersRef = useRef<mapboxgl.Marker[]>([]);

  const { data: mediaList } = trpc.media.list.useQuery({ projectId });
  const updateGPSMutation = trpc.media.updateGPS.useMutation();
  const utils = trpc.useUtils();

  const existingGPSPoints: ProjectMediaPoint[] = (mediaList || [])
    .filter((m) => m.latitude !== null && m.longitude !== null && m.id !== media?.id)
    .map((m) => ({
      lat: parseFloat(String(m.latitude)),
      lng: parseFloat(String(m.longitude)),
    }));

  const getMapCenter = useCallback((): [number, number] => {
    if (selectedPosition) return [selectedPosition.lng, selectedPosition.lat];
    if (media?.latitude && media?.longitude) {
      return [parseFloat(String(media.longitude)), parseFloat(String(media.latitude))];
    }
    if (existingGPSPoints.length > 0) {
      const avgLat = existingGPSPoints.reduce((sum, p) => sum + p.lat, 0) / existingGPSPoints.length;
      const avgLng = existingGPSPoints.reduce((sum, p) => sum + p.lng, 0) / existingGPSPoints.length;
      return [avgLng, avgLat];
    }
    return [-96.4719, 32.7479];
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

  // Initialize Mapbox when dialog opens
  useEffect(() => {
    if (!open || !mapContainerRef.current) return;

    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) return;
    mapboxgl.accessToken = token;

    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      if (!mapContainerRef.current) return;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/satellite-streets-v12",
        center: getMapCenter(),
        zoom: existingGPSPoints.length > 0 ? 14 : 12,
        pitchWithRotate: false,
      });

      map.addControl(new mapboxgl.NavigationControl(), "bottom-right");

      map.on("click", (e) => {
        const lat = e.lngLat.lat;
        const lng = e.lngLat.lng;
        setSelectedPosition({ lat, lng });
        setLatitude(lat.toFixed(6));
        setLongitude(lng.toFixed(6));
      });

      map.on("load", () => {
        mapRef.current = map;
        // Add this line to fix the blank map
        map.resize();

        // Add existing GPS point markers (gray dots)
        existingGPSPoints.forEach((point) => {
          const el = document.createElement("div");
          el.style.cssText =
            "width:10px;height:10px;border-radius:50%;background:rgba(148,163,184,0.6);border:1px solid rgba(255,255,255,0.5);";
          const marker = new mapboxgl.Marker({
            element: el,
            color: '#50C878', // SkyVee Emerald Green
            scale: 0.65,      // Optimized small pin size
          })
            .setLngLat([point.lng, point.lat])
            .addTo(map);
          existingMarkersRef.current.push(marker);
        });

        // Add selected position marker if exists
        if (selectedPosition) {
          addSelectedMarker(map, selectedPosition);
        }
      });
    }, 100);

    return () => {
      clearTimeout(timer);
      selectedMarkerRef.current?.remove();
      selectedMarkerRef.current = null;
      existingMarkersRef.current.forEach((m) => m.remove());
      existingMarkersRef.current = [];
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const addSelectedMarker = (map: mapboxgl.Map, pos: { lat: number; lng: number }) => {
    selectedMarkerRef.current?.remove();
    const el = document.createElement("div");
    el.style.cssText = `
      width:32px;height:32px;border-radius:50%;
      background:hsl(var(--primary));
      display:flex;align-items:center;justify-content:center;
      border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);
      animation:pulse 2s infinite;
    `;
    el.innerHTML =
      '<svg width="16" height="16" fill="white" viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>';

    selectedMarkerRef.current = new mapboxgl.Marker({
      element: el,
      draggable: true,
      color: '#50C878', // SkyVee Emerald Green
      scale: 0.65,      // Optimized small pin size
    })
      .setLngLat([pos.lng, pos.lat])
      .addTo(map);

    selectedMarkerRef.current.on("dragend", () => {
      const lngLat = selectedMarkerRef.current!.getLngLat();
      setSelectedPosition({ lat: lngLat.lat, lng: lngLat.lng });
      setLatitude(lngLat.lat.toFixed(6));
      setLongitude(lngLat.lng.toFixed(6));
    });
  };

  // Update selected marker when position changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (selectedPosition) {
      if (selectedMarkerRef.current) {
        selectedMarkerRef.current.setLngLat([selectedPosition.lng, selectedPosition.lat]);
      } else {
        addSelectedMarker(map, selectedPosition);
      }
    } else {
      selectedMarkerRef.current?.remove();
      selectedMarkerRef.current = null;
    }
  }, [selectedPosition]);

  const handleLatitudeChange = (value: string) => {
    setLatitude(value);
    const lat = parseFloat(value);
    if (!isNaN(lat) && lat >= -90 && lat <= 90) {
      const lng = parseFloat(longitude);
      if (!isNaN(lng)) {
        setSelectedPosition({ lat, lng });
        mapRef.current?.flyTo({ center: [lng, lat], duration: 400 });
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
        mapRef.current?.flyTo({ center: [lng, lat], duration: 400 });
      }
    }
  };

  const centerOnExistingPoints = () => {
    if (existingGPSPoints.length > 0 && mapRef.current) {
      const bounds = new mapboxgl.LngLatBounds();
      existingGPSPoints.forEach((point) => bounds.extend([point.lng, point.lat]));
      mapRef.current.fitBounds(bounds, { padding: 50, maxZoom: 17 });
    }
  };

  const handleSave = async () => {
    if (!media) return;

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    const alt = altitude ? parseFloat(altitude) : null;

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
              <>
                Set GPS coordinates for <strong>{media.filename}</strong>. Click on the map or enter coordinates
                manually.
              </>
            ) : (
              "Set GPS coordinates for this media file."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Mapbox Map */}
          <div className="relative h-64 rounded-lg overflow-hidden border border-border">
            <div ref={mapContainerRef} className="w-full h-full" />

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
            <strong>Tip:</strong> Click anywhere on the map to set the location. Drag the pin to adjust.
            {existingGPSPoints.length > 0 &&
              ` Gray dots show ${existingGPSPoints.length} other media locations in this project.`}
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
            <Button onClick={handleSave} disabled={updateGPSMutation.isPending}>
              {updateGPSMutation.isPending ? "Saving..." : "Save Location"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
