/**
 * Embedded Project Map Component
 * Displays an always-visible map with GPS markers from project media
 */

import { MapView } from "@/components/Map";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Media } from "../../../drizzle/schema";
import { Expand, MapPin, Navigation, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState, forwardRef, useImperativeHandle } from "react";
import { Link } from "wouter";
import { MarkerClusterer } from "@googlemaps/markerclusterer";

export interface EmbeddedProjectMapHandle {
  panToMedia: (latitude: number, longitude: number, mediaId?: string) => void;
}

interface OverlayData {
  id: number;
  fileUrl: string;
  coordinates: string | unknown;
  opacity?: string | number;
  isActive?: number;
}

interface EmbeddedProjectMapProps {
  projectId: number;
  projectName: string;
  flightId?: number;
  isDemoProject?: boolean;
  overlays?: OverlayData[];
}

export const EmbeddedProjectMap = forwardRef<EmbeddedProjectMapHandle, EmbeddedProjectMapProps>(
  (props, ref) => {
    const { projectId, projectName, flightId, isDemoProject = false, overlays = [] } = props;
    const groundOverlaysRef = useRef<google.maps.GroundOverlay[]>([]);
    const [mapReady, setMapReady] = useState(false);
    const mapRef = useRef<google.maps.Map | null>(null);
    const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
    const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
    const polylineRef = useRef<google.maps.Polyline | null>(null);
    const markerClustererRef = useRef<MarkerClusterer | null>(null);
    const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
    const [enlargedMedia, setEnlargedMedia] = useState<Media | null>(null);

    // Expose pan/zoom method to parent components
    useImperativeHandle(ref, () => ({
      panToMedia: (latitude: number, longitude: number, mediaId?: string) => {
        if (!mapRef.current) return;
        
        const targetPosition = { lat: latitude, lng: longitude };
        
        // Set zoom level to 21 for ultra-close satellite view
        mapRef.current.setZoom(21);
        
        // Pan to the location
        mapRef.current.panTo(targetPosition);
        
        // If mediaId provided, find and click the corresponding marker
        if (mediaId && markersRef.current.length > 0) {
          const marker = markersRef.current.find((m) => {
            const content = m.content as HTMLElement;
            return content?.getAttribute('data-media-id') === mediaId;
          });
          if (marker) {
            // Trigger click after a brief delay to ensure map has finished panning and zooming
            setTimeout(() => {
              google.maps.event.trigger(marker, 'click');
            }, 400);
          }
        }
      },
    }), []);

    // Fetch media - use demo procedure for unauthenticated demo access
    const { data: mediaList, isLoading } = isDemoProject
      ? trpc.media.listDemo.useQuery({ projectId, flightId })
      : trpc.media.list.useQuery({ projectId, flightId });

    // Filter media with GPS coordinates - memoized to prevent unnecessary marker recalculation
    const mediaWithGPS = useMemo(() => {
      return mediaList?.filter(
        (m) => m.latitude && m.longitude
      ) || [];
    }, [mediaList]);

    // Calculate center point from all GPS coordinates or overlay bounds
    const getCenter = useCallback(() => {
      if (mediaWithGPS.length > 0) {
        const sumLat = mediaWithGPS.reduce((sum, m) => sum + parseFloat(m.latitude!), 0);
        const sumLng = mediaWithGPS.reduce((sum, m) => sum + parseFloat(m.longitude!), 0);
        return {
          lat: sumLat / mediaWithGPS.length,
          lng: sumLng / mediaWithGPS.length,
        };
      }
      // If no GPS media but overlays exist, center on the first overlay
      if (overlays && overlays.length > 0) {
        try {
          const coords = typeof overlays[0].coordinates === 'string'
            ? JSON.parse(overlays[0].coordinates)
            : overlays[0].coordinates;
          if (coords && coords.length >= 4) {
            // coords is [[lng,lat],[lng,lat],[lng,lat],[lng,lat]] in TL,TR,BR,BL
            const avgLat = (coords[0][1] + coords[2][1]) / 2;
            const avgLng = (coords[0][0] + coords[1][0]) / 2;
            return { lat: avgLat, lng: avgLng };
          }
        } catch (e) {
          console.error('[Map] Failed to parse overlay coordinates for centering', e);
        }
      }
      return { lat: 32.7767, lng: -96.797 }; // Default to Dallas
    }, [mediaWithGPS, overlays]);

    // Handle map ready - add markers and flight path
    const handleMapReady = useCallback((map: google.maps.Map) => {
      mapRef.current = map;
      setMapReady(true);

      // Clear existing marker clusterer
      if (markerClustererRef.current) {
        markerClustererRef.current.clearMarkers();
        markerClustererRef.current = null;
      }

      // Clear existing markers
      markersRef.current.forEach((marker) => (marker.map = null));
      markersRef.current = [];

      // Clear existing polyline
      if (polylineRef.current) {
        polylineRef.current.setMap(null);
      }

      if (mediaWithGPS.length === 0) return;

      // Create info window
      infoWindowRef.current = new google.maps.InfoWindow();

      // Sort by capture time for flight path (must match gallery sorting logic)
      const sortedMedia = [...mediaWithGPS].sort((a, b) => {
        if (a.capturedAt && b.capturedAt) {
          return new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime();
        }
        if (a.capturedAt && !b.capturedAt) return -1;
        if (!a.capturedAt && b.capturedAt) return 1;
        return a.filename.localeCompare(b.filename);
      });
      console.log('[Map Markers] Sorted', sortedMedia.length, 'media items for markers');

      // Create flight path polyline
      const pathCoordinates = sortedMedia.map((m) => ({
        lat: parseFloat(m.latitude!),
        lng: parseFloat(m.longitude!),
      }));

      polylineRef.current = new google.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: "#10B981",
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map,
      });

      // Create markers for each media item (index + 1 is the marker number)
      sortedMedia.forEach((media, index) => {
        const position = {
          lat: parseFloat(media.latitude!),
          lng: parseFloat(media.longitude!),
        };

        // Create custom marker element with number and color based on media type
        const isVideo = media.mediaType === 'video';
        const markerColor = isVideo ? '#ef4444' : '#10B981'; // Red for videos, green for photos
        const markerElement = document.createElement("div");
        markerElement.className = "marker-container";
        markerElement.innerHTML = `
          <div style="
            background: ${markerColor};
            color: white;
            border-radius: 50%;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            border: 2px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            cursor: pointer;
          ">${index + 1}</div>
        `;

        const marker = new google.maps.marker.AdvancedMarkerElement({
          map,
          position,
          content: markerElement,
          title: `${media.filename} (Marker #${index + 1})`,
        });
        
        // Store media ID on marker for later reference
        markerElement.setAttribute('data-media-id', media.id.toString());

        // Add click listener for info window
        marker.addListener("click", () => {
          setSelectedMedia(media);
          
          // Handle video vs photo display
          let mediaDisplay = '';
          if (isVideo) {
            if (media.thumbnailUrl) {
              // Video with thumbnail - show thumbnail with play icon overlay (clickable)
              mediaDisplay = `
                <div style="position: relative; width: 100%; height: 240px; border-radius: 4px; margin-bottom: 8px; background: #000; cursor: pointer;" onclick="window.__openVideo && window.__openVideo('${media.id}')">
                  <img src="${media.thumbnailUrl}" alt="${media.filename}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 4px;" />
                  <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 40px; height: 40px; background: rgba(0,0,0,0.7); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
                  </div>
                </div>`;
            } else {
              // Video without thumbnail - show video icon placeholder
              mediaDisplay = `
                <div style="width: 100%; height: 240px; background: #1f2937; border-radius: 4px; margin-bottom: 8px; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; cursor: pointer;" onclick="window.__openVideo && window.__openVideo('${media.id}')">
                  <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect>
                    <line x1="7" y1="2" x2="7" y2="22"></line>
                    <line x1="17" y1="2" x2="17" y2="22"></line>
                    <line x1="2" y1="12" x2="22" y2="12"></line>
                    <line x1="2" y1="7" x2="7" y2="7"></line>
                    <line x1="2" y1="17" x2="7" y2="17"></line>
                    <line x1="17" y1="17" x2="22" y2="17"></line>
                    <line x1="17" y1="7" x2="22" y2="7"></line>
                  </svg>
                  <span style="color: #9ca3af; font-size: 11px;">Video</span>
                </div>`;
            }
          } else {
            const imageUrl = media.thumbnailUrl || media.url;
            mediaDisplay = `<img src="${imageUrl}" alt="${media.filename}" style="width: 100%; height: 240px; object-fit: cover; border-radius: 4px; margin-bottom: 8px;" onerror="this.src='${media.url}'" />`;
          }
          
          const content = `
            <div style="max-width: 320px; padding: 12px; background: #1a1a1a; border-radius: 8px;">
              ${mediaDisplay}
              <p style="font-weight: 600; font-size: 12px; margin: 0 0 4px 0; color: #333;">${media.filename}</p>
              <p style="font-size: 11px; color: #666; margin: 0;">
                ${parseFloat(media.latitude!).toFixed(6)}°, ${parseFloat(media.longitude!).toFixed(6)}°
              </p>
            </div>
          `;
          infoWindowRef.current?.setContent(content);
          infoWindowRef.current?.open(map, marker);
        });

        markersRef.current.push(marker);
        // Store marker number for reference
        (marker as any).markerNumber = index + 1;
      });

      // Create marker clusterer
      markerClustererRef.current = new MarkerClusterer({
        markers: markersRef.current,
        map,
      });

    }, [mediaWithGPS]);

    // Render ground overlays in a separate effect so they update when overlays data arrives
    useEffect(() => {
      if (!mapReady) return;
      const map = mapRef.current;
      if (!map) return;

      // Clear existing ground overlays
      groundOverlaysRef.current.forEach((go) => go.setMap(null));
      groundOverlaysRef.current = [];

      if (!overlays || overlays.length === 0) return;

      for (const ov of overlays) {
        if (!ov.isActive) continue;
        try {
          const coords = typeof ov.coordinates === 'string' ? JSON.parse(ov.coordinates) : ov.coordinates;
          // coords is [[lng,lat],[lng,lat],[lng,lat],[lng,lat]] in TL,TR,BR,BL order
          if (!coords || coords.length < 4) continue;
          const sw = new google.maps.LatLng(coords[3][1], coords[3][0]); // BL
          const ne = new google.maps.LatLng(coords[1][1], coords[1][0]); // TR
          const bounds = new google.maps.LatLngBounds(sw, ne);
          const opacity = typeof ov.opacity === 'string' ? parseFloat(ov.opacity) : (ov.opacity ?? 0.5);
          const groundOverlay = new google.maps.GroundOverlay(ov.fileUrl, bounds, {
            opacity: opacity,
            clickable: false,
          });
          groundOverlay.setMap(map);
          groundOverlaysRef.current.push(groundOverlay);
          console.log('[Map Overlay] Rendered overlay', ov.id, 'url:', ov.fileUrl);
        } catch (err) {
          console.error('[Map Overlay] Failed to render overlay', ov.id, err);
        }
      }
    }, [overlays, mapReady]);

    // Handle video opening
    useCallback(() => {
      (window as any).__openVideo = (mediaId: string) => {
        const media = mediaList?.find(m => m.id === mediaId);
        if (media) {
          setEnlargedMedia(media);
        }
      };
      // Store mediaList reference for access from HTML
      (window as any).__mediaList = mediaList;
    }, [mediaList]);

    if (isLoading) {
      return (
        <Card className="bg-card">
          <CardHeader className="pb-2">
            <h2
              className="text-lg font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Project Map
            </h2>
          </CardHeader>
          <CardContent>
            <Skeleton className="w-full h-[500px] rounded-lg" />
          </CardContent>
        </Card>
      );
    }

    return (
      <Card className="bg-card">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <h2
              className="text-lg font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Project Map
              {mediaWithGPS.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({mediaWithGPS.length} location{mediaWithGPS.length !== 1 ? "s" : ""})
                </span>
              )}
            </h2>
            {mediaWithGPS.length > 0 && (
              <Link href={flightId ? `/project/${projectId}/flight/${flightId}/map` : `/project/${projectId}/map`}>
                <Button variant="outline" size="sm">
                  <Expand className="h-4 w-4 mr-2" />
                  Full Screen
                </Button>
              </Link>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {mediaWithGPS.length === 0 && (!overlays || overlays.length === 0) ? (
            <div className="w-full h-[500px] rounded-lg bg-muted/50 border border-border flex flex-col items-center justify-center text-muted-foreground">
              <Navigation className="h-12 w-12 mb-3 opacity-50" />
              <p className="font-medium">No GPS Data Available</p>
              <p className="text-sm">Upload media with GPS coordinates to see them on the map</p>
            </div>
          ) : (
            <>
              <div className="relative">
                <MapView
                  className="w-full h-[500px] rounded-lg overflow-hidden"
                  initialCenter={getCenter()}
                  initialZoom={14}
                  onMapReady={handleMapReady}
                />
                {mediaWithGPS.length > 0 && (
                  <div className="absolute bottom-2 left-2 bg-background/90 backdrop-blur-sm rounded px-2 py-1 text-xs text-muted-foreground">
                    <span className="text-primary font-medium">{mediaWithGPS.length}</span> GPS points • 
                    <span className="text-emerald-500 ml-1">—</span> Flight path
                  </div>
                )}
                {overlays && overlays.length > 0 && (
                  <div className="absolute bottom-2 right-2 bg-background/90 backdrop-blur-sm rounded px-2 py-1 text-xs text-muted-foreground">
                    <span className="text-primary font-medium">{overlays.length}</span> overlay{overlays.length !== 1 ? 's' : ''}
                  </div>
                )}
              </div>
              <div className="mt-3 p-3 bg-muted/50 rounded-lg border border-border">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Tip:</span> Click markers to preview media. Use Full Screen for detailed view.
                </p>
              </div>
            </>
          )}

          {/* Fullscreen Media Viewer Modal */}
          {enlargedMedia && (
            <div 
              className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
              onClick={() => setEnlargedMedia(null)}
            >
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-4 right-4 h-10 w-10 text-white hover:bg-white/20 z-10"
                onClick={() => setEnlargedMedia(null)}
              >
                <X className="h-6 w-6" />
              </Button>
              <div className="max-w-[90vw] max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
                {enlargedMedia.mediaType === 'video' ? (
                  <video
                    src={enlargedMedia.url}
                    controls
                    autoPlay
                    className="max-w-full max-h-[85vh] object-contain rounded-lg"
                  />
                ) : (
                  <img
                    src={enlargedMedia.url}
                    alt={enlargedMedia.filename}
                    className="max-w-full max-h-[85vh] object-contain rounded-lg"
                  />
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-3 rounded-b-lg">
                  <h3 className="font-semibold text-sm mb-1">{enlargedMedia.filename}</h3>
                  <div className="text-xs text-gray-300 flex flex-wrap gap-4">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {parseFloat(enlargedMedia.latitude as any).toFixed(6)}, {parseFloat(enlargedMedia.longitude as any).toFixed(6)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

EmbeddedProjectMap.displayName = "EmbeddedProjectMap";
