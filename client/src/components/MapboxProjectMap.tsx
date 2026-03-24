/**
 * MapboxProjectMap — Unified Mapbox GL JS map for the entire project
 *
 * Combines:
 *   1. GPS Pins (numbered markers with photo/video distinction)
 *   2. Flight Path (GeoJSON LineString layer) with toggle
 *   3. Overlay Editor (image source with 4-corner drag, rotation, 2-point snap)
 *   4. Enhanced Overlay Manager sidebar:
 *      - Overlay rename (inline edit)
 *      - Opacity slider (persisted)
 *      - Visibility toggle
 *      - Hide/Show Flight Path
 *      - Measurement tool (distance + area)
 *      - Lock overlay position
 *      - Fit to overlay bounds
 *      - Fullscreen map mode
 *      - Edit Alignment / 2-Point Snap / Reset / Delete
 */

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  Check,
  ChevronRight,
  Crosshair,
  Eye,
  EyeOff,
  Layers,
  Lock,
  Maximize,
  Minimize,
  Move,
  Pencil,
  Play,
  Pause,
  Route,
  RotateCcw,
  Ruler,
  Save,
  Target,
  Trash2,
  Unlock,
  Upload,
  X,
  MapPin,
  Navigation,
  Plane,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MapboxFlyControls } from "@/components/MapboxFlyControls";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { uploadProjectOverlay } from "@/app/actions/overlay";
import type { Media } from "../../../drizzle/schema";
import turfDistance from "@turf/distance";
import turfArea from "@turf/area";
import { polygon as turfPolygon, point as turfPoint } from "@turf/helpers";

// ── Re-export alignment helpers from MapboxOverlayView ──────────────────────
export {
  parseCoords,
  centroid,
  rotatePoint,
  applyRotation,
  topCenter,
  calculateTwoPointTransform,
} from "./MapboxOverlayView";

import {
  parseCoords,
  centroid,
  rotatePoint,
  applyRotation,
  topCenter,
  calculateTwoPointTransform,
  type OverlayData,
} from "./MapboxOverlayView";

// ── Types ────────────────────────────────────────────────────────────────────

export interface MapboxProjectMapHandle {
  panToMedia: (latitude: number, longitude: number, mediaId?: string) => void;
  getMap: () => mapboxgl.Map | null;
  isMapLoaded: () => boolean;
}

interface MapboxProjectMapProps {
  projectId: number;
  projectName: string;
  flightId?: number;
  isDemoProject?: boolean;
  overlays?: OverlayData[];
  onOverlayUpdated?: () => void;
  heightClass?: string;
  showFullScreenLink?: boolean;
}

// ── Corner labels & colors ──────────────────────────────────────────────────
const CORNER_LABELS = ["NW", "NE", "SE", "SW"];
const CORNER_COLORS = ["#10B981", "#10B981", "#10B981", "#10B981"];
const TERRAIN_SOURCE_ID = "pilot-terrain-dem";
const BUILDINGS_LAYER_ID = "pilot-3d-buildings";
const TERRAIN_EXAGGERATION = 1.25;

// ── Measurement helpers ─────────────────────────────────────────────────────

