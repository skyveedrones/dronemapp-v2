import { ZoomIn, ZoomOut, Compass, Eye, RotateCcw, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type mapboxgl from "mapbox-gl";

interface MapboxFlyControlsProps {
  map: mapboxgl.Map | null;
  className?: string;
  variant?: "floating" | "sidebar";
}

const ANIMATION_MS = 300;
const ROTATE_STEP_DEGREES = 15;

export function MapboxFlyControls({ map, className = "", variant = "floating" }: MapboxFlyControlsProps) {
  const handleZoomIn = () => {
    if (!map) return;
    map.easeTo({
      zoom: map.getZoom() + 1,
      duration: ANIMATION_MS,
    });
  };

  const handleZoomOut = () => {
    if (!map) return;
    map.easeTo({
      zoom: Math.max(map.getZoom() - 1, 0),
      duration: ANIMATION_MS,
    });
  };

  const handleResetBearing = () => {
    if (!map) return;
    map.easeTo({
      bearing: 0,
      duration: ANIMATION_MS,
    });
  };

  const handleRotateLeft = () => {
    if (!map) return;
    map.easeTo({
      bearing: map.getBearing() - ROTATE_STEP_DEGREES,
      duration: ANIMATION_MS,
    });
  };

  const handleRotateRight = () => {
    if (!map) return;
    map.easeTo({
      bearing: map.getBearing() + ROTATE_STEP_DEGREES,
      duration: ANIMATION_MS,
    });
  };

  const handleTogglePitch = () => {
    if (!map) return;
    const currentPitch = map.getPitch();
    const nextPitch = currentPitch > 20 ? 0 : 45;
    map.easeTo({
      pitch: nextPitch,
      duration: ANIMATION_MS,
    });
  };

  if (variant === "sidebar") {
    return (
      <div className={`w-full rounded-xl border border-slate-700 bg-slate-800 p-3 ${className}`}>
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-bold mb-2">Pilot Camera</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-9 justify-start px-3 text-xs bg-slate-700 hover:bg-slate-600 text-slate-100"
            onClick={handleZoomIn}
            title="Zoom In"
          >
            <ZoomIn className="h-4 w-4 mr-2" />
            Zoom In
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-9 justify-start px-3 text-xs bg-slate-700 hover:bg-slate-600 text-slate-100"
            onClick={handleZoomOut}
            title="Zoom Out"
          >
            <ZoomOut className="h-4 w-4 mr-2" />
            Zoom Out
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-9 justify-start px-3 text-xs bg-slate-700 hover:bg-slate-600 text-slate-100"
            onClick={handleRotateLeft}
            title="Rotate Left"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Rotate Left
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-9 justify-start px-3 text-xs bg-slate-700 hover:bg-slate-600 text-slate-100"
            onClick={handleRotateRight}
            title="Rotate Right"
          >
            <RotateCw className="h-4 w-4 mr-2" />
            Rotate Right
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-9 justify-start px-3 text-xs bg-slate-700 hover:bg-slate-600 text-slate-100"
            onClick={handleResetBearing}
            title="Reset Rotation"
          >
            <Compass className="h-4 w-4 mr-2" />
            Reset Rotation
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            className="h-9 justify-start px-3 text-xs bg-slate-700 hover:bg-slate-600 text-slate-100"
            onClick={handleTogglePitch}
            title="Toggle 3D Pitch"
          >
            <Eye className="h-4 w-4 mr-2" />
            3D Pitch
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`absolute z-20 flex flex-col gap-2 pointer-events-auto ${className || "top-4 right-4"}`}>
      <div className="flex flex-col gap-1 bg-white rounded-lg shadow-md border border-gray-200">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-9 w-9 p-0 hover:bg-gray-100"
          onClick={handleZoomIn}
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4 text-gray-700" />
        </Button>
        <div className="h-px bg-gray-200" />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-9 w-9 p-0 hover:bg-gray-100"
          onClick={handleZoomOut}
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4 text-gray-700" />
        </Button>
      </div>

      <div className="flex flex-col gap-1 bg-white rounded-lg shadow-md border border-gray-200">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-9 w-9 p-0 hover:bg-gray-100"
          onClick={handleResetBearing}
          title="Reset Rotation"
        >
          <Compass className="h-4 w-4 text-gray-700" />
        </Button>
        <div className="h-px bg-gray-200" />
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-9 w-9 p-0 hover:bg-gray-100"
          onClick={handleTogglePitch}
          title="Toggle 3D Pitch"
        >
          <Eye className="h-4 w-4 text-gray-700" />
        </Button>
      </div>
    </div>
  );
}
