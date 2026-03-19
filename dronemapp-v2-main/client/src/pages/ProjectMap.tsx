/**
 * Project Map Page
 * Displays media locations on an interactive Google Map with flight path visualization
 * Redesigned with full-screen map and collapsible consolidated info panel
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { BackToDashboard } from "@/components/BackToDashboard";
import { Button } from "@/components/ui/button";
import { MapView } from "@/components/Map";
import { trpc } from "@/lib/trpc";
import {
  ArrowLeft,
  Camera,
  ChevronLeft,
  ChevronRight,
  FolderOpen,
  Layers,
  MapPin,
  Maximize2,
  Route,
  Video,
  X,
  ZoomIn,
  ZoomOut,
  Calendar,
  Image,
  Mountain,
} from "lucide-react";
import { useCallback, useRef, useState, useEffect, useMemo } from "react";
import { Link, useParams } from "wouter";
import { MarkerClusterer } from "@googlemaps/markerclusterer";

// Geotagged media item with required GPS coordinates
interface GeotaggedMedia {
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

export default function ProjectMap() {
  const { id, flightId: flightIdParam } = useParams<{ id: string; flightId?: string }>();
  const projectId = parseInt(id || "0", 10);
  const flightId = flightIdParam ? parseInt(flightIdParam, 10) : undefined;
  const isDemoProject = projectId === 1;
  const { user } = useAuth();
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([]);
  const polylineRef = useRef<google.maps.Polyline | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const markerClustererRef = useRef<MarkerClusterer | null>(null);

  const [showFlightPath, setShowFlightPath] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<GeotaggedMedia | null>(null);
  const [mapType, setMapType] = useState<"roadmap" | "satellite" | "terrain" | "hybrid">("satellite");
  const [mapReady, setMapReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<GeotaggedMedia | null>(null);

  // Fetch project details - use demo procedure for unauthenticated demo access
  const { data: project, isLoading: projectLoading } = isDemoProject
    ? trpc.project.getDemo.useQuery(
        { id: projectId },
        { enabled: projectId > 0 }
      )
    : trpc.project.get.useQuery(
        { id: projectId },
        { enabled: projectId > 0 }
      );

  // Fetch media for this project (or specific flight if flightId provided)
  // When viewing project map (no flightId), only show project-level media (not flight media)
  // When viewing flight map (with flightId), show only that flight's media
  // Use demo procedure for unauthenticated demo access
  const { data: mediaItems, isLoading: mediaLoading } = isDemoProject
    ? trpc.media.listDemo.useQuery(
        { projectId, flightId, includeFlightMedia: false },
        { enabled: projectId > 0 }
      )
    : trpc.media.list.useQuery(
        { projectId, flightId, includeFlightMedia: false },
        { enabled: projectId > 0 }
      );

  // Filter media with GPS coordinates and convert decimal strings to numbers
  const geotaggedMedia: GeotaggedMedia[] = (mediaItems || [])
    .filter(m => m.latitude !== null && m.longitude !== null)
    .map(m => ({
      id: m.id,
      filename: m.filename,
      url: m.url,
      thumbnailUrl: m.thumbnailUrl,
      mediaType: m.mediaType,
      latitude: parseFloat(String(m.latitude)),
      longitude: parseFloat(String(m.longitude)),
      altitude: m.altitude ? parseFloat(String(m.altitude)) : null,
      capturedAt: m.capturedAt,
    }));

  // Sort media by capture time (Flight Path order) for sidebar list
  // Must match EmbeddedProjectMap sorting logic exactly for consistent marker numbering
  const sortedGeotaggedMedia = useMemo(() => {
    return [...geotaggedMedia].sort((a, b) => {
      if (a.capturedAt && b.capturedAt) {
        return new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime();
      }
      if (a.capturedAt && !b.capturedAt) return -1;
      if (!a.capturedAt && b.capturedAt) return 1;
      return a.filename.localeCompare(b.filename);
    });
  }, [geotaggedMedia]);

  // Calculate center from media locations
  const getMapCenter = useCallback(() => {
    if (geotaggedMedia.length === 0) {
      // Default to Forney, TX if no geotagged media
      return { lat: 32.7479, lng: -96.4719 };
    }
    const avgLat = geotaggedMedia.reduce((sum, m) => sum + m.latitude, 0) / geotaggedMedia.length;
    const avgLng = geotaggedMedia.reduce((sum, m) => sum + m.longitude, 0) / geotaggedMedia.length;
    return { lat: avgLat, lng: avgLng };
  }, [geotaggedMedia]);

  // Create custom marker element
  const createMarkerElement = (media: GeotaggedMedia, index: number) => {
    const div = document.createElement("div");
    div.className = "relative cursor-pointer transform hover:scale-110 transition-transform";
    
    // Create marker pin
    const pin = document.createElement("div");
    pin.className = `w-8 h-8 rounded-full flex items-center justify-center shadow-lg border-2 border-white ${
      media.mediaType === "video" ? "bg-red-500" : "bg-emerald-500"
    }`;
    pin.innerHTML = media.mediaType === "video" 
      ? '<svg class="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>'
      : '<svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><circle cx="12" cy="13" r="3"/></svg>';
    
    // Add number badge
    const badge = document.createElement("div");
    badge.className = "absolute -top-1 -right-1 w-4 h-4 bg-background text-foreground text-xs rounded-full flex items-center justify-center font-bold border border-border";
    badge.textContent = String(index + 1);
    
    div.appendChild(pin);
    div.appendChild(badge);
    
    return div;
  };

  // Add markers and flight path when map is ready and data is loaded
  useEffect(() => {
    if (!mapReady || !mapRef.current || geotaggedMedia.length === 0) return;

    const map = mapRef.current;

    // Clear existing marker clusterer
    if (markerClustererRef.current) {
      markerClustererRef.current.clearMarkers();
      markerClustererRef.current = null;
    }

    // Clear existing markers
    markersRef.current.forEach(marker => marker.map = null);
    markersRef.current = [];

    // Clear existing polyline
    if (polylineRef.current) {
      polylineRef.current.setMap(null);
      polylineRef.current = null;
    }

    // Create info window if not exists
    if (!infoWindowRef.current) {
      infoWindowRef.current = new google.maps.InfoWindow();
    }

    // Add markers for each geotagged media (using sorted order for consistent numbering)
    sortedGeotaggedMedia.forEach((media, index) => {
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map,
        position: { lat: media.latitude, lng: media.longitude },
        content: createMarkerElement(media, index),
        title: media.filename,
      });

      // Add click listener
      marker.addListener("click", () => {
        setSelectedMedia(media);
        
        // Create info window content
        const content = document.createElement("div");
        content.className = "p-4 max-w-lg";
        content.style.width = '400px';
        content.style.zIndex = '1000';
        const isVideo = media.mediaType === 'video';
        const imageUrl = media.thumbnailUrl || (isVideo ? '' : media.url);
        
        // Debug logging for video thumbnails
        if (isVideo) {
          console.log('Video marker clicked:', {
            id: media.id,
            filename: media.filename,
            thumbnailUrl: media.thumbnailUrl,
            url: media.url,
            hasThumbnail: !!media.thumbnailUrl
          });
        }
        
        // For videos, show video player; for photos, show image
        let mediaContent = '';
        if (isVideo) {
          // Use video player for videos
          mediaContent = `
            <video 
              id="video-${media.id}"
              style="width: 100%; height: 300px; background: #111827; border-radius: 4px; margin-bottom: 10px; object-fit: contain;" 
              controls
              controlsList="nodownload"
            >
              <source src="${media.url}" type="video/mp4">
              Your browser does not support the video tag.
            </video>`;
        } else {
          if (imageUrl) {
            mediaContent = `<img src="${imageUrl}" alt="${media.filename}" style="width: 100%; height: 300px; object-fit: cover; border-radius: 4px; margin-bottom: 10px;" onerror="this.src='${media.url}'" />`;
          } else {
            mediaContent = `<div style="width: 100%; height: 300px; background: #e5e7eb; border-radius: 4px; margin-bottom: 10px; display: flex; align-items: center; justify-content: center;"><span style="color: #6b7280;">No Image</span></div>`;
          }
        }
        
        // Different icon for video (play) vs photo (expand)
        const buttonIcon = isVideo 
          ? `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="white" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`
          : `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"></polyline><polyline points="9 21 3 21 3 15"></polyline><line x1="21" y1="3" x2="14" y2="10"></line><line x1="3" y1="21" x2="10" y2="14"></line></svg>`;
        
        content.innerHTML = `
          <div class="font-semibold text-base mb-2" style="font-size: 16px; font-weight: 700; color: #1a1a1a;">${media.filename}</div>
          <div class="relative">
            ${mediaContent}
            <button id="enlarge-btn-${media.id}" class="absolute top-1 right-1 bg-black/60 hover:bg-black/80 text-white p-1.5 rounded transition-colors" title="${isVideo ? 'Play video' : 'Enlarge image'}">
              ${buttonIcon}
            </button>
          </div>
          <div class="text-xs text-gray-600" style="margin: 8px 0;">
            <div>📍 ${media.latitude.toFixed(6)}, ${media.longitude.toFixed(6)}</div>
            ${media.altitude ? `<div>🏔️ Altitude: ${media.altitude.toFixed(1)}m</div>` : ''}
            ${media.capturedAt ? `<div>📅 ${new Date(media.capturedAt).toLocaleString()}</div>` : ''}
          </div>
          <div style="margin-top: 10px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
            <button id="select-btn-${media.id}" style="width: 100%; padding: 10px; background: #10b981; color: white; border: none; border-radius: 5px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='#059669'" onmouseout="this.style.background='#10b981'">
              ✓ Select to View
            </button>
          </div>
        `;

        // Add click handlers for enlarge button and select button after content is added to DOM
        setTimeout(() => {
          const enlargeBtn = document.getElementById(`enlarge-btn-${media.id}`);
          const selectBtn = document.getElementById(`select-btn-${media.id}`);
          if (enlargeBtn) {
            enlargeBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              setEnlargedImage(media);
            });
          }
          if (selectBtn) {
            selectBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              setEnlargedImage(media);
            });
          }
        }, 100);

        infoWindowRef.current?.setContent(content);
        infoWindowRef.current?.open(map, marker);
      });

      markersRef.current.push(marker);
    });

    // Initialize marker clusterer with custom styling
    if (markersRef.current.length > 0) {
      markerClustererRef.current = new MarkerClusterer({
        map,
        markers: markersRef.current,
        renderer: {
          render: ({ count, position }) => {
            // Create custom cluster marker with green styling
            const svg = `
              <svg width="50" height="50" viewBox="0 0 50 50" xmlns="http://www.w3.org/2000/svg">
                <circle cx="25" cy="25" r="22" fill="#10B981" opacity="0.9" stroke="white" stroke-width="3"/>
                <text x="25" y="25" text-anchor="middle" dominant-baseline="central" font-size="16" font-weight="bold" fill="white">${count}</text>
              </svg>
            `;
            const clusterIcon = document.createElement('div');
            clusterIcon.innerHTML = svg;
            clusterIcon.className = 'transform hover:scale-110 transition-transform cursor-pointer';
            
            return new google.maps.marker.AdvancedMarkerElement({
              position,
              content: clusterIcon,
              zIndex: Number(google.maps.Marker.MAX_ZINDEX) + count,
            });
          },
        },
      });
    }

    // Draw flight path polyline
    if (geotaggedMedia.length > 1 && showFlightPath) {
      // Sort by capture time if available, otherwise by ID
      const sortedMedia = [...geotaggedMedia].sort((a, b) => {
        if (a.capturedAt && b.capturedAt) {
          return new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime();
        }
        return a.id - b.id;
      });

      const pathCoordinates = sortedMedia.map(m => ({
        lat: m.latitude,
        lng: m.longitude,
      }));

      polylineRef.current = new google.maps.Polyline({
        path: pathCoordinates,
        geodesic: true,
        strokeColor: "#10B981",
        strokeOpacity: 0.8,
        strokeWeight: 3,
        map,
      });
    }

    // Fit bounds to show all markers
    const bounds = new google.maps.LatLngBounds();
    geotaggedMedia.forEach(m => {
      bounds.extend({ lat: m.latitude, lng: m.longitude });
    });
    map.fitBounds(bounds, 50);

    // Force map refresh after a short delay to ensure all markers are properly rendered
    // This fixes issues where markers don't appear on first load
    setTimeout(() => {
      if (mapRef.current && geotaggedMedia.length > 0) {
        const refreshBounds = new google.maps.LatLngBounds();
        geotaggedMedia.forEach(m => {
          refreshBounds.extend({ lat: m.latitude, lng: m.longitude });
        });
        mapRef.current.fitBounds(refreshBounds, 50);
      }
    }, 300);

  }, [mapReady, sortedGeotaggedMedia, showFlightPath]);

  // Handle map ready
  const handleMapReady = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    map.setMapTypeId(mapType);
    setMapReady(true);
  }, [mapType]);

  // Toggle flight path
  const toggleFlightPath = () => {
    const newValue = !showFlightPath;
    setShowFlightPath(newValue);
    if (polylineRef.current) {
      polylineRef.current.setMap(newValue ? mapRef.current : null);
    }
  };

  // Change map type
  const changeMapType = (type: "roadmap" | "satellite" | "terrain" | "hybrid") => {
    setMapType(type);
    if (mapRef.current) {
      mapRef.current.setMapTypeId(type);
    }
  };

  // Zoom controls
  const zoomIn = () => {
    if (mapRef.current) {
      mapRef.current.setZoom((mapRef.current.getZoom() || 15) + 1);
    }
  };

  const zoomOut = () => {
    if (mapRef.current) {
      mapRef.current.setZoom((mapRef.current.getZoom() || 15) - 1);
    }
  };

  // Center on selected media
  const centerOnMedia = (media: GeotaggedMedia) => {
    if (mapRef.current) {
      mapRef.current.panTo({ lat: media.latitude, lng: media.longitude });
      mapRef.current.setZoom(18);
      setSelectedMedia(media);
    }
  };

  if (projectLoading || mediaLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-muted-foreground">Loading map...</p>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Project Not Found</h1>
          <BackToDashboard variant="default" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Full-screen Map Container */}
      <div className="flex-1 relative">
        {geotaggedMedia.length > 0 ? (
          <MapView
            className="w-full h-full"
            initialCenter={getMapCenter()}
            initialZoom={15}
            onMapReady={handleMapReady}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-muted/20">
            <div className="text-center p-8">
              <MapPin className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">No GPS Data Available</h2>
              <p className="text-muted-foreground mb-4">
                Upload drone photos with GPS metadata to see them on the map.
              </p>
              <Link href={flightId ? `/project/${projectId}/flight/${flightId}` : `/project/${projectId}`}>
                <Button>Upload Media</Button>
              </Link>
            </div>
          </div>
        )}

        {/* Consolidated Project Info Panel - Top Left */}
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-card/95 backdrop-blur-sm rounded-lg shadow-lg border border-border p-4 max-w-sm">
            <div className="flex items-start gap-3">
              <Link href={flightId ? `/project/${projectId}/flight/${flightId}` : `/project/${projectId}`}>
                <Button variant="ghost" size="sm" className="flex-shrink-0 h-8 px-2 gap-1.5">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="text-xs">Return to {flightId ? 'Flight' : 'Project'}</span>
                </Button>
              </Link>
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-semibold truncate" style={{ fontFamily: "var(--font-display)" }}>
                  {flightId ? `Flight Map` : project.name}
                </h1>
                <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground mt-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {geotaggedMedia.length} locations
                  </span>
                  <span className="flex items-center gap-1">
                    <Image className="h-3 w-3" />
                    {mediaItems?.length || 0} total
                  </span>
                  {project.location && (
                    <span className="flex items-center gap-1">
                      <FolderOpen className="h-3 w-3" />
                      {project.location}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Map Controls - Top Right */}
        {geotaggedMedia.length > 0 && (
          <div className="absolute top-4 right-4 flex flex-col gap-2 z-10">
            {/* Zoom Controls */}
            <div className="bg-card/95 backdrop-blur-sm rounded-lg shadow-lg border border-border overflow-hidden">
              <Button
                variant="ghost"
                size="icon"
                className="rounded-none border-b border-border h-9 w-9"
                onClick={zoomIn}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="rounded-none h-9 w-9"
                onClick={zoomOut}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
            </div>

            {/* Map Type Toggle */}
            <div className="bg-card/95 backdrop-blur-sm rounded-lg shadow-lg border border-border p-1.5">
              <div className="flex flex-col gap-0.5">
                {[
                  { type: "satellite" as const, label: "Satellite" },
                  { type: "hybrid" as const, label: "Hybrid" },
                  { type: "terrain" as const, label: "Terrain" },
                  { type: "roadmap" as const, label: "Road" },
                ].map(({ type, label }) => (
                  <Button
                    key={type}
                    variant={mapType === type ? "default" : "ghost"}
                    size="sm"
                    className="justify-start h-7 text-xs"
                    onClick={() => changeMapType(type)}
                  >
                    <Layers className="h-3 w-3 mr-1.5" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            {/* Flight Path Toggle */}
            <Button
              variant={showFlightPath ? "default" : "outline"}
              size="sm"
              className="shadow-lg bg-card/95 backdrop-blur-sm h-8 text-xs"
              onClick={toggleFlightPath}
            >
              <Route className="h-3 w-3 mr-1.5" />
              Flight Path
            </Button>
          </div>
        )}

        {/* Legend - Bottom Left */}
        {geotaggedMedia.length > 0 && (
          <div className="absolute bottom-4 left-4 bg-card/95 backdrop-blur-sm rounded-lg shadow-lg border border-border p-2.5 z-10">
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Camera className="h-2.5 w-2.5 text-white" />
                </div>
                <span>Photo</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-4 h-4 rounded-full bg-red-500 flex items-center justify-center">
                  <Video className="h-2.5 w-2.5 text-white" />
                </div>
                <span>Video</span>
              </div>
              {showFlightPath && (
                <div className="flex items-center gap-1.5">
                  <div className="w-4 h-0.5 bg-emerald-500" />
                  <span>Path</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Media List Toggle Button - Right Edge */}
        {geotaggedMedia.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            className={`absolute top-1/2 -translate-y-1/2 z-20 bg-card/95 backdrop-blur-sm shadow-lg transition-all duration-300 ${
              sidebarOpen ? "right-[320px]" : "right-0 rounded-l-lg rounded-r-none"
            }`}
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            {sidebarOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}

        {/* Collapsible Sidebar - Media List */}
        {geotaggedMedia.length > 0 && (
          <div
            className={`absolute top-0 right-0 h-full w-80 bg-card/95 backdrop-blur-sm border-l border-border overflow-hidden flex flex-col transition-transform duration-300 z-10 ${
              sidebarOpen ? "translate-x-0" : "translate-x-full"
            }`}
          >
            <div className="p-4 border-b border-border">
              <h2 className="font-semibold text-sm" style={{ fontFamily: "var(--font-display)" }}>
                Media Locations
              </h2>
              <p className="text-xs text-muted-foreground">
                Click to center on map
              </p>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sortedGeotaggedMedia.map((media, index) => (
                <div
                  key={media.id}
                  className={`p-3 border-b border-border cursor-pointer hover:bg-muted/50 transition-colors ${
                    selectedMedia?.id === media.id ? "bg-primary/10 border-l-2 border-l-primary" : ""
                  }`}
                  onClick={() => centerOnMedia(media)}
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                      media.mediaType === "video" ? "bg-red-500" : "bg-emerald-500"
                    }`}>
                      <span className="text-white text-xs font-bold">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{media.filename}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {media.latitude.toFixed(6)}, {media.longitude.toFixed(6)}
                      </p>
                      {media.capturedAt && (
                        <p className="text-[10px] text-muted-foreground">
                          {new Date(media.capturedAt).toLocaleString()}
                        </p>
                      )}
                    </div>
                    {media.thumbnailUrl && (
                      <img
                        src={media.thumbnailUrl}
                        alt={media.filename}
                        className="w-10 h-10 object-cover rounded flex-shrink-0"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Selected Media Preview - Bottom Center */}
      {selectedMedia && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-border">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-1 right-1 h-6 w-6"
            onClick={() => setSelectedMedia(null)}
          >
            <X className="h-3 w-3" />
          </Button>
          <div className="flex gap-3">
            {selectedMedia.mediaType === "photo" ? (
              <div className="relative">
                <img
                  src={selectedMedia.thumbnailUrl || selectedMedia.url}
                  alt={selectedMedia.filename}
                  className="w-24 h-18 object-cover rounded cursor-pointer"
                  onClick={() => setEnlargedImage(selectedMedia)}
                  onError={(e) => {
                    // Fallback to full URL if thumbnail fails
                    const target = e.target as HTMLImageElement;
                    if (target.src !== selectedMedia.url) {
                      target.src = selectedMedia.url;
                    }
                  }}
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute bottom-1 right-1 h-5 w-5 bg-black/60 hover:bg-black/80 border-0"
                  onClick={() => setEnlargedImage(selectedMedia)}
                  title="Enlarge image"
                >
                  <Maximize2 className="h-3 w-3 text-white" />
                </Button>
              </div>
            ) : (
              <div className="relative">
                {selectedMedia.thumbnailUrl ? (
                  <>
                    <img
                      src={selectedMedia.thumbnailUrl}
                      alt={selectedMedia.filename}
                      className="w-24 h-18 object-cover rounded cursor-pointer"
                      onClick={() => setEnlargedImage(selectedMedia)}
                      onError={(e) => {
                        // Hide image and show video icon if thumbnail fails
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const fallback = target.nextElementSibling as HTMLElement;
                        if (fallback) fallback.style.display = 'flex';
                      }}
                    />
                    <div className="w-24 h-18 bg-muted rounded items-center justify-center hidden">
                      <Video className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
                        <Video className="h-4 w-4 text-white" />
                      </div>
                    </div>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="absolute bottom-1 right-1 h-5 w-5 bg-black/60 hover:bg-black/80 border-0"
                      onClick={() => setEnlargedImage(selectedMedia)}
                      title="Play video"
                    >
                      <Maximize2 className="h-3 w-3 text-white" />
                    </Button>
                  </>
                ) : (
                  <div className="w-24 h-18 bg-muted rounded flex items-center justify-center cursor-pointer" onClick={() => setEnlargedImage(selectedMedia)}>
                    <Video className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-xs mb-1 truncate pr-6">{selectedMedia.filename}</h3>
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <p className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {selectedMedia.latitude.toFixed(6)}, {selectedMedia.longitude.toFixed(6)}
                </p>
                {selectedMedia.altitude && (
                  <p className="flex items-center gap-1">
                    <Mountain className="h-3 w-3" />
                    {selectedMedia.altitude.toFixed(1)}m
                  </p>
                )}
                {selectedMedia.capturedAt && (
                  <p className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(selectedMedia.capturedAt).toLocaleString()}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Image/Video Viewer Modal */}
      {enlargedImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center"
          onClick={() => setEnlargedImage(null)}
        >
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 h-10 w-10 text-white hover:bg-white/20 z-10"
            onClick={() => setEnlargedImage(null)}
          >
            <X className="h-6 w-6" />
          </Button>
          <div className="flex flex-col max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <div className="bg-black/70 text-white p-3 rounded-t-lg">
              <h3 className="font-semibold text-sm mb-1">{enlargedImage.filename}</h3>
              <div className="text-xs text-gray-300 flex flex-wrap gap-4">
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {enlargedImage.latitude.toFixed(6)}, {enlargedImage.longitude.toFixed(6)}
                </span>
                {enlargedImage.altitude && (
                  <span className="flex items-center gap-1">
                    <Mountain className="h-3 w-3" />
                    {enlargedImage.altitude.toFixed(1)}m
                  </span>
                )}
                {enlargedImage.capturedAt && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(enlargedImage.capturedAt).toLocaleString()}
                  </span>
                )}
              </div>
            </div>
            <div className="relative flex-1 flex items-center justify-center">
              {enlargedImage.mediaType === 'video' ? (
                <video
                  src={enlargedImage.url}
                  controls
                  autoPlay
                  className="max-w-full max-h-full object-contain rounded-b-lg"
                />
              ) : (
                <img
                  src={enlargedImage.url}
                  alt={enlargedImage.filename}
                  className="max-w-full max-h-full object-contain rounded-b-lg"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