function formatDistance(meters: number): string {
  if (meters < 1) return `${(meters * 100).toFixed(1)} cm`;
  if (meters < 1000) return `${meters.toFixed(1)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
}

function formatDistanceFeet(meters: number): string {
  const feet = meters * 3.28084;
  if (feet < 5280) return `${feet.toFixed(1)} ft`;
  return `${(feet / 5280).toFixed(2)} mi`;
}

function formatArea(sqMeters: number): string {
  if (sqMeters < 10000) return `${sqMeters.toFixed(1)} m²`;
  const hectares = sqMeters / 10000;
  if (hectares < 100) return `${hectares.toFixed(2)} ha`;
  return `${(sqMeters / 1000000).toFixed(3)} km²`;
}

function formatAreaFeet(sqMeters: number): string {
  const sqFeet = sqMeters * 10.7639;
  if (sqFeet < 43560) return `${sqFeet.toFixed(0)} ft²`;
  return `${(sqFeet / 43560).toFixed(2)} acres`;
}

// ── Component ────────────────────────────────────────────────────────────────

export const MapboxProjectMap = forwardRef<MapboxProjectMapHandle, MapboxProjectMapProps>(
  (props, ref) => {
    const {
      projectId,
      projectName,
      flightId,
      isDemoProject = false,
      overlays = [],
      onOverlayUpdated,
      heightClass = "h-[600px]",
      showFullScreenLink = true,
    } = props;

    // ── Refs ──────────────────────────────────────────────────────────────────
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapWrapperRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<mapboxgl.Map | null>(null);
    const gpsMarkersRef = useRef<mapboxgl.Marker[]>([]); // Kept for compatibility, now unused with GeoJSON layer
    const popupRef = useRef<mapboxgl.Popup | null>(null);
    const cornerMarkersRef = useRef<mapboxgl.Marker[]>([]);
    const rotationMarkerRef = useRef<mapboxgl.Marker | null>(null);
    const snapMarkersRef = useRef<mapboxgl.Marker[]>([]);
    const measureMarkersRef = useRef<mapboxgl.Marker[]>([]);
    const prePilotCameraRef = useRef<{
      center: [number, number];
      zoom: number;
      bearing: number;
      pitch: number;
    } | null>(null);
    const autoFollowStopRef = useRef(false);
    // Tracks whether markers have been placed for the current sortedMedia set
    const markersRenderedForRef = useRef<string>("");

    // ── State ─────────────────────────────────────────────────────────────────
    const [mapLoaded, setMapLoaded] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
    const [enlargedMedia, setEnlargedMedia] = useState<Media | null>(null);

    // Overlay state
    const [editMode, setEditMode] = useState(false);
    const [editingOverlayId, setEditingOverlayId] = useState<number | null>(null);
    const [editCorners, setEditCorners] = useState<[number, number][] | null>(null);
    const [editRotation, setEditRotation] = useState(0);
    const [aspectLocked, setAspectLocked] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [opacityMap, setOpacityMap] = useState<Record<number, number>>({});
    const [visibilityMap, setVisibilityMap] = useState<Record<number, boolean>>({});
    const [isDeleting, setIsDeleting] = useState(false);
    const [isUploadingOverlay, setIsUploadingOverlay] = useState(false);
    const overlayFileInputRef = useRef<HTMLInputElement>(null);

    // 2-Point Snap state
    const [snapMode, setSnapMode] = useState(false);
    const [snapStep, setSnapStep] = useState<"anchorA" | "targetA" | "anchorB" | "targetB" | "ready">("anchorA");
    const [anchorA, setAnchorA] = useState<{ lng: number; lat: number } | null>(null);
    const [targetA, setTargetA] = useState<{ lng: number; lat: number } | null>(null);
    const [anchorB, setAnchorB] = useState<{ lng: number; lat: number } | null>(null);
    const [targetB, setTargetB] = useState<{ lng: number; lat: number } | null>(null);

    // ── NEW: Enhanced overlay controls state ──
    const [flightPathVisible, setFlightPathVisible] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [overlayLocked, setOverlayLocked] = useState<Record<number, boolean>>({});
    const [renamingOverlayId, setRenamingOverlayId] = useState<number | null>(null);
    const [renameValue, setRenameValue] = useState("");
    const [pilotViewEnabled, setPilotViewEnabled] = useState(false);
    const [pilotTerrainEnabled, setPilotTerrainEnabled] = useState(true);
    const [pilotBuildingsEnabled, setPilotBuildingsEnabled] = useState(true);
    const [autoFollowActive, setAutoFollowActive] = useState(false);
    const [autoFollowIndex, setAutoFollowIndex] = useState(0);
    const [autoFollowSpeed, setAutoFollowSpeed] = useState<1 | 2 | 3>(1);

    // Measurement state
    const [measureMode, setMeasureMode] = useState(false);
    const [measurePoints, setMeasurePoints] = useState<[number, number][]>([]);
    const [measureResult, setMeasureResult] = useState<{ distance: number; area: number } | null>(null);

    const updateOverlayOpacity = trpc.project.updateOverlayOpacity.useMutation();
    const renameOverlayMutation = trpc.project.renameOverlay.useMutation();

    // ── Fetch media ─────────────────────────────────────────────────────────
    const { data: mediaList, isLoading } = isDemoProject
      ? trpc.media.listDemo.useQuery({ projectId, flightId })
      : trpc.media.list.useQuery({ projectId, flightId });

    const mediaWithGPS = useMemo(() => {
      return mediaList?.filter((m) => m.latitude && m.longitude) || [];
    }, [mediaList]);

    const sortedMedia = useMemo(() => {
      return [...mediaWithGPS].sort((a, b) => {
        if (a.capturedAt && b.capturedAt)
          return new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime();
        if (a.capturedAt && !b.capturedAt) return -1;
        if (!a.capturedAt && b.capturedAt) return 1;
        return a.filename.localeCompare(b.filename);
      });
    }, [mediaWithGPS]);

    const getCenter = useCallback((): [number, number] => {
      if (mediaWithGPS.length > 0) {
        const sumLat = mediaWithGPS.reduce((sum, m) => sum + parseFloat(m.latitude!), 0);
        const sumLng = mediaWithGPS.reduce((sum, m) => sum + parseFloat(m.longitude!), 0);
        return [sumLng / mediaWithGPS.length, sumLat / mediaWithGPS.length];
      }
      return [-96.797, 32.7767];
    }, [mediaWithGPS]);

    // ── Active overlays ─────────────────────────────────────────────────────
    const activeOverlays = useMemo(() => overlays.filter((o) => o.isActive), [overlays]);

    // Init overlay opacity/visibility from props
    useEffect(() => {
      const initOp: Record<number, number> = {};
      const initVis: Record<number, boolean> = {};
      for (const ov of overlays) {
        if (!(ov.id in opacityMap)) {
          const val = typeof ov.opacity === "string" ? parseFloat(ov.opacity) : (ov.opacity ?? 0.7);
          initOp[ov.id] = isNaN(val) ? 0.7 : val;
        }
        if (!(ov.id in visibilityMap)) initVis[ov.id] = true;
      }
      if (Object.keys(initOp).length > 0) setOpacityMap((prev) => ({ ...prev, ...initOp }));
      if (Object.keys(initVis).length > 0) setVisibilityMap((prev) => ({ ...prev, ...initVis }));
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [overlays]);

    // ── Expose panToMedia to parent ─────────────────────────────────────────
    useImperativeHandle(ref, () => ({
      panToMedia: (latitude: number, longitude: number, mediaId?: string) => {
        const map = mapRef.current;
        if (!map) return;
        map.flyTo({ center: [longitude, latitude], zoom: 20, duration: 800 });
        if (mediaId) {
          setTimeout(() => {
            const marker = gpsMarkersRef.current.find((m) => {
              const el = m.getElement();
              return el?.getAttribute("data-media-id") === String(mediaId);
            });
            if (marker) {
              const popup = marker.getPopup();
              if (popup && !popup.isOpen()) marker.togglePopup();
            }
          }, 900);
        }
      },
      getMap: () => mapRef.current,
      isMapLoaded: () => mapLoaded,
    }), [mapLoaded]);

    // ── Initialize Mapbox map ───────────────────────────────────────────────
    // NOTE: Map init is intentionally NOT dependent on isLoading or sortedMedia.
    // The map initializes once; the data watcher below handles marker placement
    // whenever sortedMedia arrives (before or after mapLoaded becomes true).
    useEffect(() => {
      // Skip if already initialized
      if (mapRef.current) return;

      const token = import.meta.env.VITE_MAPBOX_TOKEN;
      if (!token) {
        console.error("[MapboxProjectMap] VITE_MAPBOX_TOKEN is not set");
        return;
      }
      mapboxgl.accessToken = token;

      let animationFrameId: number;

      const initializeMap = () => {
        const container = mapContainerRef.current;
        if (!container) {
          animationFrameId = requestAnimationFrame(initializeMap);
          return;
        }

        // POLLING CHECK: Ensure container has physical pixels before creating WebGL context
        if (container.clientHeight === 0) {
          console.log("[Mapbox] Container height is 0, polling next frame...");
          animationFrameId = requestAnimationFrame(initializeMap);
          return;
        }

        console.log(`[Mapbox] Container size confirmed (${container.clientWidth}x${container.clientHeight}). Initializing WebGL...`);

        const map = new mapboxgl.Map({
          container,
          style: "mapbox://styles/mapbox/satellite-streets-v12",
          center: [-96.797, 32.7767], // Default center; data watcher will flyTo markers
          zoom: 12,
          pitchWithRotate: false,
          trackResize: true,
        });

        map.addControl(new mapboxgl.NavigationControl(), "bottom-right");

        // Force one final resize after the first frame to ensure canvas fills container
        map.on("load", () => {
          mapRef.current = map;
          setMapLoaded(true);
          requestAnimationFrame(() => map.resize());
        });

        const handleResize = () => map.resize();
        window.addEventListener("resize", handleResize);
        map.on("remove", () => window.removeEventListener("resize", handleResize));
      };

      initializeMap();

      return () => {
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
        setMapLoaded(false);
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // ← Run once on mount only

    // ── Data Watcher: Add GPS markers + flight path ─────────────────────────
    // This effect fires whenever sortedMedia OR mapLoaded changes.
    // It handles the race condition where data may arrive before or after the map.
    // A stable key (sorted IDs) prevents redundant re-renders.
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded || sortedMedia.length === 0) return;

      // Build a stable key from sorted media IDs to avoid re-rendering if data hasn't changed
      const newKey = sortedMedia.map((m) => m.id).join(",");
      if (markersRenderedForRef.current === newKey) {
        // Data hasn't changed, but we still need to update the GeoJSON source in case visibility changed
        const mediaGeoJSON = {
          type: 'FeatureCollection' as const,
          features: sortedMedia.map((media) => ({
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: [parseFloat(media.longitude!), parseFloat(media.latitude!)],
            },
            properties: {
              id: media.id,
              filename: media.filename,
              latitude: media.latitude,
              longitude: media.longitude,
              altitude: media.altitude,
              mediaType: media.mediaType,
              thumbnailUrl: media.thumbnailUrl || media.url,
              url: media.url,
            },
          })),
        };
        if (map.getSource('media-source')) {
          (map.getSource('media-source') as mapboxgl.GeoJSONSource).setData(mediaGeoJSON);
        }
        return;
      }
      markersRenderedForRef.current = newKey;

      console.log(`[MapboxProjectMap] Data watcher triggered: ${sortedMedia.length} GPS points, mapLoaded=${mapLoaded}. Using GeoJSON Symbol Layer.`);

      // Clear old GPS markers (legacy - no longer used with GeoJSON layer)
      // gpsMarkersRef.current.forEach((m) => m.remove());
      // gpsMarkersRef.current = [];

      // Clear old flight path and media pins layer
      if (map.getLayer("flight-path")) map.removeLayer("flight-path");
      if (map.getSource("flight-path-src")) map.removeSource("flight-path-src");
      if (map.getLayer("media-pins")) map.removeLayer("media-pins");
      if (map.getSource("media-source")) map.removeSource("media-source");

      // ── Flight Path (GeoJSON LineString) ──
      const flightPathCoords = sortedMedia.map((m) => [
        parseFloat(m.longitude!),
        parseFloat(m.latitude!),
      ]);

      map.addSource("flight-path-src", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: {
            type: "LineString",
            coordinates: flightPathCoords,
          },
        },
      });

      map.addLayer({
        id: "flight-path",
        type: "line",
        source: "flight-path-src",
        paint: {
          "line-color": "#10b981",
          "line-width": 3,
          "line-opacity": flightPathVisible ? 0.8 : 0,
        },
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
      });

      // ── Create and Load Slim Pin SVG (MAPIT Logo Style) ──
      const SLIM_PIN_SVG = `
        <svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M16 42C16 42 32 26.2426 32 16C32 7.16344 24.8366 0 16 0C7.16344 0 0 7.16344 0 16C0 26.2426 16 42 16 42Z" fill="#50C878"/>
          <circle cx="16" cy="16" r="6" fill="white"/>
        </svg>
      `;

      const img = new Image(32, 42);
      img.onload = () => {
        if (!map.hasImage('skyvee-pin')) {
          map.addImage('skyvee-pin', img);
        }
      };
      img.src = 'data:image/svg+xml;base64,' + btoa(SLIM_PIN_SVG);

      // ── Create GeoJSON Source for Media Points ──
      const mediaGeoJSON = {
        type: 'FeatureCollection' as const,
        features: sortedMedia.map((media) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [parseFloat(media.longitude!), parseFloat(media.latitude!)],
          },
          properties: {
            id: media.id,
            filename: media.filename,
            latitude: media.latitude,
            longitude: media.longitude,
            altitude: media.altitude,
            mediaType: media.mediaType,
            thumbnailUrl: media.thumbnailUrl || media.url,
            url: media.url,
          },
        })),
      };

      // ── Add or Update Media Source and Symbol Layer ──
      if (map.getSource('media-source')) {
        (map.getSource('media-source') as mapboxgl.GeoJSONSource).setData(mediaGeoJSON);
      } else {
        map.addSource('media-source', {
          type: 'geojson',
          data: mediaGeoJSON,
        });

        map.addLayer({
          id: 'media-pins',
          type: 'symbol',
          source: 'media-source',
          layout: {
            'icon-image': 'skyvee-pin',
            'icon-size': 0.45,           // Scaled down to be slim and needle-like
            'icon-anchor': 'bottom',     // Pointy end on the coordinate
            'icon-allow-overlap': true,
          },
        });
      }

      // ── Click Handler for Media Pins ──
      const handleMediaPinClick = (e: mapboxgl.MapLayerMouseEvent) => {
        const feature = e.features?.[0];
        if (!feature || !feature.properties) return;

        const props = feature.properties as any;

        setSelectedMedia({
          id: props.id,
          filename: props.filename,
          latitude: parseFloat(props.latitude),
          longitude: parseFloat(props.longitude),
          altitude: props.altitude ? parseFloat(props.altitude) : null,
          mediaType: props.mediaType,
          thumbnailUrl: props.thumbnailUrl,
          url: props.url,
        } as any);

        const thumbnailUrl = props.thumbnailUrl;
        const popupHtml = `
          <div style="max-width:220px;font-family:system-ui,sans-serif">
            <img src="${thumbnailUrl}" style="width:100%;border-radius:6px;margin-bottom:8px" onerror="this.style.display='none'" />
            <div style="font-size:13px;font-weight:600;margin-bottom:4px;color:#fff">${props.filename}</div>
            <div style="font-size:11px;color:#94a3b8">${parseFloat(props.latitude).toFixed(6)}, ${parseFloat(props.longitude).toFixed(6)}</div>
            ${props.altitude ? `<div style="font-size:11px;color:#94a3b8">Alt: ${parseFloat(props.altitude).toFixed(1)}m</div>` : ''}
          </div>
        `;

        new mapboxgl.Popup({
          offset: 25,
          closeButton: true,
          maxWidth: '260px',
          className: 'mapbox-media-popup',
        })
          .setLngLat((feature.geometry as any).coordinates as [number, number])
          .setHTML(popupHtml)
          .addTo(map);
      };

      // ── Hover Cursor Changes ──
      const handleMediaPinMouseEnter = () => {
        map.getCanvas().style.cursor = 'pointer';
      };

      const handleMediaPinMouseLeave = () => {
        map.getCanvas().style.cursor = '';
      };

      // Remove old event listeners if they exist
      map.off('click', 'media-pins', handleMediaPinClick);
      map.off('mouseenter', 'media-pins', handleMediaPinMouseEnter);
      map.off('mouseleave', 'media-pins', handleMediaPinMouseLeave);

      // Add new event listeners
      map.on('click', 'media-pins', handleMediaPinClick);
      map.on('mouseenter', 'media-pins', handleMediaPinMouseEnter);
      map.on('mouseleave', 'media-pins', handleMediaPinMouseLeave);

      // Fit bounds to all markers
      if (sortedMedia.length > 1) {
        const bounds = new mapboxgl.LngLatBounds();
        sortedMedia.forEach((m) => {
          bounds.extend([parseFloat(m.longitude!), parseFloat(m.latitude!)]);
        });
        map.fitBounds(bounds, { padding: 60, maxZoom: 17 });
      }
    }, [sortedMedia, mapLoaded, setSelectedMedia]);

    // ── Toggle flight path visibility ───────────────────────────────────────
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded) return;
      if (map.getLayer("flight-path")) {
        map.setPaintProperty("flight-path", "line-opacity", flightPathVisible ? 0.8 : 0);
      }
    }, [flightPathVisible, mapLoaded]);

    // ── Render overlay image sources ────────────────────────────────────────
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded) return;

      for (const ov of activeOverlays) {
        const srcId = `overlay-src-${ov.id}`;
        const layerId = `overlay-layer-${ov.id}`;
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(srcId)) map.removeSource(srcId);
      }

      for (const ov of activeOverlays) {
        const coords = parseCoords(ov.coordinates);
        if (!coords || coords.length < 4) continue;

        const visible = visibilityMap[ov.id] ?? true;
        const opacity = opacityMap[ov.id] ?? 0.7;
        const srcId = `overlay-src-${ov.id}`;
        const layerId = `overlay-layer-${ov.id}`;

        try {
          map.addSource(srcId, {
            type: "image",
            url: ov.fileUrl,
            coordinates: coords as [[number, number], [number, number], [number, number], [number, number]],
          });

          const beforeLayerId = map.getLayer("flight-path") ? "flight-path" : undefined;

          map.addLayer(
            {
              id: layerId,
              type: "raster",
              source: srcId,
              paint: {
                "raster-opacity": visible ? opacity : 0,
                "raster-fade-duration": 0,
              },
            },
            beforeLayerId
          );
        } catch (err) {
          console.error("[MapboxProjectMap] Failed to add overlay", ov.id, err);
        }
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeOverlays, mapLoaded, visibilityMap, opacityMap]);

    // ── Overlay helpers ─────────────────────────────────────────────────────

    const handleOpacityChange = useCallback((ovId: number, value: number) => {
      setOpacityMap((prev) => ({ ...prev, [ovId]: value }));
      const map = mapRef.current;
      if (!map) return;
      const layerId = `overlay-layer-${ovId}`;
      if (map.getLayer(layerId)) {
        map.setPaintProperty(layerId, "raster-opacity", value);
      }
    }, []);

    const handleOpacityCommit = useCallback((ovId: number, value: number) => {
      updateOverlayOpacity.mutate(
        { overlayId: ovId, projectId, opacity: value },
        { onError: (err) => toast.error("Failed to save opacity: " + err.message) }
      );
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [projectId]);

    const handleToggleVisibility = useCallback((ovId: number) => {
      setVisibilityMap((prev) => {
        const next = { ...prev, [ovId]: !prev[ovId] };
        const map = mapRef.current;
        if (map) {
          const layerId = `overlay-layer-${ovId}`;
          if (map.getLayer(layerId)) {
            map.setPaintProperty(layerId, "raster-opacity", next[ovId] ? (opacityMap[ovId] ?? 0.7) : 0);
          }
        }
        return next;
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [opacityMap]);

    const updateOverlaySource = useCallback((ovId: number, corners: [number, number][]) => {
      const map = mapRef.current;
      if (!map) return;
      const srcId = `overlay-src-${ovId}`;
      const src = map.getSource(srcId) as mapboxgl.ImageSource | undefined;
      if (src) {
        src.setCoordinates(corners as [[number, number], [number, number], [number, number], [number, number]]);
      }
    }, []);

    const removeOverlayFromMap = useCallback((ovId: number) => {
      const map = mapRef.current;
      if (!map) return;
      const srcId = `overlay-src-${ovId}`;
      const layerId = `overlay-layer-${ovId}`;
      try {
        if (map.getLayer(layerId)) map.removeLayer(layerId);
        if (map.getSource(srcId)) map.removeSource(srcId);
      } catch (err) {
        console.warn(`[MapboxProjectMap] Error removing overlay ${ovId}:`, err);
      }
    }, []);

    // ── Save coordinates (blocking PUT) ─────────────────────────────────────
    const saveCoordinates = useCallback(async (ovId: number, corners: [number, number][], rotation?: number): Promise<boolean> => {
      try {
        const resp = await fetch(`/api/projects/${projectId}/overlays/${ovId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            coordinates: corners,
            ...(rotation !== undefined && rotation !== 0 ? { rotation } : {}),
          }),
        });
        if (!resp.ok) {
          const errText = await resp.text();
          throw new Error(errText || `HTTP ${resp.status}`);
        }
        return true;
      } catch (err: any) {
        console.error("[MapboxProjectMap] Save failed:", err);
        toast.error("Failed to save: " + err.message);
        return false;
      }
    }, [projectId]);

    const autoSave = useCallback((ovId: number, corners: [number, number][], rotation?: number) => {
      saveCoordinates(ovId, corners, rotation);
    }, [saveCoordinates]);

    // ── Edit mode ───────────────────────────────────────────────────────────
    const clearEditMarkers = useCallback(() => {
      cornerMarkersRef.current.forEach((m) => m.remove());
      cornerMarkersRef.current = [];
      if (rotationMarkerRef.current) {
        rotationMarkerRef.current.remove();
        rotationMarkerRef.current = null;
      }
    }, []);

    const handleStartEdit = useCallback((ov: OverlayData) => {
      if (overlayLocked[ov.id]) {
        toast.error("Overlay is locked. Unlock it first.");
        return;
      }
      const coords = parseCoords(ov.coordinates);
      if (!coords) {
        toast.error("Cannot edit: invalid coordinates");
        return;
      }
      setEditingOverlayId(ov.id);
      setEditCorners([...coords]);
      const rot = typeof ov.rotation === "string" ? parseFloat(ov.rotation) : (ov.rotation ?? 0);
      setEditRotation(typeof rot === "number" && !isNaN(rot) ? rot : 0);
      setEditMode(true);
    }, [overlayLocked]);

    const handleCancelEdit = useCallback(() => {
      clearEditMarkers();
      setEditMode(false);
      setEditingOverlayId(null);
      setEditCorners(null);
      setEditRotation(0);
      for (const ov of activeOverlays) {
        const coords = parseCoords(ov.coordinates);
        if (coords) updateOverlaySource(ov.id, coords);
      }
    }, [clearEditMarkers, activeOverlays, updateOverlaySource]);

    const handleFinishEdit = useCallback(async () => {
      if (!editCorners || editingOverlayId == null) return;
      setIsSaving(true);
      try {
        const success = await saveCoordinates(editingOverlayId, editCorners, editRotation);
        if (!success) {
          setIsSaving(false);
          return;
        }
        toast.success("Overlay position saved");
        clearEditMarkers();
        setEditMode(false);
        setEditingOverlayId(null);
        setEditCorners(null);
        setEditRotation(0);
        onOverlayUpdated?.();
      } catch (err: any) {
        toast.error("Failed to save: " + err.message);
      } finally {
        setIsSaving(false);
      }
    }, [editCorners, editingOverlayId, editRotation, saveCoordinates, onOverlayUpdated, clearEditMarkers]);

    // ── Create draggable corner markers ─────────────────────────────────────
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded || !editMode || !editCorners || editCorners.length < 4 || editingOverlayId == null) {
        clearEditMarkers();
        return;
      }

      clearEditMarkers();
      map.dragRotate.disable();
      map.touchZoomRotate.disableRotation();

      const currentCorners: [number, number][] = [...editCorners];

      currentCorners.forEach(([lng, lat], i) => {
        const el = document.createElement("div");
        el.style.cssText = `
          width: 28px; height: 28px; border-radius: 50%;
          background: ${CORNER_COLORS[i]}; border: 3px solid white;
          cursor: grab; box-shadow: 0 2px 8px rgba(0,0,0,0.5);
          display: flex; align-items: center; justify-content: center;
          font-size: 9px; font-weight: 700; color: white;
          user-select: none; z-index: 10;
        `;
        el.textContent = CORNER_LABELS[i];

        const marker = new mapboxgl.Marker({ element: el, draggable: true })
          .setLngLat([lng, lat])
          .addTo(map);

        marker.on("dragstart", () => { map.dragPan.disable(); });

        marker.on("drag", () => {
          const pos = marker.getLngLat();
          currentCorners[i] = [pos.lng, pos.lat];

          if (aspectLocked) {
            if (i === 0 || i === 2) {
              currentCorners[1] = [currentCorners[1][0], currentCorners[0][1]];
              currentCorners[3] = [currentCorners[0][0], currentCorners[3][1]];
              currentCorners[2] = [currentCorners[1][0], currentCorners[3][1]];
            } else {
              currentCorners[0] = [currentCorners[0][0], currentCorners[1][1]];
              currentCorners[2] = [currentCorners[1][0], currentCorners[2][1]];
              currentCorners[3] = [currentCorners[0][0], currentCorners[3][1]];
            }
          }

          const source = map.getSource(`overlay-src-${editingOverlayId}`) as mapboxgl.ImageSource | undefined;
          if (source) {
            source.setCoordinates(currentCorners as [[number, number], [number, number], [number, number], [number, number]]);
          }

          cornerMarkersRef.current.forEach((m, j) => {
            if (j !== i) m.setLngLat(currentCorners[j] as [number, number]);
          });

          const tc = topCenter(currentCorners);
          if (rotationMarkerRef.current) rotationMarkerRef.current.setLngLat(tc);
        });

        marker.on("dragend", () => {
          map.dragPan.enable();
          setEditCorners([...currentCorners]);
          autoSave(editingOverlayId, currentCorners, editRotation);
        });

        cornerMarkersRef.current.push(marker);
      });

      // Rotation handle
      const tc = topCenter(currentCorners);
      const rotEl = document.createElement("div");
      rotEl.style.cssText = `
        width: 24px; height: 24px; border-radius: 50%;
        background: #f59e0b; border: 2px solid white;
        cursor: grab; box-shadow: 0 2px 8px rgba(0,0,0,0.5);
        display: flex; align-items: center; justify-content: center;
        font-size: 12px; user-select: none; z-index: 10;
      `;
      rotEl.textContent = "↻";

      let prevAngle = 0;
      const rotMarker = new mapboxgl.Marker({ element: rotEl, draggable: true })
        .setLngLat(tc)
        .addTo(map);

      rotMarker.on("dragstart", () => {
        map.dragPan.disable();
        const c = centroid(currentCorners);
        const pos = rotMarker.getLngLat();
        prevAngle = Math.atan2(pos.lat - c[1], pos.lng - c[0]);
      });

      rotMarker.on("drag", () => {
        const c = centroid(currentCorners);
        const pos = rotMarker.getLngLat();
        const newAngle = Math.atan2(pos.lat - c[1], pos.lng - c[0]);
        const delta = ((newAngle - prevAngle) * 180) / Math.PI;
        prevAngle = newAngle;

        const rotated = applyRotation(currentCorners, delta);
        for (let j = 0; j < 4; j++) currentCorners[j] = rotated[j];

        const source = map.getSource(`overlay-src-${editingOverlayId}`) as mapboxgl.ImageSource | undefined;
        if (source) {
          source.setCoordinates(currentCorners as [[number, number], [number, number], [number, number], [number, number]]);
        }

        cornerMarkersRef.current.forEach((m, j) => m.setLngLat(currentCorners[j]));
        setEditRotation((prev) => prev + delta);
      });

      rotMarker.on("dragend", () => {
        map.dragPan.enable();
        setEditCorners([...currentCorners]);
        autoSave(editingOverlayId, currentCorners, editRotation);
      });

      rotationMarkerRef.current = rotMarker;

      return () => {
        map.dragRotate.enable();
        map.touchZoomRotate.enableRotation();
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [editMode, editCorners?.length, editingOverlayId, mapLoaded, aspectLocked]);

    // ── 2-Point Snap ────────────────────────────────────────────────────────
    const startSnapMode = useCallback((ov: OverlayData) => {
      if (overlayLocked[ov.id]) {
        toast.error("Overlay is locked. Unlock it first.");
        return;
      }
      const coords = parseCoords(ov.coordinates);
      if (!coords) return;
      setEditingOverlayId(ov.id);
      setEditCorners([...coords]);
      setEditMode(true);
      setSnapMode(true);
      setSnapStep("anchorA");
      setAnchorA(null);
      setTargetA(null);
      setAnchorB(null);
      setTargetB(null);
      setSidebarOpen(false);
    }, [overlayLocked]);

    const cancelSnapMode = useCallback(() => {
      setSnapMode(false);
      setSnapStep("anchorA");
      setAnchorA(null);
      setTargetA(null);
      setAnchorB(null);
      setTargetB(null);
      snapMarkersRef.current.forEach((m) => m.remove());
      snapMarkersRef.current = [];
    }, []);

    // Snap click handler
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded || !snapMode) return;

      const addSnapMarker = (lngLat: { lng: number; lat: number }, color: string, label: string) => {
        const el = document.createElement("div");
        el.style.cssText = `
          width: 20px; height: 20px; border-radius: 50%;
          background: ${color}; border: 2px solid white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.4);
          display: flex; align-items: center; justify-content: center;
          font-size: 8px; font-weight: 700; color: white;
        `;
        el.textContent = label;
        const m = new mapboxgl.Marker({ element: el }).setLngLat([lngLat.lng, lngLat.lat]).addTo(map);
        snapMarkersRef.current.push(m);
      };

      const handleClick = (e: mapboxgl.MapMouseEvent) => {
        const pt = { lng: e.lngLat.lng, lat: e.lngLat.lat };
        setSnapStep((prev) => {
          if (prev === "anchorA") { setAnchorA(pt); addSnapMarker(pt, "#ef4444", "A"); return "targetA"; }
          if (prev === "targetA") { setTargetA(pt); addSnapMarker(pt, "#3b82f6", "A'"); return "anchorB"; }
          if (prev === "anchorB") { setAnchorB(pt); addSnapMarker(pt, "#ef4444", "B"); return "targetB"; }
          if (prev === "targetB") { setTargetB(pt); addSnapMarker(pt, "#3b82f6", "B'"); return "ready"; }
          return prev;
        });
      };

      map.on("click", handleClick);
      return () => { map.off("click", handleClick); };
    }, [snapMode, mapLoaded]);

    const executeSnap = useCallback(async () => {
      if (!anchorA || !targetA || !anchorB || !targetB || !editCorners || editingOverlayId == null) return;
      const transformed = calculateTwoPointTransform(anchorA, targetA, anchorB, targetB, editCorners);
      setEditCorners(transformed);
      updateOverlaySource(editingOverlayId, transformed);

      cornerMarkersRef.current.forEach((m, i) => m.setLngLat(transformed[i]));
      const tc = topCenter(transformed);
      if (rotationMarkerRef.current) rotationMarkerRef.current.setLngLat(tc);

      setIsSaving(true);
      const success = await saveCoordinates(editingOverlayId, transformed, editRotation);
      setIsSaving(false);

      if (success) {
        toast.success("2-Point Snap applied and saved!");
        cancelSnapMode();
        clearEditMarkers();
        setEditMode(false);
        setEditingOverlayId(null);
        setEditCorners(null);
        setEditRotation(0);
        onOverlayUpdated?.();
      }
    }, [anchorA, targetA, anchorB, targetB, editCorners, editingOverlayId, editRotation, updateOverlaySource, saveCoordinates, cancelSnapMode, clearEditMarkers, onOverlayUpdated]);

    // ── Reset overlay ───────────────────────────────────────────────────────
    const handleReset = async (ov: OverlayData) => {
      if (overlayLocked[ov.id]) {
        toast.error("Overlay is locked. Unlock it first.");
        return;
      }
      if (!confirm("Reset overlay to its original GPS-derived position?")) return;
      try {
        const resp = await fetch(`/api/projects/${projectId}/overlays/${ov.id}/reset`, {
          method: "POST",
          credentials: "include",
        });
        if (!resp.ok) throw new Error(await resp.text());
        const data = await resp.json();
        const newCoords = parseCoords(data.coordinates);
        if (newCoords) updateOverlaySource(ov.id, newCoords);
        toast.success("Overlay reset to default position");
        onOverlayUpdated?.();
      } catch (err: any) {
        toast.error("Reset failed: " + err.message);
      }
    };

    // ── Delete overlay ──────────────────────────────────────────────────────
    const handleDelete = async (ov: OverlayData) => {
      if (!confirm("Delete this overlay? This cannot be undone.")) return;
      setIsDeleting(true);
      try {
        const resp = await fetch(`/api/projects/${projectId}/overlays/${ov.id}`, {
          method: "DELETE",
          credentials: "include",
        });
        if (!resp.ok) throw new Error(await resp.text());
        removeOverlayFromMap(ov.id);
        if (editingOverlayId === ov.id) {
          clearEditMarkers();
          setEditMode(false);
          setEditingOverlayId(null);
          setEditCorners(null);
          setEditRotation(0);
        }
        setOpacityMap((prev) => { const n = { ...prev }; delete n[ov.id]; return n; });
        setVisibilityMap((prev) => { const n = { ...prev }; delete n[ov.id]; return n; });
        setSidebarOpen(false);
        toast.success("Overlay deleted successfully");
        onOverlayUpdated?.();
      } catch (err: any) {
        toast.error("Delete failed: " + err.message);
      } finally {
        setIsDeleting(false);
      }
    };

    // ── Rename overlay ──────────────────────────────────────────────────────
    const handleRename = useCallback((ov: OverlayData) => {
      setRenamingOverlayId(ov.id);
      setRenameValue(ov.label || `Plan ${ov.id}`);
    }, []);

    const handleRenameSubmit = useCallback((ovId: number) => {
      if (!renameValue.trim()) {
        toast.error("Name cannot be empty");
        return;
      }
      renameOverlayMutation.mutate(
        { overlayId: ovId, projectId, label: renameValue.trim() },
        {
          onSuccess: () => {
            toast.success("Overlay renamed");
            setRenamingOverlayId(null);
            onOverlayUpdated?.();
          },
          onError: (err) => toast.error("Rename failed: " + err.message),
        }
      );
    }, [renameValue, projectId, renameOverlayMutation, onOverlayUpdated]);

    // ── Fit to overlay bounds ───────────────────────────────────────────────
    const handleFitToOverlay = useCallback((ov: OverlayData) => {
      const map = mapRef.current;
      if (!map) return;
      const coords = parseCoords(ov.coordinates);
      if (!coords || coords.length < 4) return;
      const bounds = new mapboxgl.LngLatBounds();
      coords.forEach(([lng, lat]) => bounds.extend([lng, lat]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 19, duration: 800 });
    }, []);

    // ── Toggle overlay lock ─────────────────────────────────────────────────
    const handleToggleLock = useCallback((ovId: number) => {
      setOverlayLocked((prev) => ({ ...prev, [ovId]: !prev[ovId] }));
      toast.info(overlayLocked[ovId] ? "Overlay unlocked" : "Overlay locked — alignment tools disabled");
    }, [overlayLocked]);

    // ── Fullscreen toggle ───────────────────────────────────────────────────
    const toggleFullscreen = useCallback(() => {
      const wrapper = mapWrapperRef.current;
      if (!wrapper) return;

      if (!isFullscreen) {
        if (wrapper.requestFullscreen) {
          wrapper.requestFullscreen();
        } else if ((wrapper as any).webkitRequestFullscreen) {
          (wrapper as any).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          (document as any).webkitExitFullscreen();
        }
      }
    }, [isFullscreen]);

    // ── Pilot View toggle ───────────────────────────────────────────────────
    const getFlightBearing = useCallback((): number => {
      if (sortedMedia.length >= 2) {
        const first = sortedMedia[0];
        const last = sortedMedia[sortedMedia.length - 1];
        const fromLat = parseFloat(first.latitude!);
        const fromLng = parseFloat(first.longitude!);
        const toLat = parseFloat(last.latitude!);
        const toLng = parseFloat(last.longitude!);
        const dLng = ((toLng - fromLng) * Math.PI) / 180;
        const fromLatRad = (fromLat * Math.PI) / 180;
        const toLatRad = (toLat * Math.PI) / 180;

        const y = Math.sin(dLng) * Math.cos(toLatRad);
        const x =
          Math.cos(fromLatRad) * Math.sin(toLatRad) -
          Math.sin(fromLatRad) * Math.cos(toLatRad) * Math.cos(dLng);

        const bearing = (Math.atan2(y, x) * 180) / Math.PI;
        return (bearing + 360) % 360;
      }
      return 0;
    }, [sortedMedia]);

    const togglePilotView = useCallback(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded) {
        toast.info("Map is still loading");
        return;
      }

      if (!pilotViewEnabled) {
        const c = map.getCenter();
        prePilotCameraRef.current = {
          center: [c.lng, c.lat],
          zoom: map.getZoom(),
          bearing: map.getBearing(),
          pitch: map.getPitch(),
        };

        const targetBearing = getFlightBearing();
        const currentZoom = map.getZoom();

        map.easeTo({
          bearing: targetBearing,
          pitch: 62,
          zoom: Math.max(currentZoom, 17),
          duration: 900,
          essential: true,
        });
        setPilotViewEnabled(true);
        return;
      }

      if (autoFollowActive) {
        autoFollowStopRef.current = true;
        map.stop();
        setAutoFollowActive(false);
      }

      const previous = prePilotCameraRef.current;
      if (previous) {
        map.easeTo({
          center: previous.center,
          zoom: previous.zoom,
          bearing: previous.bearing,
          pitch: previous.pitch,
          duration: 700,
          essential: true,
        });
      } else {
        map.easeTo({ pitch: 0, duration: 500, essential: true });
      }
      setPilotViewEnabled(false);
    }, [autoFollowActive, getFlightBearing, mapLoaded, pilotViewEnabled]);

    const syncPilot3DFeatures = useCallback(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded || !map.isStyleLoaded()) return;

      const shouldUseTerrain = pilotViewEnabled && pilotTerrainEnabled;
      if (shouldUseTerrain) {
        if (!map.getSource(TERRAIN_SOURCE_ID)) {
          map.addSource(TERRAIN_SOURCE_ID, {
            type: "raster-dem",
            url: "mapbox://mapbox.mapbox-terrain-dem-v1",
            tileSize: 512,
            maxzoom: 14,
          });
        }

        map.setTerrain({
          source: TERRAIN_SOURCE_ID,
          exaggeration: TERRAIN_EXAGGERATION,
        });

        if (typeof map.setFog === "function") {
          map.setFog({});
        }
      } else {
        map.setTerrain(null);
      }

      const shouldUse3DBuildings = pilotViewEnabled && pilotBuildingsEnabled;
      const has3DBuildingsLayer = Boolean(map.getLayer(BUILDINGS_LAYER_ID));

      if (shouldUse3DBuildings && !has3DBuildingsLayer) {
        const labelLayerId = map
          .getStyle()
          .layers?.find((layer) => layer.type === "symbol" && Boolean(layer.layout?.["text-field"]))?.id;

        map.addLayer(
          {
            id: BUILDINGS_LAYER_ID,
            source: "composite",
            "source-layer": "building",
            filter: ["==", ["get", "extrude"], "true"],
            type: "fill-extrusion",
            minzoom: 14,
            paint: {
              "fill-extrusion-color": "#c8d6e5",
              "fill-extrusion-height": ["get", "height"],
              "fill-extrusion-base": ["coalesce", ["get", "min_height"], 0],
              "fill-extrusion-opacity": 0.5,
            },
          },
          labelLayerId,
        );
      } else if (!shouldUse3DBuildings && has3DBuildingsLayer) {
        map.removeLayer(BUILDINGS_LAYER_ID);
      }
    }, [mapLoaded, pilotBuildingsEnabled, pilotTerrainEnabled, pilotViewEnabled]);

    useEffect(() => {
      syncPilot3DFeatures();
    }, [syncPilot3DFeatures]);

    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded) return;

      const handleStyleData = () => {
        syncPilot3DFeatures();
      };

      map.on("styledata", handleStyleData);
      return () => {
        map.off("styledata", handleStyleData);
      };
    }, [mapLoaded, syncPilot3DFeatures]);

    const getHeadingBetween = useCallback((from: [number, number], to: [number, number]): number => {
      const [fromLng, fromLat] = from;
      const [toLng, toLat] = to;
      const dLng = ((toLng - fromLng) * Math.PI) / 180;
      const fromLatRad = (fromLat * Math.PI) / 180;
      const toLatRad = (toLat * Math.PI) / 180;

      const y = Math.sin(dLng) * Math.cos(toLatRad);
      const x =
        Math.cos(fromLatRad) * Math.sin(toLatRad) -
        Math.sin(fromLatRad) * Math.cos(toLatRad) * Math.cos(dLng);

      const bearing = (Math.atan2(y, x) * 180) / Math.PI;
      return (bearing + 360) % 360;
    }, []);

    const stopAutoFollow = useCallback((showToast = false) => {
      const map = mapRef.current;
      autoFollowStopRef.current = true;
      map?.stop();
      setAutoFollowActive(false);
      if (showToast) toast.success("Auto Follow complete");
    }, []);

    const flyToMarkerSequence = useCallback((index: number) => {
      const map = mapRef.current;
      if (!map) return;
      if (autoFollowStopRef.current) return;
      if (index >= sortedMedia.length) {
        stopAutoFollow(true);
        return;
      }

      const current = sortedMedia[index];
      const next = sortedMedia[Math.min(index + 1, sortedMedia.length - 1)];
      const currentPos: [number, number] = [parseFloat(current.longitude!), parseFloat(current.latitude!)];
      const nextPos: [number, number] = [parseFloat(next.longitude!), parseFloat(next.latitude!)];
      const bearing = getHeadingBetween(currentPos, nextPos);

      setAutoFollowIndex(index);
      map.easeTo({
        center: currentPos,
        bearing,
        pitch: pilotViewEnabled ? 62 : 58,
        zoom: Math.max(map.getZoom(), 17),
        duration: Math.round(2200 / autoFollowSpeed),
        essential: true,
      });

      map.once("moveend", () => {
        if (autoFollowStopRef.current) return;
        flyToMarkerSequence(index + 1);
      });
    }, [autoFollowSpeed, getHeadingBetween, pilotViewEnabled, sortedMedia, stopAutoFollow]);

    const toggleAutoFollow = useCallback(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded) {
        toast.info("Map is still loading");
        return;
      }
      if (sortedMedia.length < 2) {
        toast.info("Need at least 2 GPS points for Auto Follow");
        return;
      }

      if (autoFollowActive) {
        stopAutoFollow();
        return;
      }

      autoFollowStopRef.current = false;
      setAutoFollowActive(true);
      setAutoFollowIndex(0);
      flyToMarkerSequence(0);
    }, [autoFollowActive, flyToMarkerSequence, mapLoaded, sortedMedia.length, stopAutoFollow]);

    useEffect(() => {
      if (autoFollowActive && sortedMedia.length < 2) {
        stopAutoFollow();
      }
    }, [autoFollowActive, sortedMedia.length, stopAutoFollow]);

    useEffect(() => {
      return () => {
        autoFollowStopRef.current = true;
      };
    }, []);

    // Listen for fullscreen change events
    useEffect(() => {
      const handleFullscreenChange = () => {
        const isFull = !!document.fullscreenElement;
        setIsFullscreen(isFull);
        // Resize map after fullscreen transition
        setTimeout(() => {
          mapRef.current?.resize();
        }, 100);
      };
      document.addEventListener("fullscreenchange", handleFullscreenChange);
      document.addEventListener("webkitfullscreenchange", handleFullscreenChange);
      return () => {
        document.removeEventListener("fullscreenchange", handleFullscreenChange);
        document.removeEventListener("webkitfullscreenchange", handleFullscreenChange);
      };
    }, []);

    // ── Measurement tool ────────────────────────────────────────────────────
    const clearMeasureMarkers = useCallback(() => {
      measureMarkersRef.current.forEach((m) => m.remove());
      measureMarkersRef.current = [];
      const map = mapRef.current;
      if (map) {
        if (map.getLayer("measure-line")) map.removeLayer("measure-line");
        if (map.getSource("measure-line-src")) map.removeSource("measure-line-src");
        if (map.getLayer("measure-fill")) map.removeLayer("measure-fill");
        if (map.getSource("measure-fill-src")) map.removeSource("measure-fill-src");
      }
    }, []);

    const startMeasureMode = useCallback(() => {
      setMeasureMode(true);
      setMeasurePoints([]);
      setMeasureResult(null);
      clearMeasureMarkers();
      setSidebarOpen(false);
      toast.info("Click on the map to place measurement points. Double-click to finish.");
    }, [clearMeasureMarkers]);

    const stopMeasureMode = useCallback(() => {
      setMeasureMode(false);
      setMeasurePoints([]);
      setMeasureResult(null);
      clearMeasureMarkers();
    }, [clearMeasureMarkers]);

    // Measurement click handler
    useEffect(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded || !measureMode) return;

      let points: [number, number][] = [];

      const updateMeasureLine = () => {
        if (map.getLayer("measure-line")) map.removeLayer("measure-line");
        if (map.getSource("measure-line-src")) map.removeSource("measure-line-src");
        if (map.getLayer("measure-fill")) map.removeLayer("measure-fill");
        if (map.getSource("measure-fill-src")) map.removeSource("measure-fill-src");

        if (points.length >= 2) {
          map.addSource("measure-line-src", {
            type: "geojson",
            data: {
              type: "Feature",
              properties: {},
              geometry: { type: "LineString", coordinates: points },
            },
          });
          map.addLayer({
            id: "measure-line",
            type: "line",
            source: "measure-line-src",
            paint: {
              "line-color": "#f59e0b",
              "line-width": 3,
              "line-dasharray": [3, 2],
            },
          });

          // If 3+ points, show fill
          if (points.length >= 3) {
            const closedRing = [...points, points[0]];
            map.addSource("measure-fill-src", {
              type: "geojson",
              data: {
                type: "Feature",
                properties: {},
                geometry: { type: "Polygon", coordinates: [closedRing] },
              },
            });
            map.addLayer({
              id: "measure-fill",
              type: "fill",
              source: "measure-fill-src",
              paint: {
                "fill-color": "#f59e0b",
                "fill-opacity": 0.15,
              },
            });
          }
        }

        // Calculate distance
        let totalDist = 0;
        for (let i = 1; i < points.length; i++) {
          const from = turfPoint(points[i - 1]);
          const to = turfPoint(points[i]);
          totalDist += turfDistance(from, to, { units: "meters" });
        }

        // Calculate area (if 3+ points)
        let areaVal = 0;
        if (points.length >= 3) {
          try {
            const closedRing = [...points, points[0]];
            const poly = turfPolygon([closedRing]);
            areaVal = turfArea(poly);
          } catch {}
        }

        setMeasureResult({ distance: totalDist, area: areaVal });
      };

      const handleClick = (e: mapboxgl.MapMouseEvent) => {
        const pt: [number, number] = [e.lngLat.lng, e.lngLat.lat];
        points.push(pt);
        setMeasurePoints([...points]);

        // Add marker
        const el = document.createElement("div");
        el.style.cssText = `
          width: 14px; height: 14px; border-radius: 50%;
          background: #f59e0b; border: 2px solid white;
          box-shadow: 0 1px 4px rgba(0,0,0,0.4);
          cursor: pointer;
        `;
        const m = new mapboxgl.Marker({ element: el }).setLngLat(pt).addTo(map);
        measureMarkersRef.current.push(m);

        updateMeasureLine();
      };

      const handleDblClick = (e: mapboxgl.MapMouseEvent) => {
        e.preventDefault();
        // Finish measurement — keep results visible but stop adding points
        setMeasureMode(false);
      };

      map.on("click", handleClick);
      map.on("dblclick", handleDblClick);
      map.doubleClickZoom.disable();

      return () => {
        map.off("click", handleClick);
        map.off("dblclick", handleDblClick);
        map.doubleClickZoom.enable();
      };
    }, [measureMode, mapLoaded]);

    // ── Snap step labels ────────────────────────────────────────────────────
    const snapStepLabel: Record<string, string> = {
      anchorA: "Click blueprint: place Anchor A",
      targetA: "Click map: place Target A'",
      anchorB: "Click blueprint: place Anchor B",
      targetB: "Click map: place Target B'",
      ready: "Ready to snap!",
    };

       // ── Loading state ───────────────────────────────────────────────
    // NOTE: We do NOT early-return on isLoading here.
    // The map container must always be in the DOM so the useEffect can attach Mapbox to it.
    // We show a skeleton overlay on top of the map container while loading.    }

    // ── Render ──────────────────────────────────────────────────────────────
    return (
      <Card className="bg-card">
        <CardContent className="pt-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              <MapPin className="h-5 w-5 inline mr-2 text-emerald-400" />
              Project Map
              {mediaWithGPS.length > 0 && (
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({mediaWithGPS.length} location{mediaWithGPS.length !== 1 ? "s" : ""})
                </span>
              )}
              {activeOverlays.length > 0 && (
                <span className="text-sm font-normal text-blue-400 ml-2">
                  &bull; {activeOverlays.length} overlay{activeOverlays.length !== 1 ? "s" : ""}
                </span>
              )}
            </h2>
          </div>

          {/* Map wrapper — always rendered so mapContainerRef is never null */}
          <div
            ref={mapWrapperRef}
            className={`relative rounded-lg overflow-hidden border border-slate-800 ${isFullscreen ? "!rounded-none !border-0" : ""}`}
            style={isFullscreen ? { background: "#000" } : undefined}
          >
            {/* Mapbox container — always in DOM, polling init waits for non-zero dimensions */}
            <div ref={mapContainerRef} className={`w-full min-h-[500px] ${isFullscreen ? "!h-screen" : heightClass}`} />

            {/* Loading skeleton overlay */}
            {isLoading && (
              <div className="absolute inset-0 z-[10] flex items-center justify-center bg-muted/80 rounded-lg">
                <div className="w-full h-full animate-pulse bg-muted rounded-lg" />
              </div>
            )}

            {/* No GPS overlay — shown only when truly empty and not loading */}
            {!isLoading && mediaWithGPS.length === 0 && activeOverlays.length === 0 && (
              <div className="absolute inset-0 z-[10] flex flex-col items-center justify-center text-muted-foreground bg-muted/50 rounded-lg">
                <Navigation className="h-12 w-12 mb-3 opacity-50" />
                <p className="font-medium">No GPS Data Available</p>
                <p className="text-sm">Upload media with GPS coordinates to see them on the map</p>
              </div>
            )}

            {/* Map status indicator */}
            <div className="absolute bottom-4 left-4 z-[5] bg-slate-900/80 backdrop-blur px-3 py-1 rounded-full text-[10px] text-slate-300 border border-slate-700">
              {mediaWithGPS.length > 0 ? `${mediaWithGPS.length} GPS points` : ""} Satellite-Streets-V12
            </div>

              {/* Fullscreen toggle button */}
              <button
                onClick={toggleFullscreen}
                className="absolute top-3 left-3 z-[20] bg-white rounded shadow-md p-1.5 hover:bg-gray-100 transition-colors"
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize size={18} className="text-gray-700" /> : <Maximize size={18} className="text-gray-700" />}
              </button>

              {/* Measurement result floating badge */}
              {measureResult && (measureResult.distance > 0 || measureResult.area > 0) && (
                <div className="absolute top-3 left-3 z-[20] bg-black/85 backdrop-blur-md rounded-lg px-4 py-3 text-white max-w-xs">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Ruler className="h-4 w-4 text-amber-400" />
                      <span className="text-sm font-semibold">Measurement</span>
                    </div>
                    <button
                      onClick={stopMeasureMode}
                      className="p-1 hover:bg-white/10 rounded"
                      title="Clear measurement"
                    >
                      <X size={14} />
                    </button>
                  </div>
                  {measureResult.distance > 0 && (
                    <div className="text-xs space-y-0.5">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Distance:</span>
                        <span className="font-mono">{formatDistance(measureResult.distance)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400"></span>
                        <span className="font-mono text-slate-400">{formatDistanceFeet(measureResult.distance)}</span>
                      </div>
                    </div>
                  )}
                  {measureResult.area > 0 && (
                    <div className="text-xs space-y-0.5 mt-1 pt-1 border-t border-white/10">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Area:</span>
                        <span className="font-mono">{formatArea(measureResult.area)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400"></span>
                        <span className="font-mono text-slate-400">{formatAreaFeet(measureResult.area)}</span>
                      </div>
                    </div>
                  )}
                  {measureMode && (
                    <p className="text-[10px] text-amber-400 mt-2">Click to add points. Double-click to finish.</p>
                  )}
                </div>
              )}

              {/* Measure mode indicator (when no results yet) */}
              {measureMode && !measureResult && (
                <div className="absolute top-3 left-3 z-[20] bg-black/85 backdrop-blur-md rounded-lg px-4 py-3 text-white flex items-center gap-3">
                  <Ruler className="h-5 w-5 text-amber-400" />
                  <div>
                    <p className="text-sm font-semibold">Measure Mode</p>
                    <p className="text-[10px] text-slate-300">Click to place points. Double-click to finish.</p>
                  </div>
                  <button
                    onClick={stopMeasureMode}
                    className="p-1 hover:bg-white/10 rounded ml-2"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Edit mode toolbar */}
              {editMode && !snapMode && !measureMode && (
                <div className="absolute top-3 left-3 z-[20] flex items-center gap-2">
                  <span className="text-xs text-amber-400 font-medium bg-black/60 backdrop-blur-sm px-2 py-1 rounded">
                    ↻ {editRotation.toFixed(1)}°
                  </span>
                  <button
                    title={aspectLocked ? "Aspect ratio locked" : "Aspect ratio unlocked"}
                    onClick={() => setAspectLocked((v) => !v)}
                    className={`text-xs px-2 py-1 rounded font-medium transition-colors backdrop-blur-sm ${
                      aspectLocked
                        ? "border border-emerald-500 text-emerald-400 bg-emerald-500/20"
                        : "border border-zinc-500 text-zinc-400 bg-zinc-500/20"
                    }`}
                  >
                    {aspectLocked ? "🔒 AR" : "🔓 AR"}
                  </button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-red-500 text-red-400 hover:bg-red-500/20 bg-black/60 backdrop-blur-sm"
                    onClick={handleCancelEdit}
                  >
                    <X className="h-3 w-3 mr-1" /> Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                    onClick={handleFinishEdit}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <><span className="animate-spin mr-1">⏳</span> Saving...</>
                    ) : (
                      <><Check className="h-3 w-3 mr-1" /> Save & Finish</>
                    )}
                  </Button>
                </div>
              )}

              {/* 2-Point Snap toolbar */}
              {snapMode && (
                <div className="absolute top-3 left-3 right-3 z-[20] flex items-center gap-2 bg-black/80 backdrop-blur-md rounded-lg px-4 py-3">
                  <Crosshair className="h-5 w-5 text-blue-400 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-white">2-Point Snap Alignment</p>
                    <p className="text-xs text-slate-300">{snapStepLabel[snapStep]}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex gap-1">
                      <span className={`w-2 h-2 rounded-full ${anchorA ? "bg-red-500" : "bg-slate-600"}`} title="Anchor A" />
                      <span className={`w-2 h-2 rounded-full ${targetA ? "bg-blue-500" : "bg-slate-600"}`} title="Target A'" />
                      <span className={`w-2 h-2 rounded-full ${anchorB ? "bg-red-500" : "bg-slate-600"}`} title="Anchor B" />
                      <span className={`w-2 h-2 rounded-full ${targetB ? "bg-blue-500" : "bg-slate-600"}`} title="Target B'" />
                    </div>
                    {snapStep === "ready" && (
                      <Button
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                        onClick={executeSnap}
                        disabled={isSaving}
                      >
                        {isSaving ? "Snapping..." : "Snap!"}
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="border-red-500 text-red-400 hover:bg-red-500/20 bg-black/60"
                      onClick={() => { cancelSnapMode(); handleCancelEdit(); }}
                    >
                      <X className="h-3 w-3 mr-1" /> Cancel
                    </Button>
                  </div>
                </div>
              )}

              {/* Bottom-left badge */}
              <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded px-2 py-1 text-xs text-white z-[5]">
                {mediaWithGPS.length > 0 && (
                  <>
                    <span className="text-emerald-400 font-medium">{mediaWithGPS.length}</span> GPS points
                    {flightPathVisible && <span className="text-emerald-400 ml-2">— Flight path</span>}
                  </>
                )}
                {activeOverlays.length > 0 && (
                  <>
                    {mediaWithGPS.length > 0 && <span className="mx-2">&bull;</span>}
                    <span className="text-blue-400 font-medium">{activeOverlays.length}</span> overlay{activeOverlays.length !== 1 ? "s" : ""}
                    {editMode && !snapMode && <span className="text-amber-400 ml-1">&bull; editing</span>}
                    {snapMode && <span className="text-blue-400 ml-1">&bull; snap mode</span>}
                  </>
                )}
              </div>

              {/* ── Overlay Manager Sidebar ── */}
              {(activeOverlays.length > 0 || mediaWithGPS.length > 0) && (
                <>
                  {!sidebarOpen && !snapMode && !measureMode && (
                    <button
                      onClick={() => setSidebarOpen(true)}
                      className="absolute left-0 top-14 z-[100] bg-slate-900/90 backdrop-blur-md text-white p-2 rounded-r-md border-r border-t border-b border-slate-700 hover:bg-slate-800 transition-colors"
                      title="Open Overlay Manager"
                    >
                      <Layers size={18} />
                    </button>
                  )}

                  <div
                    className={`absolute left-0 top-0 h-full w-80 bg-slate-900/95 backdrop-blur-md text-white shadow-2xl transition-transform duration-300 z-[100] ${
                      sidebarOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
                  >
                    <button
                      onClick={() => setSidebarOpen(false)}
                      className="absolute -right-10 top-4 bg-slate-900 p-2 rounded-r-md border-r border-t border-b border-slate-700 hover:bg-slate-800 transition-colors"
                    >
                      <ChevronRight size={20} className="rotate-180" />
                    </button>

                    <div className="p-5 h-full overflow-y-auto flex flex-col gap-4">
                      {/* Header */}
                      <div className="flex items-center justify-between border-b border-slate-700 pb-4">
                        <div className="flex items-center gap-2">
                          <Layers className="text-blue-400" size={20} />
                          <h2 className="font-bold text-lg tracking-tight">Overlay Manager</h2>
                        </div>
                        <button onClick={() => setSidebarOpen(false)} className="p-1 hover:bg-slate-800 rounded">
                          <X size={16} />
                        </button>
                      </div>

                      {/* ── MAP CONTROLS section ── */}
                      <div className="space-y-3">
                        <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Map Controls</p>

                        {/* Pilot View */}
                        {mediaWithGPS.length > 0 && (
                          <button
                            onClick={togglePilotView}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                              pilotViewEnabled
                                ? "bg-cyan-600/20 border border-cyan-500/30"
                                : "bg-slate-800 hover:bg-slate-700"
                            }`}
                          >
                            <Plane size={16} className={pilotViewEnabled ? "text-cyan-400" : "text-slate-400"} />
                            <div className="text-left">
                              <span className="text-sm font-medium block">{pilotViewEnabled ? "Exit Pilot View" : "Pilot View"}</span>
                              <span className="text-[10px] text-slate-400">Low-angle cockpit perspective</span>
                            </div>
                          </button>
                        )}

                        {pilotViewEnabled && mapLoaded && (
                          <>
                            <MapboxFlyControls
                              map={mapRef.current}
                              variant="sidebar"
                            />

                            <div className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3">
                              <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">Pilot 3D</p>
                              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setPilotTerrainEnabled((v) => !v)}
                                  className={`h-9 justify-start px-3 text-xs ${
                                    pilotTerrainEnabled
                                      ? "bg-cyan-600/30 hover:bg-cyan-600/40 text-cyan-100"
                                      : "bg-slate-700 hover:bg-slate-600 text-slate-100"
                                  }`}
                                  title={pilotTerrainEnabled ? "Disable terrain" : "Enable terrain"}
                                >
                                  {pilotTerrainEnabled ? "Terrain On" : "Terrain Off"}
                                </Button>

                                <Button
                                  type="button"
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => setPilotBuildingsEnabled((v) => !v)}
                                  className={`h-9 justify-start px-3 text-xs ${
                                    pilotBuildingsEnabled
                                      ? "bg-cyan-600/30 hover:bg-cyan-600/40 text-cyan-100"
                                      : "bg-slate-700 hover:bg-slate-600 text-slate-100"
                                  }`}
                                  title={pilotBuildingsEnabled ? "Disable 3D buildings" : "Enable 3D buildings"}
                                >
                                  {pilotBuildingsEnabled ? "Buildings On" : "Buildings Off"}
                                </Button>
                              </div>
                            </div>

                            {mediaWithGPS.length > 0 && (
                              <div className="w-full rounded-xl border border-slate-700 bg-slate-800 p-3">
                                <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">Pilot Route</p>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  <Button
                                    type="button"
                                    size="sm"
                                    onClick={toggleAutoFollow}
                                    className="h-9 justify-start px-3 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                    title={autoFollowActive ? "Pause Auto Follow" : "Start Auto Follow"}
                                  >
                                    {autoFollowActive ? <Pause className="h-4 w-4 mr-2" /> : <Play className="h-4 w-4 mr-2" />}
                                    {autoFollowActive
                                      ? `Following ${autoFollowIndex + 1}/${sortedMedia.length}`
                                      : "Auto Follow"}
                                  </Button>

                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setAutoFollowSpeed((s) => (s === 3 ? 1 : ((s + 1) as 1 | 2 | 3)))}
                                    className="h-9 justify-start px-3 text-xs bg-slate-700 hover:bg-slate-600 text-slate-100"
                                    title="Cycle auto-follow speed"
                                  >
                                    Speed {autoFollowSpeed}x
                                  </Button>
                                </div>
                              </div>
                            )}
                          </>
                        )}

                        {/* Hide/Show Flight Path */}
                        {mediaWithGPS.length > 0 && (
                          <button
                            onClick={() => setFlightPathVisible((v) => !v)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                              flightPathVisible ? "bg-emerald-600/20 border border-emerald-500/30" : "bg-slate-800 hover:bg-slate-700"
                            }`}
                          >
                            <Route size={16} className={flightPathVisible ? "text-emerald-400" : "text-slate-400"} />
                            <span className="text-sm font-medium">{flightPathVisible ? "Hide Flight Path" : "Show Flight Path"}</span>
                          </button>
                        )}

                        {/* Measure */}
                        <button
                          onClick={() => {
                            if (measureMode || measureResult) {
                              stopMeasureMode();
                            } else {
                              startMeasureMode();
                            }
                          }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                            measureMode || measureResult ? "bg-amber-600/20 border border-amber-500/30" : "bg-slate-800 hover:bg-slate-700"
                          }`}
                        >
                          <Ruler size={16} className={measureMode || measureResult ? "text-amber-400" : "text-slate-400"} />
                          <div className="text-left">
                            <span className="text-sm font-medium block">{measureMode || measureResult ? "Clear Measurement" : "Measure"}</span>
                            <span className="text-[10px] text-slate-400">Distance & area on map</span>
                          </div>
                        </button>

                        {/* Fullscreen */}
                        <button
                          onClick={toggleFullscreen}
                          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 transition-all"
                        >
                          {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                          <span className="text-sm font-medium">{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</span>
                        </button>
                      </div>

                      {/* ── UPLOAD OVERLAY section ── */}
                      {!isDemoProject && (
                        <div className="pt-2 border-t border-slate-700 space-y-2">
                          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Add Overlay</p>
                          <input
                            ref={overlayFileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/webp,image/tiff,application/pdf"
                            className="hidden"
                            onChange={async (e) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              e.target.value = "";
                              setIsUploadingOverlay(true);
                              try {
                                const fd = new FormData();
                                fd.append("file", file);
                                await uploadProjectOverlay(fd, projectId);
                                toast.success("Overlay uploaded successfully");
                                onOverlayUpdated?.();
                              } catch (err) {
                                toast.error(err instanceof Error ? err.message : "Overlay upload failed");
                              } finally {
                                setIsUploadingOverlay(false);
                              }
                            }}
                          />
                          <button
                            onClick={() => overlayFileInputRef.current?.click()}
                            disabled={isUploadingOverlay}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/30 hover:bg-emerald-600/30 text-emerald-300 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Upload size={16} className={isUploadingOverlay ? "animate-pulse" : ""} />
                            <div className="text-left">
                              <span className="text-sm font-medium block">{isUploadingOverlay ? "Uploading..." : "Upload Overlay"}</span>
                              <span className="text-[10px] text-slate-400">PNG, JPG, PDF plan</span>
                            </div>
                          </button>
                        </div>
                      )}

                      {/* ── PER-OVERLAY CONTROLS ── */}
                      {activeOverlays.map((ov) => {
                        const opacity = opacityMap[ov.id] ?? 0.7;
                        const visible = visibilityMap[ov.id] ?? true;
                        const locked = overlayLocked[ov.id] ?? false;
                        const label = ov.label || `Plan ${ov.id}`;
                        const isRenaming = renamingOverlayId === ov.id;

                        return (
                          <div key={ov.id} className="space-y-3 border-t border-slate-700 pt-4">
                            {/* Overlay name + visibility + lock */}
                            <div className="flex items-center gap-2">
                              {isRenaming ? (
                                <div className="flex-1 flex items-center gap-1">
                                  <input
                                    type="text"
                                    value={renameValue}
                                    onChange={(e) => setRenameValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleRenameSubmit(ov.id);
                                      if (e.key === "Escape") setRenamingOverlayId(null);
                                    }}
                                    className="flex-1 bg-slate-800 border border-slate-600 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-blue-500"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleRenameSubmit(ov.id)}
                                    className="p-1 hover:bg-slate-700 rounded text-emerald-400"
                                    title="Save name"
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={() => setRenamingOverlayId(null)}
                                    className="p-1 hover:bg-slate-700 rounded text-slate-400"
                                    title="Cancel"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex-1 flex items-center gap-2 min-w-0">
                                  <span
                                    className="text-sm font-medium text-slate-200 truncate cursor-pointer hover:text-white"
                                    title={`${label} — click to rename`}
                                    onClick={() => !isDemoProject && handleRename(ov)}
                                  >
                                    {label}
                                  </span>
                                  {!isDemoProject && (
                                    <button
                                      onClick={() => handleRename(ov)}
                                      className="p-1 hover:bg-slate-700 rounded text-slate-500 hover:text-slate-300 shrink-0"
                                      title="Rename overlay"
                                    >
                                      <Pencil size={12} />
                                    </button>
                                  )}
                                </div>
                              )}
                              <button
                                onClick={() => handleToggleVisibility(ov.id)}
                                className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors shrink-0"
                                title={visible ? "Hide overlay" : "Show overlay"}
                              >
                                {visible ? <Eye size={16} /> : <EyeOff size={16} className="text-slate-500" />}
                              </button>
                            </div>

                            {/* Opacity slider */}
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs text-slate-400">
                                <span>Opacity</span>
                                <span>{Math.round(opacity * 100)}%</span>
                              </div>
                              <input
                                type="range"
                                min={0}
                                max={1}
                                step={0.01}
                                value={opacity}
                                onChange={(e) => handleOpacityChange(ov.id, parseFloat(e.target.value))}
                                onMouseUp={(e) => handleOpacityCommit(ov.id, parseFloat((e.target as HTMLInputElement).value))}
                                onTouchEnd={(e) => handleOpacityCommit(ov.id, parseFloat((e.target as HTMLInputElement).value))}
                                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                              />
                            </div>

                            {/* Quick actions row */}
                            {!isDemoProject && (
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => handleFitToOverlay(ov)}
                                  className="flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors text-xs"
                                  title="Fit map to overlay bounds"
                                >
                                  <Target size={13} />
                                  <span>Fit</span>
                                </button>
                                <button
                                  onClick={() => handleToggleLock(ov.id)}
                                  className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg transition-colors text-xs ${
                                    locked ? "bg-amber-600/20 border border-amber-500/30 text-amber-400" : "bg-slate-800 hover:bg-slate-700"
                                  }`}
                                  title={locked ? "Unlock overlay" : "Lock overlay position"}
                                >
                                  {locked ? <Lock size={13} /> : <Unlock size={13} />}
                                  <span>{locked ? "Locked" : "Lock"}</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* ── ALIGNMENT TOOLS section ── */}
                      {!isDemoProject && activeOverlays.length > 0 && (
                        <div className="pt-2 border-t border-slate-700 space-y-2">
                          <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Alignment Tools</p>

                          {/* Edit Alignment */}
                          <button
                            onClick={() => {
                              if (editMode) { handleCancelEdit(); }
                              else if (activeOverlays[0]) { handleStartEdit(activeOverlays[0]); setSidebarOpen(false); }
                            }}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                              editMode && !snapMode ? "bg-blue-600 shadow-lg shadow-blue-900/40" : "bg-slate-800 hover:bg-slate-700"
                            }`}
                          >
                            <Move size={16} />
                            <div className="text-left">
                              <span className="text-sm font-medium block">{editMode && !snapMode ? "Stop Editing" : "Edit Alignment"}</span>
                              <span className="text-[10px] text-slate-400">Drag corners to resize & rotate</span>
                            </div>
                          </button>

                          {/* 2-Point Snap */}
                          {activeOverlays[0] && (
                            <button
                              onClick={() => {
                                if (snapMode) { cancelSnapMode(); handleCancelEdit(); }
                                else { startSnapMode(activeOverlays[0]); }
                              }}
                              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl transition-all ${
                                snapMode ? "bg-blue-600 shadow-lg shadow-blue-900/40" : "bg-slate-800 hover:bg-slate-700"
                              }`}
                            >
                              <Crosshair size={16} />
                              <div className="text-left">
                                <span className="text-sm font-medium block">{snapMode ? "Cancel Snap" : "2-Point Snap"}</span>
                                <span className="text-[10px] text-slate-400">Match 2 points for precise alignment</span>
                              </div>
                            </button>
                          )}

                          {/* Reset to Default */}
                          {activeOverlays[0] && (
                            <button
                              onClick={() => handleReset(activeOverlays[0])}
                              className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-amber-900/40 hover:text-amber-400 transition-all"
                            >
                              <RotateCcw size={16} />
                              <span className="text-sm font-medium">Reset to Default</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* ── DANGER ZONE ── */}
                      {!isDemoProject && activeOverlays[0] && (
                        <div className="pt-2 border-t border-red-900/30 space-y-2">
                          <p className="text-[10px] uppercase tracking-widest text-red-500/60 font-bold">Danger Zone</p>
                          <button
                            onClick={() => handleDelete(activeOverlays[0])}
                            disabled={isDeleting}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-red-900/40 hover:text-red-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Trash2 size={16} />
                            <span className="text-sm font-medium">{isDeleting ? "Deleting..." : "Delete Overlay"}</span>
                          </button>
                        </div>
                      )}

                      {/* Edit mode tip */}
                      {editMode && !snapMode && (
                        <p className="text-xs text-slate-400 mt-auto">
                          Drag <span className="text-emerald-400">green corners</span> to resize — the image stretches live.{" "}
                          <span className="text-amber-400">↻ yellow handle</span> rotates all 4 corners. Toggle{" "}
                          <span className="text-emerald-400">🔒 AR</span> to lock aspect ratio. Click{" "}
                          <span className="text-emerald-400">Save & Finish</span> to persist.
                        </p>
                      )}

                      {/* Snap mode tip */}
                      {snapMode && (
                        <div className="text-xs text-slate-400 mt-auto space-y-2">
                          <p className="font-semibold text-blue-400">How 2-Point Snap works:</p>
                          <ol className="list-decimal list-inside space-y-1">
                            <li>Click a known point on the <span className="text-red-400">blueprint</span> (Anchor A)</li>
                            <li>Click where it should be on the <span className="text-blue-400">map</span> (Target A')</li>
                            <li>Repeat for a second point (Anchor B → Target B')</li>
                            <li>Click <span className="text-blue-400">Snap!</span> to align</li>
                          </ol>
                          <p>The overlay will translate, rotate, and scale to match your two reference points.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

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
                {enlargedMedia.mediaType === "video" ? (
                  <video src={enlargedMedia.url} controls autoPlay className="max-w-full max-h-[85vh] object-contain rounded-lg" />
                ) : (
                  <img src={enlargedMedia.url} alt={enlargedMedia.filename} className="max-w-full max-h-[85vh] object-contain rounded-lg" />
                )}
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white p-3 rounded-b-lg">
                  <h3 className="font-semibold text-sm mb-1">{enlargedMedia.filename}</h3>
                  <div className="text-xs text-gray-300 flex flex-wrap gap-4">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {parseFloat(enlargedMedia.latitude as any).toFixed(6)},{" "}
                      {parseFloat(enlargedMedia.longitude as any).toFixed(6)}
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

MapboxProjectMap.displayName = "MapboxProjectMap";
