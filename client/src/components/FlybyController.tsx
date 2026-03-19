/**
 * FlybyController — Cinematic center-orbit camera for Mapbox GL JS
 *
 * Implements the startCinematicFlyby spec:
 *   angle += 0.002 per frame (majestic slow speed)
 *   newLat = center.lat + cos(angle) * radius
 *   newLng = center.lng + sin(angle) * radius
 *   bearing = (angle * 180) / π
 *   pitch = 45°
 *
 * Adds ease-in / ease-out ramps on start and stop so the camera
 * never jerks. Exposes startFlyby() via forwardRef for CityParkTour.
 */

import mapboxgl from "mapbox-gl";
import { Pause, Play, Video } from "lucide-react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";

// ── Easing ────────────────────────────────────────────────────────────────────
function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
}

// ── Constants ─────────────────────────────────────────────────────────────────
/** Angular increment per frame at 60 fps — matches spec's 0.002 rad/frame */
const ANGLE_STEP = 0.002;
/** Orbital radius in degrees — matches spec's 0.005 */
const ORBIT_RADIUS = 0.005;
/** Target pitch in degrees */
const TARGET_PITCH = 45;
/** Ease-in / ease-out ramp duration in frames */
const RAMP_FRAMES = 120; // ~2 s at 60 fps

