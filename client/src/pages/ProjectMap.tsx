/**
 * Project Map Page — Full-screen Mapbox GL JS
 * Displays media locations with flight path visualization
 * Collapsible sidebar for media list, map style controls, legend
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { BackToDashboard } from "@/components/BackToDashboard";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { FlybyController, FlybyControllerHandle } from "@/components/FlybyController";
import { CityParkTour } from "@/components/CityParkTour";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  ArrowLeft,
  Camera,
  ChevronLeft,
  ChevronRight,
  FileText,
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

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const flybyRef = useRef<FlybyControllerHandle | null>(null);

  const [showFlightPath, setShowFlightPath] = useState(true);
  const [showOverlay, setShowOverlay] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<GeotaggedMedia | null>(null);
  const [mapStyle, setMapStyle] = useState<"satellite-streets" | "streets" | "outdoors" | "light">("satellite-streets");
  const [mapReady, setMapReady] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<GeotaggedMedia | null>(null);
  // Demo tour state — only shown for the City Park demo project
  const [showTour, setShowTour] = useState(isDemoProject);

  const { data: project, isLoading: projectLoading } = isDemoProject
    ? trpc.project.getDemo.useQuery({ id: projectId }, { enabled: projectId > 0 })
    : trpc.project.get.useQuery({ id: projectId }, { enabled: projectId > 0 });

  const { data: mediaItems, isLoading: mediaLoading } = isDemoProject
    ? trpc.media.listDemo.useQuery({ projectId, flightId, includeFlightMedia: false }, { enabled: projectId > 0 })
    : trpc.media.list.useQuery({ projectId, flightId, includeFlightMedia: false }, { enabled: projectId > 0 });

  const geotaggedMedia: GeotaggedMedia[] = (mediaItems || [])
    .filter((m) => m.latitude !== null && m.longitude !== null)
    .map((m) => ({
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

  const sortedGeotaggedMedia = useMemo(() => {
    return [...geotaggedMedia].sort((a, b) => {
      if (a.capturedAt && b.capturedAt) return new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime();
      if (a.capturedAt && !b.capturedAt) return -1;
      if (!a.capturedAt && b.capturedAt) return 1;
      return a.filename.localeCompare(b.filename);
    });
  }, [geotaggedMedia]);

  const getMapCenter = useCallback((): [number, number] => {
    if (geotaggedMedia.length === 0) return [-96.4719, 32.7479];
    const avgLat = geotaggedMedia.reduce((sum, m) => sum + m.latitude, 0) / geotaggedMedia.length;
    const avgLng = geotaggedMedia.reduce((sum, m) => sum + m.longitude, 0) / geotaggedMedia.length;
    return [avgLng, avgLat];
  }, [geotaggedMedia]);

  const styleMap: Record<string, string> = {
    "satellite-streets": "mapbox://styles/mapbox/satellite-streets-v12",
    streets: "mapbox://styles/mapbox/streets-v12",
    outdoors: "mapbox://styles/mapbox/outdoors-v12",
    light: "mapbox://styles/mapbox/light-v11",
  };

  // Initialize Mapbox
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) return;
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: styleMap[mapStyle],
      center: getMapCenter(),
      zoom: geotaggedMedia.length > 0 ? 15 : 12,
      pitchWithRotate: false,
    });

    map.addControl(new mapboxgl.NavigationControl(), "bottom-right");
    map.addControl(new mapboxgl.FullscreenControl(), "top-right");

    map.on("load", () => {
      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Change map style
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.setStyle(styleMap[mapStyle]);
    // Re-add sources/layers after style change
    map.once("style.load", () => {
      addFlightPathAndMarkers(map);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapStyle]);

  const addFlightPathAndMarkers = useCallback(
    (map: mapboxgl.Map) => {
      if (sortedGeotaggedMedia.length === 0) return;

      // Clear old markers
      markersRef.current.forEach((m) => m.remove());
      markersRef.current = [];

      // Remove old flight path
      if (map.getLayer("flight-path")) map.removeLayer("flight-path");
      if (map.getSource("flight-path-src")) map.removeSource("flight-path-src");

      // Flight path
      const flightPathCoords = sortedGeotaggedMedia.map((m) => [m.longitude, m.latitude]);

      map.addSource("flight-path-src", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "LineString", coordinates: flightPathCoords },
        },
      });

      map.addLayer({
        id: "flight-path",
        type: "line",
        source: "flight-path-src",
        paint: {
          "line-color": "#10b981",
          "line-width": 3,
          "line-opacity": showFlightPath ? 0.8 : 0,
        },
        layout: { "line-join": "round", "line-cap": "round" },
      });

      // GPS markers
      sortedGeotaggedMedia.forEach((media, index) => {
        const isVideo = media.mediaType === "video";
        const color = isVideo ? "#ef4444" : "#10B981";

        const el = document.createElement("div");
        el.setAttribute("data-media-id", String(media.id));
        el.style.cssText = `
          background: ${color}; color: white; border-radius: 50%;
          width: 30px; height: 30px; display: flex; align-items: center;
          justify-content: center; font-size: 12px; font-weight: bold;
          border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer; transition: transform 0.15s;
        `;
        el.textContent = String(index + 1);
        el.addEventListener("mouseenter", () => (el.style.transform = "scale(1.15)"));
        el.addEventListener("mouseleave", () => (el.style.transform = "scale(1)"));
        // Proper closure to capture unique media item
        el.addEventListener("click", () => setSelectedMedia(media));

        const thumbnailUrl = media.thumbnailUrl || media.url;
        const popupHtml = `
          <div style="max-width:240px;font-family:system-ui,sans-serif">
            <img src="${thumbnailUrl}" style="width:100%;border-radius:6px;margin-bottom:8px" onerror="this.style.display='none'" />
            <div style="font-size:13px;font-weight:600;margin-bottom:4px;color:#fff">${media.filename}</div>
            <div style="font-size:11px;color:#94a3b8">${media.latitude.toFixed(6)}, ${media.longitude.toFixed(6)}</div>
            ${media.altitude ? `<div style="font-size:11px;color:#94a3b8">Alt: ${media.altitude.toFixed(1)}m</div>` : ""}
            ${media.capturedAt ? `<div style="font-size:11px;color:#94a3b8">${new Date(media.capturedAt).toLocaleString()}</div>` : ""}
          </div>
        `;

        const popup = new mapboxgl.Popup({
          offset: 20,
          closeButton: true,
          maxWidth: "280px",
          className: "mapbox-media-popup",
        }).setHTML(popupHtml);

        const marker = new mapboxgl.Marker({
          element: el,
          color: '#50C878', // SkyVee Emerald Green
          scale: 0.65,      // Optimized small pin size
        })
          .setLngLat([media.longitude, media.latitude])
          .setPopup(popup)
          .addTo(map);

        popup.on("open", () => setSelectedMedia(media));

        markersRef.current.push(marker);
      });

      // Fit bounds
      if (sortedGeotaggedMedia.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        sortedGeotaggedMedia.forEach((m) => bounds.extend([m.longitude, m.latitude]));
        map.fitBounds(bounds, { padding: 60, maxZoom: 17 });
      }
    },
    [sortedGeotaggedMedia, showFlightPath]
  );

  // Add markers/path on data load
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || sortedGeotaggedMedia.length === 0) return;
    addFlightPathAndMarkers(map);
  }, [mapReady, sortedGeotaggedMedia, addFlightPathAndMarkers]);

  // ── Overlay rendering ─────────────────────────────────────────────────
  const overlays = useMemo(() => {
    const p = project as any;
    return (p?.overlays || []).filter((o: any) => o.isActive);
  }, [project]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || overlays.length === 0) return;

    const addOverlays = () => {
      for (const ov of overlays) {
        const srcId = `overlay-src-${ov.id}`;
        const layerId = `overlay-layer-${ov.id}`;

        // Remove if already exists
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(srcId)) map.removeSource(srcId);

        const coords = ov.coordinates;
        if (!coords || coords.length < 4) continue;

        map.addSource(srcId, {
          type: "image",
          url: ov.fileUrl,
          coordinates: coords,
        });

        map.addLayer({
          id: layerId,
          type: "raster",
          source: srcId,
          paint: {
            "raster-opacity": showOverlay ? parseFloat(ov.opacity ?? "0.6") : 0,
            "raster-fade-duration": 0,
          },
        });
      }
    };

    // If style is loaded, add immediately; otherwise wait
    if (map.isStyleLoaded()) {
      addOverlays();
    } else {
      map.once("style.load", addOverlays);
    }
  }, [mapReady, overlays, showOverlay]);

  const toggleOverlay = () => {
    const next = !showOverlay;
    setShowOverlay(next);
    const map = mapRef.current;
    if (!map) return;
    for (const ov of overlays) {
      const layerId = `overlay-layer-${ov.id}`;
      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, "raster-opacity", next ? parseFloat(ov.opacity ?? "0.6") : 0);
      }
    }
  };

  // Toggle flight path visibility
  const toggleFlightPath = () => {
    const newValue = !showFlightPath;
    setShowFlightPath(newValue);
    const map = mapRef.current;
    if (map && map.getLayer("flight-path")) {
      map.setPaintProperty("flight-path", "line-opacity", newValue ? 0.8 : 0);
    }
  };

  const zoomIn = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();

  const centerOnMedia = (media: GeotaggedMedia) => {
    mapRef.current?.flyTo({ center: [media.longitude, media.latitude], zoom: 18, duration: 600 });
    setSelectedMedia(media);
    // Open popup
    const marker = markersRef.current.find((m) => {
      return m.getElement()?.getAttribute("data-media-id") === String(media.id);
    });
    if (marker) {
      const popup = marker.getPopup();
      if (popup && !popup.isOpen()) marker.togglePopup();
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
      <div className="flex-1 relative">
        {geotaggedMedia.length > 0 ? (
          <div ref={mapContainerRef} className="w-full h-full" />
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

        {/* Project Info Panel - Top Left */}
        <div className="absolute top-4 left-4 z-10">
          <div className="bg-card/95 backdrop-blur-sm rounded-lg shadow-lg border border-border p-4 max-w-sm">
            <div className="flex items-start gap-3">
              <Link href={flightId ? `/project/${projectId}/flight/${flightId}` : `/project/${projectId}`}>
                <Button variant="ghost" size="sm" className="flex-shrink-0 h-8 px-2 gap-1.5">
                  <ArrowLeft className="h-4 w-4" />
                  <span className="text-xs">Return to {flightId ? "Flight" : "Project"}</span>
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
            <div className="bg-card/95 backdrop-blur-sm rounded-lg shadow-lg border border-border overflow-hidden">
              <Button variant="ghost" size="icon" className="rounded-none border-b border-border h-9 w-9" onClick={zoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="rounded-none h-9 w-9" onClick={zoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
            </div>

            <div className="bg-card/95 backdrop-blur-sm rounded-lg shadow-lg border border-border p-1.5">
              <div className="flex flex-col gap-0.5">
                {[
                  { type: "satellite-streets" as const, label: "Satellite" },
                  { type: "streets" as const, label: "Streets" },
                  { type: "outdoors" as const, label: "Outdoors" },
                  { type: "light" as const, label: "Light" },
                ].map(({ type, label }) => (
                  <Button
                    key={type}
                    variant={mapStyle === type ? "default" : "ghost"}
                    size="sm"
                    className="justify-start h-7 text-xs"
                    onClick={() => setMapStyle(type)}
                  >
                    <Layers className="h-3 w-3 mr-1.5" />
                    {label}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              variant={showFlightPath ? "default" : "outline"}
              size="sm"
              className="shadow-lg bg-card/95 backdrop-blur-sm h-8 text-xs"
              onClick={toggleFlightPath}
            >
              <Route className="h-3 w-3 mr-1.5" />
              Flight Path
            </Button>

            {overlays.length > 0 && (
              <Button
                variant={showOverlay ? "default" : "outline"}
                size="sm"
                className="shadow-lg bg-card/95 backdrop-blur-sm h-8 text-xs"
                onClick={toggleOverlay}
              >
                <FileText className="h-3 w-3 mr-1.5" />
                Utility PDF
              </Button>
            )}
          </div>
        )}

        {/* Cinematic Flyby Controller - Bottom Right */}
        {geotaggedMedia.length > 0 && (
          <FlybyController ref={flybyRef} mapRef={mapRef} mapLoaded={mapReady} />
        )}

        {/* City Park Guided Tour — rendered outside map container below */}

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

        {/* Media List Toggle */}
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

        {/* Collapsible Sidebar */}
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
              <p className="text-xs text-muted-foreground">Click to center on map</p>
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
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                        media.mediaType === "video" ? "bg-red-500" : "bg-emerald-500"
                      }`}
                    >
                      <span className="text-white text-xs font-bold">{index + 1}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{media.filename}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {media.latitude.toFixed(6)}, {media.longitude.toFixed(6)}
                      </p>
                      {media.capturedAt && (
                        <p className="text-[10px] text-muted-foreground">{new Date(media.capturedAt).toLocaleString()}</p>
                      )}
                    </div>
                    {media.thumbnailUrl && (
                      <img src={media.thumbnailUrl} alt={media.filename} className="w-10 h-10 object-cover rounded flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* City Park Guided Tour — Force-Visible Pattern
           Placed OUTSIDE the map container so no parent stacking context can clip it.
           Uses fixed inset-0 pointer-events-none wrapper at z-[9999] to guarantee
           it always renders above the Mapbox canvas and all its controls. */}
      {isDemoProject && showTour && (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          <div className="pointer-events-auto">
            <CityParkTour
              onLaunchFlyby={() => {
                setTimeout(() => flybyRef.current?.startFlyby(), 400);
              }}
              onClose={() => setShowTour(false)}
            />
          </div>
        </div>
      )}

      {/* Selected Media Preview */}
      {selectedMedia && (
        <div className="absolute bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-background/95 backdrop-blur-sm rounded-lg shadow-lg p-3 border border-border z-10">
          <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={() => setSelectedMedia(null)}>
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
                    const target = e.target as HTMLImageElement;
                    if (target.src !== selectedMedia.url) target.src = selectedMedia.url;
                  }}
                />
                <Button
                  variant="secondary"
                  size="icon"
                  className="absolute bottom-1 right-1 h-5 w-5 bg-black/60 hover:bg-black/80 border-0"
                  onClick={() => setEnlargedImage(selectedMedia)}
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
                    />
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-8 h-8 rounded-full bg-black/60 flex items-center justify-center">
                        <Video className="h-4 w-4 text-white" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div
                    className="w-24 h-18 bg-muted rounded flex items-center justify-center cursor-pointer"
                    onClick={() => setEnlargedImage(selectedMedia)}
                  >
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

      {/* Fullscreen Viewer Modal */}
      {enlargedImage && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={() => setEnlargedImage(null)}>
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
              {enlargedImage.mediaType === "video" ? (
                <video src={enlargedImage.url} controls autoPlay className="max-w-full max-h-full object-contain rounded-b-lg" />
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
