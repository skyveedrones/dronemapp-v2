/**
 * CreationTutorial — Interactive 5-step "Creation Simulator"
 *
 * Route: /demo/create-tutorial
 * Coordinates: Garland, TX (32.9238°N, 96.6111°W)
 *
 * Steps:
 *  01  The Data Drop        — simulate 142 JPG upload with progress bar
 *  02  AI Sync              — reveal orthomosaic 2D map
 *  03  Design Layering      — fade in PDF/CAD overlay
 *  04  Precision Measurement— animate 4,500 sq ft polygon
 *  05  The Victory Lap      — trigger center-orbit flyby
 */

import { FlybyController, FlybyControllerHandle } from "@/components/FlybyController";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { AnimatePresence, motion } from "framer-motion";
import { Camera, CheckCircle2, Layers, Ruler, Rocket, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// ── Constants ────────────────────────────────────────────────────────────────

const CENTER: [number, number] = [-96.6111, 32.9238]; // [lng, lat]
const TOTAL_PHOTOS = 142;

// Overlay image (reuse the utility plan already uploaded)
const OVERLAY_URL =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663204719166/FiS5WF2NaftJTm6fu3BYQb/utility-plan-overlay_5c873d6e.jpg";

// Overlay bounding box (~400m around center)
const OVERLAY_COORDS: [[number, number], [number, number], [number, number], [number, number]] = [
  [CENTER[0] - 0.003, CENTER[1] + 0.002], // top-left
  [CENTER[0] + 0.003, CENTER[1] + 0.002], // top-right
  [CENTER[0] + 0.003, CENTER[1] - 0.002], // bottom-right
  [CENTER[0] - 0.003, CENTER[1] - 0.002], // bottom-left
];

// Playground polygon (4,500 sq ft area NE of center)
const PLAYGROUND_POLYGON: [number, number][] = [
  [CENTER[0] + 0.0005, CENTER[1] + 0.0006],
  [CENTER[0] + 0.0015, CENTER[1] + 0.0006],
  [CENTER[0] + 0.0015, CENTER[1] + 0.0001],
  [CENTER[0] + 0.0005, CENTER[1] + 0.0001],
  [CENTER[0] + 0.0005, CENTER[1] + 0.0006], // close ring
];

// ── Step definitions ─────────────────────────────────────────────────────────

interface TutorialStep {
  id: number;
  title: string;
  text: string;
  btn: string;
  icon: React.ElementType;
}

const STEPS: TutorialStep[] = [
  {
    id: 1,
    title: "Step 01: The Data Drop",
    text: "142 raw drone photos are being uploaded. Watch the progress bar as MAPIT ingests every pixel of GPS-tagged imagery.",
    btn: "Simulate Upload",
    icon: Upload,
  },
  {
    id: 2,
    title: "Step 02: AI Sync",
    text: "MAPIT's AI engine has stitched the photos into a centimeter-accurate orthomosaic. The high-res 2D base map is now live.",
    btn: "Process Telemetry",
    icon: Camera,
  },
  {
    id: 3,
    title: "Step 03: Design Layering",
    text: "A Utility PDF (sewer/water lines) and engineering CAD are being overlaid. See how the infrastructure aligns with the physical site.",
    btn: "Inject PDF/CAD",
    icon: Layers,
  },
  {
    id: 4,
    title: "Step 04: Precision Measurement",
    text: "The playground area measures 4,500 sq ft — generated in two clicks. No tape measure, no surveyor. Just data.",
    btn: "Verify Playground",
    icon: Ruler,
  },
  {
    id: 5,
    title: "Step 05: The Victory Lap",
    text: "This is the Cinematic Flyby — how you present your work to the City Manager. Ready for takeoff?",
    btn: "START FLYBY",
    icon: Rocket,
  },
];

// ── Upload simulation ────────────────────────────────────────────────────────

function UploadSimulation({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [fileCount, setFileCount] = useState(0);

  useEffect(() => {
    let frame = 0;
    const interval = setInterval(() => {
      frame += 1;
      const pct = Math.min(frame * 1.4, 100);
      setProgress(pct);
      setFileCount(Math.min(Math.floor((pct / 100) * TOTAL_PHOTOS), TOTAL_PHOTOS));
      if (pct >= 100) {
        clearInterval(interval);
        setTimeout(onComplete, 600);
      }
    }, 30);
    return () => clearInterval(interval);
  }, [onComplete]);

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-[#10b981] rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-500 font-mono">
        <span>{fileCount} / {TOTAL_PHOTOS} JPGs</span>
        <span>{Math.round(progress)}%</span>
      </div>

      {/* Ghost file icons */}
      <div className="grid grid-cols-14 gap-[2px]">
        {Array.from({ length: TOTAL_PHOTOS }).map((_, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{
              opacity: i < fileCount ? 1 : 0.1,
              scale: i < fileCount ? 1 : 0.5,
            }}
            transition={{ duration: 0.08, delay: i * 0.005 }}
            className={`w-[6px] h-[8px] rounded-[1px] ${
              i < fileCount ? "bg-[#10b981]" : "bg-slate-700"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function CreationTutorial() {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [uploadDone, setUploadDone] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [finished, setFinished] = useState(false);

  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const flybyRef = useRef<FlybyControllerHandle | null>(null);

  // Derived visibility flags
  const showMap = currentStep >= 2;
  const showLayers = currentStep >= 3;
  const showAnnotations = currentStep >= 4;
  const startFlyby = currentStep === 5;

  // ── Initialize Mapbox ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return;
    const token = import.meta.env.VITE_MAPBOX_TOKEN;
    if (!token) return;
    mapboxgl.accessToken = token;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: CENTER,
      zoom: 16,
      pitch: 0,
      bearing: 0,
    });

    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", () => {
      mapRef.current = map;
      setMapReady(true);
    });

    return () => {
      map.remove();
      mapRef.current = null;
      setMapReady(false);
    };
  }, []);

  // ── Step 3: Add overlay layer ──────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !showLayers) return;

    const addOverlay = () => {
      const srcId = "tutorial-overlay-src";
      const layerId = "tutorial-overlay-layer";

      if (map.getLayer(layerId)) map.removeLayer(layerId);
      if (map.getSource(srcId)) map.removeSource(srcId);

      map.addSource(srcId, {
        type: "image",
        url: OVERLAY_URL,
        coordinates: OVERLAY_COORDS,
      });

      map.addLayer({
        id: layerId,
        type: "raster",
        source: srcId,
        paint: { "raster-opacity": 0 },
      });

      // Fade in
      let opacity = 0;
      const fadeIn = () => {
        opacity = Math.min(opacity + 0.02, 0.65);
        if (map.getLayer(layerId)) {
          map.setPaintProperty(layerId, "raster-opacity", opacity);
        }
        if (opacity < 0.65) requestAnimationFrame(fadeIn);
      };
      requestAnimationFrame(fadeIn);
    };

    if (map.isStyleLoaded()) addOverlay();
    else map.once("style.load", addOverlay);
  }, [mapReady, showLayers]);

  // ── Step 4: Animate polygon ────────────────────────────────────────────────
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !showAnnotations) return;

    const addPolygon = () => {
      const srcId = "playground-src";
      const fillId = "playground-fill";
      const lineId = "playground-line";
      const labelId = "playground-label";

      // Clean up
      [fillId, lineId, labelId].forEach((id) => {
        if (map.getLayer(id)) map.removeLayer(id);
      });
      [srcId, "playground-label-src"].forEach((id) => {
        if (map.getSource(id)) map.removeSource(id);
      });

      map.addSource(srcId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: { type: "Polygon", coordinates: [PLAYGROUND_POLYGON] },
        },
      });

      // Fill
      map.addLayer({
        id: fillId,
        type: "fill",
        source: srcId,
        paint: { "fill-color": "#10b981", "fill-opacity": 0 },
      });

      // Outline
      map.addLayer({
        id: lineId,
        type: "line",
        source: srcId,
        paint: {
          "line-color": "#10b981",
          "line-width": 3,
          "line-dasharray": [3, 2],
          "line-opacity": 0,
        },
      });

      // Label
      const centroid: [number, number] = [
        PLAYGROUND_POLYGON.slice(0, 4).reduce((s, p) => s + p[0], 0) / 4,
        PLAYGROUND_POLYGON.slice(0, 4).reduce((s, p) => s + p[1], 0) / 4,
      ];

      map.addSource("playground-label-src", {
        type: "geojson",
        data: {
          type: "Feature",
          properties: { label: "4,500 sq ft" },
          geometry: { type: "Point", coordinates: centroid },
        },
      });

      map.addLayer({
        id: labelId,
        type: "symbol",
        source: "playground-label-src",
        layout: {
          "text-field": ["get", "label"],
          "text-size": 14,
          "text-font": ["DIN Pro Bold", "Arial Unicode MS Bold"],
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#10b981",
          "text-halo-width": 2,
          "text-opacity": 0,
        },
      });

      // Animate in
      let t = 0;
      const animate = () => {
        t = Math.min(t + 0.02, 1);
        if (map.getLayer(fillId)) map.setPaintProperty(fillId, "fill-opacity", t * 0.25);
        if (map.getLayer(lineId)) map.setPaintProperty(lineId, "line-opacity", t);
        if (map.getLayer(labelId)) map.setPaintProperty(labelId, "text-opacity", t);
        if (t < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);

      // Fly to the polygon
      map.flyTo({ center: centroid, zoom: 18, duration: 1200 });
    };

    if (map.isStyleLoaded()) addPolygon();
    else map.once("style.load", addPolygon);
  }, [mapReady, showAnnotations]);

  // ── Step 5: Trigger flyby ──────────────────────────────────────────────────
  useEffect(() => {
    if (!startFlyby || !mapReady) return;
    // Reset view to center before starting flyby
    const map = mapRef.current;
    if (map) {
      map.flyTo({ center: CENTER, zoom: 16, pitch: 0, bearing: 0, duration: 1500 });
    }
    const timer = setTimeout(() => {
      flybyRef.current?.startFlyby();
    }, 1800);
    return () => clearTimeout(timer);
  }, [startFlyby, mapReady]);

  // ── Step action handler ────────────────────────────────────────────────────
  const handleAction = useCallback(() => {
    if (currentStep === 1) {
      // Start upload simulation
      setUploading(true);
    } else if (currentStep < 5) {
      setCurrentStep((s) => s + 1);
    } else {
      // Step 5 — already triggered flyby via effect
      setFinished(true);
    }
  }, [currentStep]);

  const handleUploadComplete = useCallback(() => {
    setUploading(false);
    setUploadDone(true);
    setCurrentStep(2);
  }, []);

  const step = STEPS[currentStep - 1];
  const StepIcon = step.icon;

  return (
    <div className="h-screen w-screen bg-slate-950 relative overflow-hidden">
      {/* ── Map container (always mounted, visibility controlled) ─────────── */}
      <div
        ref={mapContainerRef}
        className="absolute inset-0 transition-opacity duration-1000"
        style={{ opacity: showMap ? 1 : 0 }}
      />

      {/* ── Pre-map dark state with project info ─────────────────────────── */}
      {!showMap && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <p className="text-[#10b981] font-mono text-xs tracking-[0.3em] uppercase mb-3">
              Tutorial Mode
            </p>
            <h1
              className="text-4xl md:text-5xl font-bold text-white mb-3"
              style={{ fontFamily: "var(--font-display)" }}
            >
              City Park Redevelopment
            </h1>
            <p className="text-slate-500 text-sm">
              Riverside City Park &middot; 1200 Park Blvd &middot; Garland, TX 75040
            </p>
            <p className="text-slate-600 text-xs mt-2">40-acre public park orthomosaic survey</p>
          </motion.div>
        </div>
      )}

      {/* ── FlybyController (hidden UI, exposes startFlyby via ref) ─────── */}
      {mapReady && (
        <div className={currentStep === 5 ? "" : "hidden"}>
          <FlybyController ref={flybyRef} mapRef={mapRef} mapLoaded={mapReady} />
        </div>
      )}

      {/* ── Header bar ───────────────────────────────────────────────────── */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-slate-950/70 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 z-[9998]">
        <a href="/" className="flex items-center gap-2">
          <img
            src="/images/mapit-logo-branded.png"
            alt="MAPIT"
            className="h-8 w-auto object-contain"
          />
        </a>
        <div className="flex items-center gap-4">
          <span className="text-slate-500 text-xs font-mono hidden sm:inline">
            CREATION SIMULATOR
          </span>
          <div className="flex gap-1">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`h-1.5 w-6 rounded-full transition-colors duration-500 ${
                  s.id <= currentStep ? "bg-[#10b981]" : "bg-slate-800"
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ── Tutorial card (w-96, bottom-12, z-[9999]) ────────────────────── */}
      {!finished && (
        <div className="fixed inset-0 pointer-events-none z-[9999]">
          <div className="pointer-events-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, y: 40, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -20, scale: 0.97 }}
                transition={{ type: "spring", stiffness: 300, damping: 26 }}
                className="fixed bottom-12 left-1/2 -translate-x-1/2 w-96 max-w-[calc(100vw-2rem)] bg-slate-900 border border-white/10 p-6 rounded-3xl shadow-2xl"
              >
                {/* Header row */}
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[#10b981] font-mono text-xs font-bold uppercase tracking-wider">
                    Learning Flow: Step 0{currentStep}
                  </span>
                  <span className="text-slate-500 text-xs">Riverside City Park, TX</span>
                </div>

                {/* Step icon + title */}
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#10b981]/10 flex items-center justify-center border border-[#10b981]/20">
                    <StepIcon className="h-4 w-4 text-[#10b981]" />
                  </div>
                  <h3 className="text-white font-bold text-lg">{step.title}</h3>
                </div>

                {/* Description */}
                <p className="text-slate-400 text-sm mb-5 leading-relaxed">{step.text}</p>

                {/* Upload simulation (step 1 only) */}
                {currentStep === 1 && uploading && (
                  <div className="mb-5">
                    <UploadSimulation onComplete={handleUploadComplete} />
                  </div>
                )}

                {/* Completed steps */}
                {currentStep > 1 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {STEPS.slice(0, currentStep - 1).map((s) => (
                      <span
                        key={s.id}
                        className="inline-flex items-center gap-1 text-[10px] text-[#10b981]/70 bg-[#10b981]/5 px-2 py-0.5 rounded-full border border-[#10b981]/10"
                      >
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        {s.title.replace(/Step 0\d: /, "")}
                      </span>
                    ))}
                  </div>
                )}

                {/* Action button */}
                {!(currentStep === 1 && uploading) && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handleAction}
                    className={`w-full py-3 font-black rounded-xl transition-all text-slate-950 ${
                      currentStep === 5
                        ? "bg-[#10b981] hover:shadow-[0_0_25px_rgba(16,185,129,0.5)] text-base tracking-widest uppercase"
                        : "bg-[#10b981] hover:bg-[#0da673]"
                    }`}
                  >
                    {uploadDone && currentStep === 1 ? "Continue" : step.btn}
                  </motion.button>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── Completion overlay ────────────────────────────────────────────── */}
      {finished && (
        <div className="fixed inset-0 pointer-events-none z-[9998]">
          <div className="pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="fixed bottom-12 left-1/2 -translate-x-1/2 w-96 max-w-[calc(100vw-2rem)] bg-slate-900/95 border border-[#10b981]/30 p-6 rounded-3xl shadow-2xl backdrop-blur-md text-center"
            >
              <div className="w-12 h-12 rounded-full bg-[#10b981]/10 border border-[#10b981]/20 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="h-6 w-6 text-[#10b981]" />
              </div>
              <h3 className="text-white font-bold text-lg mb-2">Tutorial Complete</h3>
              <p className="text-slate-400 text-sm mb-5 leading-relaxed">
                You've just experienced the full MAPIT creation workflow — from raw drone data to a
                stakeholder-ready digital twin.
              </p>
              <div className="flex gap-3">
                <a
                  href="/project/1"
                  className="flex-1 py-3 bg-[#10b981] text-slate-950 font-bold rounded-xl text-center hover:bg-[#0da673] transition-all text-sm"
                >
                  View Demo Project
                </a>
                <a
                  href="/pricing"
                  className="flex-1 py-3 bg-slate-800 text-white font-bold rounded-xl text-center hover:bg-slate-700 transition-all text-sm border border-white/10"
                >
                  See Plans
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      )}

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <div className="absolute bottom-0 left-0 right-0 h-8 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center z-[9997]">
        <p className="text-slate-600 text-[10px]">
          &copy; 2026 MAPIT by SkyVee Drones. All rights reserved.
        </p>
      </div>
    </div>
  );
}