// ── Public handle ─────────────────────────────────────────────────────────────
export interface FlybyControllerHandle {
  startFlyby: () => void;
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface FlybyControllerProps {
  mapRef: React.MutableRefObject<mapboxgl.Map | null>;
  mapLoaded: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────
export const FlybyController = forwardRef<FlybyControllerHandle, FlybyControllerProps>(
  function FlybyController({ mapRef, mapLoaded }, ref) {
    const [isFlying, setIsFlying] = useState(false);

    // All mutable flyby state lives in refs so RAF callbacks are always fresh
    const flyingRef = useRef(false);
    const rafRef = useRef<number | null>(null);
    const angleRef = useRef(0);           // current orbit angle (radians)
    const frameRef = useRef(0);           // frame counter for ramp
    const centerRef = useRef<{ lat: number; lng: number } | null>(null);
    const startPitchRef = useRef(0);
    const stopRequestedRef = useRef(false);
    const stopFrameRef = useRef(0);       // frames elapsed since stop requested

    // ── Orbit loop ────────────────────────────────────────────────────────────
    const orbitFrame = useCallback(() => {
      const map = mapRef.current;
      if (!map || !flyingRef.current) return;

      const center = centerRef.current;
      if (!center) return;

      // ── Stop ramp ──────────────────────────────────────────────────────────
      if (stopRequestedRef.current) {
        stopFrameRef.current += 1;
        const stopT = Math.min(stopFrameRef.current / RAMP_FRAMES, 1);
        const speedFactor = 1 - easeInOutQuad(stopT);

        angleRef.current += ANGLE_STEP * speedFactor;
        const a = angleRef.current;
        const newLat = center.lat + Math.cos(a) * ORBIT_RADIUS;
        const newLng = center.lng + Math.sin(a) * ORBIT_RADIUS;
        const bearing = ((a * 180) / Math.PI) % 360;
        const pitch = TARGET_PITCH * (1 - easeInOutQuad(stopT));

        map.easeTo({ center: [newLng, newLat], bearing, pitch, duration: 0, easing: (t) => t });

        if (stopT >= 1) {
          flyingRef.current = false;
          stopRequestedRef.current = false;
          stopFrameRef.current = 0;
          setIsFlying(false);
          return;
        }

        rafRef.current = requestAnimationFrame(orbitFrame);
        return;
      }

      // ── Start ramp + steady orbit ──────────────────────────────────────────
      frameRef.current += 1;
      const rampT = Math.min(frameRef.current / RAMP_FRAMES, 1);
      const speedFactor = easeInOutQuad(rampT);

      angleRef.current += ANGLE_STEP * speedFactor;
      const a = angleRef.current;
      const newLat = center.lat + Math.cos(a) * ORBIT_RADIUS;
      const newLng = center.lng + Math.sin(a) * ORBIT_RADIUS;
      const bearing = ((a * 180) / Math.PI) % 360;

      // Pitch: lerp from startPitch to TARGET_PITCH during ramp
      const pitch =
        startPitchRef.current +
        (TARGET_PITCH - startPitchRef.current) * easeInOutQuad(rampT);

      map.easeTo({ center: [newLng, newLat], bearing, pitch, duration: 0, easing: (t) => t });

      rafRef.current = requestAnimationFrame(orbitFrame);
    }, [mapRef]);

    // ── Start flyby ───────────────────────────────────────────────────────────
    const startFlyby = useCallback(() => {
      const map = mapRef.current;
      if (!map || !mapLoaded) return;

      // Capture map center as orbit origin
      const c = map.getCenter();
      centerRef.current = { lat: c.lat, lng: c.lng };

      // Initialise angle from current bearing so camera doesn't snap
      const currentBearing = map.getBearing();
      angleRef.current = (currentBearing * Math.PI) / 180;

      startPitchRef.current = map.getPitch();
      frameRef.current = 0;
      stopRequestedRef.current = false;
      stopFrameRef.current = 0;
      flyingRef.current = true;

      map.dragRotate.enable();
      map.touchZoomRotate.enableRotation();

      setIsFlying(true);
      rafRef.current = requestAnimationFrame(orbitFrame);
    }, [mapRef, mapLoaded, orbitFrame]);

    // ── Stop flyby ────────────────────────────────────────────────────────────
    const stopFlyby = useCallback(() => {
      stopRequestedRef.current = true;
      stopFrameRef.current = 0;
    }, []);

    // ── Toggle ────────────────────────────────────────────────────────────────
    const handleToggle = useCallback(() => {
      if (isFlying) {
        stopFlyby();
      } else {
        if (!mapLoaded) {
          toast.info("Map is still loading. Please wait.");
          return;
        }
        startFlyby();
      }
    }, [isFlying, mapLoaded, startFlyby, stopFlyby]);

    // ── Expose handle ─────────────────────────────────────────────────────────
    useImperativeHandle(ref, () => ({ startFlyby }), [startFlyby]);

    // ── Cleanup ───────────────────────────────────────────────────────────────
    useEffect(() => {
      return () => {
        flyingRef.current = false;
        if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      };
    }, []);

    // ── Record stub ───────────────────────────────────────────────────────────
    const handleRecord = useCallback(() => {
      toast.info("Screen recording is available on AGENCY and MUNICIPAL plans.", {
        description: "Upgrade your plan to unlock stakeholder video exports.",
      });
    }, []);

    return (
      <div
        className="absolute bottom-10 right-10 flex flex-col gap-3 z-50 pointer-events-auto"
        data-flyby-controller
      >
        {/* Cinematic Flyby Button */}
        <button
          onClick={handleToggle}
          className="flex items-center gap-3 px-6 py-4 bg-[#10b981] text-slate-950 font-black rounded-2xl shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:scale-105 active:scale-95 transition-all select-none"
          style={{ fontFamily: "var(--font-display)" }}
          title={isFlying ? "Stop cinematic flyby" : "Launch cinematic flyby"}
        >
          {isFlying ? (
            <Pause size={20} fill="currentColor" />
          ) : (
            <Play size={20} fill="currentColor" />
          )}
          <span className="text-sm tracking-widest uppercase">
            {isFlying ? "Stop Flyby" : "Launch Cinematic Flyby"}
          </span>
          {isFlying && (
            <span className="flex h-2 w-2 rounded-full bg-slate-950 animate-ping ml-1" />
          )}
        </button>

        {/* Record for Stakeholders */}
        <button
          onClick={handleRecord}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-slate-900/80 border border-white/10 text-white text-xs font-bold rounded-xl backdrop-blur-md hover:bg-slate-800 transition-all"
          title="Record flyby for stakeholders (AGENCY/MUNICIPAL plans)"
        >
          <Video size={14} />
          <span className="tracking-widest uppercase">Record for Stakeholders</span>
        </button>
      </div>
    );
  }
);
