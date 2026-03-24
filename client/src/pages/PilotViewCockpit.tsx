import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { Link, useParams } from "wouter";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapboxFlyControls } from "@/components/MapboxFlyControls";
import { MediaDetailSidebar, type CockpitMediaDetails } from "@/components/MediaDetailSidebar";

const MAP_STYLE = "mapbox://styles/mapbox/satellite-streets-v12";
const DEFAULT_CENTER: [number, number] = [-96.7969, 32.7767];
const DEFAULT_ZOOM = 12;

interface MapSourceFeatureProperties {
  mediaId: number;
  mediaType: "photo" | "video";
}

export default function PilotViewCockpit() {
  const { id } = useParams<{ id: string }>();
  const projectId = parseInt(id || "0", 10);
  const isDemoProject = projectId === 1;

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<CockpitMediaDetails | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { data: project, isLoading: projectLoading, error: projectError } = isDemoProject
    ? trpc.project.getDemo.useQuery({ id: projectId }, { enabled: projectId > 0 })
    : trpc.project.get.useQuery({ id: projectId }, { enabled: projectId > 0 });

  const { data: mediaItems, isLoading: mediaLoading, error: mediaError } = isDemoProject
    ? trpc.media.listDemo.useQuery({ projectId, includeFlightMedia: true }, { enabled: projectId > 0 })
    : trpc.media.list.useQuery({ projectId, includeFlightMedia: true }, { enabled: projectId > 0 });

  const cockpitMedia: CockpitMediaDetails[] = useMemo(() => {
    return (mediaItems || [])
      .filter((item) => item.latitude !== null && item.longitude !== null)
      .map((item) => ({
        id: item.id,
        filename: item.filename,
        url: item.url,
        thumbnailUrl: item.thumbnailUrl,
        mediaType: item.mediaType,
        latitude: parseFloat(String(item.latitude)),
        longitude: parseFloat(String(item.longitude)),
        altitude: item.altitude ? parseFloat(String(item.altitude)) : null,
        capturedAt: item.capturedAt,
      }))
      .sort((a, b) => {
        if (a.capturedAt && b.capturedAt) {
          return new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime();
        }
        if (a.capturedAt && !b.capturedAt) return -1;
        if (!a.capturedAt && b.capturedAt) return 1;
        return a.filename.localeCompare(b.filename);
      });
  }, [mediaItems]);

  const mediaById = useMemo(() => {
    const map = new Map<number, CockpitMediaDetails>();
    for (const item of cockpitMedia) {
      map.set(item.id, item);
    }
    return map;
  }, [cockpitMedia]);

  const mapCenter = useMemo<[number, number]>(() => {
    if (cockpitMedia.length === 0) return DEFAULT_CENTER;
    const avgLat = cockpitMedia.reduce((sum, media) => sum + media.latitude, 0) / cockpitMedia.length;
    const avgLng = cockpitMedia.reduce((sum, media) => sum + media.longitude, 0) / cockpitMedia.length;
    return [avgLng, avgLat];
  }, [cockpitMedia]);

  const buildGeoJson = useCallback((): GeoJSON.FeatureCollection<GeoJSON.Point, MapSourceFeatureProperties> => {
    return {
      type: "FeatureCollection",
      features: cockpitMedia.map((item) => ({
        type: "Feature",
        properties: {
          mediaId: item.id,
          mediaType: item.mediaType,
        },
        geometry: {
          type: "Point",
          coordinates: [item.longitude, item.latitude],
        },
      })),
    };
  }, [cockpitMedia]);

  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapRef.current) return;

    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) {
      console.error("VITE_MAPBOX_TOKEN is not set");
      return;
    }

    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAP_STYLE,
      center: mapCenter,
      zoom: cockpitMedia.length > 0 ? 14 : DEFAULT_ZOOM,
      pitch: 0,
      bearing: 0,
      pitchWithRotate: false,
    });

    mapRef.current = map;

    const handleLoad = () => {
      setIsMapReady(true);

      map.addSource("cockpit-media", {
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
        cluster: true,
        clusterRadius: 40,
        clusterMaxZoom: 14,
      });

      map.addLayer({
        id: "cockpit-clusters",
        type: "circle",
        source: "cockpit-media",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#10b981",
          "circle-radius": [
            "step",
            ["get", "point_count"],
            14,
            10,
            20,
            30,
            26,
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });

      map.addLayer({
        id: "cockpit-cluster-count",
        type: "symbol",
        source: "cockpit-media",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
          "text-font": ["Open Sans Semibold", "Arial Unicode MS Bold"],
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      map.addLayer({
        id: "cockpit-unclustered",
        type: "circle",
        source: "cockpit-media",
        filter: ["!", ["has", "point_count"]],
        paint: {
          "circle-color": [
            "match",
            ["get", "mediaType"],
            "video",
            "#ef4444",
            "#10b981",
          ],
          "circle-radius": 8,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });

      map.on("click", "cockpit-clusters", (event) => {
        const feature = event.features?.[0];
        if (!feature) return;

        const clusterId = feature.properties?.cluster_id;
        const source = map.getSource("cockpit-media") as mapboxgl.GeoJSONSource & {
          getClusterExpansionZoom: (clusterId: number, callback: (error: Error | null, zoom: number) => void) => void;
        };

        source.getClusterExpansionZoom(clusterId, (error, zoom) => {
          if (error) return;
          const targetZoom = typeof zoom === "number" ? zoom : map.getZoom() + 1;
          map.easeTo({
            center: (feature.geometry as GeoJSON.Point).coordinates as [number, number],
            zoom: targetZoom,
            duration: 300,
          });
        });
      });

      map.on("click", "cockpit-unclustered", (event) => {
        const feature = event.features?.[0];
        if (!feature?.properties) return;

        const mediaId = Number(feature.properties.mediaId);
        const media = mediaById.get(mediaId);
        if (!media) return;

        setSelectedMedia(media);
        setIsSidebarOpen(true);
      });

      map.on("mouseenter", "cockpit-clusters", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "cockpit-clusters", () => {
        map.getCanvas().style.cursor = "";
      });

      map.on("mouseenter", "cockpit-unclustered", () => {
        map.getCanvas().style.cursor = "pointer";
      });

      map.on("mouseleave", "cockpit-unclustered", () => {
        map.getCanvas().style.cursor = "";
      });
    };

    map.on("load", handleLoad);

    return () => {
      map.remove();
      mapRef.current = null;
      setIsMapReady(false);
    };
  }, [mapCenter, cockpitMedia.length, mediaById]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !isMapReady) return;

    const source = map.getSource("cockpit-media") as mapboxgl.GeoJSONSource | undefined;
    if (!source) return;

    source.setData(buildGeoJson());

    if (cockpitMedia.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      cockpitMedia.forEach((item) => bounds.extend([item.longitude, item.latitude]));
      map.fitBounds(bounds, { padding: 60, maxZoom: 16, duration: 350 });
    }
  }, [buildGeoJson, cockpitMedia, isMapReady]);

  const isLoading = projectLoading || mediaLoading;
  const hasError = projectError || mediaError;

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-950 text-white">
        <div className="text-center">
          <Loader2 className="mx-auto mb-3 h-8 w-8 animate-spin text-emerald-400" />
          <p>Loading cockpit...</p>
        </div>
      </div>
    );
  }

  if (hasError || !project) {
    return (
      <div className="min-h-screen bg-gray-950 p-6 text-white">
        <Card className="border-red-500/40 bg-gray-900 text-white max-w-2xl mx-auto mt-16">
          <CardContent className="p-6">
            <h1 className="text-xl font-semibold mb-2">Cockpit unavailable</h1>
            <p className="text-sm text-gray-300">Unable to load this project or its media data.</p>
            <div className="mt-4">
              <Link href={projectId > 0 ? `/project/${projectId}` : "/dashboard"}>
                <Button type="button" variant="outline">Return</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="relative h-screen w-full overflow-hidden bg-gray-950">
      <div className="absolute left-4 top-4 z-30 flex items-center gap-3">
        <Link href={`/project/${projectId}`}>
          <Button type="button" variant="secondary" size="sm" className="bg-white text-gray-900 hover:bg-gray-100">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </Link>

        <div className="rounded-lg bg-black/70 px-3 py-2 text-xs text-white border border-white/20">
          <div className="font-semibold truncate max-w-[220px]">{project.name}</div>
          <div className="text-white/80 flex items-center gap-1 mt-0.5">
            <MapPin className="h-3 w-3" />
            {cockpitMedia.length} GPS media points
          </div>
        </div>
      </div>

      <div ref={mapContainerRef} className="absolute inset-0" />

      <MapboxFlyControls map={mapRef.current} />

      <MediaDetailSidebar
        media={selectedMedia}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />
    </div>
  );
}
