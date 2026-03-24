import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Copy,
  FileText,
  FolderPlus,
  Layers,
  Mail,
  Map,
  MapPin,
  Pause,
  Play,
  Send,
  Share2,
  Sparkles,
  Upload,
  Volume2,
  VolumeX,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

const AUTO_ADVANCE_MS = 5200;

const FEMALE_VOICE_HINTS = [
  "female",
  "google uk english female",
  "susan",
  "libby",
  "hazel",
  "karen",
  "victoria",
  "sonia",
  "moira",
  "kate",
  "siri",
];

function pickNarrationVoice(voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  if (!voices.length) return null;

  const byFemaleHint = (voice: SpeechSynthesisVoice) =>
    FEMALE_VOICE_HINTS.some((hint) => voice.name.toLowerCase().includes(hint));

  const britishFemale = voices.find((voice) => voice.lang.toLowerCase().startsWith("en-gb") && byFemaleHint(voice));
  if (britishFemale) return britishFemale;

  const anyBritish = voices.find((voice) => voice.lang.toLowerCase().startsWith("en-gb"));
  if (anyBritish) return anyBritish;

  const englishFemale = voices.find((voice) => voice.lang.toLowerCase().startsWith("en") && byFemaleHint(voice));
  if (englishFemale) return englishFemale;

  return voices.find((voice) => voice.lang.toLowerCase().startsWith("en")) ?? voices[0] ?? null;
}

const tutorialSteps = [
  {
    id: "01",
    eyebrow: "Dashboard",
    title: "Start from the project workspace",
    summary:
      "The walkthrough begins where users actually work: the dashboard. The first action is always creating a project shell before anything gets uploaded.",
    bullets: [
      "Open the dashboard and click Create Project.",
      "Choose a template if you want fields pre-filled.",
      "Use a project name that will still make sense six months later.",
    ],
    tip: "The project name and location are the two fields users most often wish they had cleaned up earlier.",
  },
  {
    id: "02",
    eyebrow: "Project Setup",
    title: "Fill in the project details once",
    summary:
      "This mirrors the real Create Project dialog: core project info first, then optional pilot and compliance details if the team tracks them.",
    bullets: [
      "Add project name, location, client, and flight date.",
      "Optionally apply a saved template to save time.",
      "Pilot, FAA, and LAANC info can be carried from saved defaults.",
    ],
    tip: "Templates are best for recurring municipal or construction work where the field structure repeats.",
  },
  {
    id: "03",
    eyebrow: "Upload",
    title: "Bring in media and watch progress",
    summary:
      "After the project exists, upload drone photos and video. MAPIT can then extract GPS and related metadata and place the content into the project timeline.",
    bullets: [
      "Drop JPG, JPEG, PNG, MP4, or MOV files into the upload flow.",
      "Watch the progress indicator instead of guessing whether the transfer is still active.",
      "When upload finishes, the project gains usable map and gallery data.",
    ],
    tip: "If a user wants the best map outcome, GPS-tagged imagery is the most important part of the upload stage.",
  },
  {
    id: "04",
    eyebrow: "Review",
    title: "Verify the map, gallery, and flight path",
    summary:
      "This step teaches users what success looks like after upload: media in the gallery, GPS points on the map, and a visible flight path when coordinates exist.",
    bullets: [
      "Open the project map and confirm GPS points appear.",
      "Review the media gallery and click a file to inspect details.",
      "Use the map to verify the project is grounded in the right physical location.",
    ],
    tip: "Users should check one image on the map early. It catches bad metadata faster than a long upload review.",
  },
  {
    id: "05",
    eyebrow: "Overlay",
    title: "Align plans and drawings on the site",
    summary:
      "Once the base project is working, teams can upload PDF or image overlays and align them against the real-world map for planning and comparison.",
    bullets: [
      "Upload a plan sheet or exported overlay image.",
      "Use alignment tools to snap it to real map coordinates.",
      "Adjust opacity so the team can compare design intent against field conditions.",
    ],
    tip: "A simple, correctly aligned plan is more valuable than a dense overlay that no one trusts.",
  },
  {
    id: "06",
    eyebrow: "Share",
    title: "Send the project to stakeholders",
    summary:
      "The walkthrough ends with the outcome users care about: sharing a clean, reviewable project with clients, managers, or internal stakeholders.",
    bullets: [
      "Generate a project share link or stakeholder invitation.",
      "Send the link by email from the app workflow.",
      "Keep the shared experience read-only when collaboration should stay controlled.",
    ],
    tip: "A short project note plus the share link usually gets better client response than sending raw files.",
  },
] as const;

const shareActions: Array<{ Icon: LucideIcon; label: string }> = [
  { Icon: Mail, label: "Open in Gmail" },
  { Icon: Send, label: "Send invite" },
  { Icon: Map, label: "Read-only map view" },
  { Icon: FileText, label: "Project summary" },
];

function DashboardPreview() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.35fr_0.9fr]">
      <div className="rounded-3xl border border-emerald-400/20 bg-slate-950/90 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-400">Dashboard</p>
            <h3 className="mt-2 text-2xl font-bold text-white">Projects</h3>
          </div>
          <button className="rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 shadow-[0_0_30px_rgba(52,211,153,0.35)]">
            <span className="inline-flex items-center gap-2">
              <FolderPlus className="h-4 w-4" />
              Create Project
            </span>
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[
            ["North Bridge Rehab", "24 photos · map ready"],
            ["Wastewater Line Survey", "112 files · processing"],
            ["City Park Redevelopment", "Demo project"],
            ["Downtown Streetscape", "Overlay aligned"],
          ].map(([title, meta]) => (
            <div key={title} className="rounded-2xl border border-white/8 bg-slate-900/80 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-semibold text-white">{title}</span>
                <span className="rounded-full bg-white/5 px-2 py-1 text-[10px] uppercase tracking-wider text-slate-400">Active</span>
              </div>
              <p className="text-xs text-slate-400">{meta}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-3xl border border-white/10 bg-slate-950/70 p-5">
        <p className="text-xs uppercase tracking-[0.28em] text-slate-500">Why this step matters</p>
        <ul className="mt-4 space-y-3 text-sm text-slate-300">
          <li className="rounded-2xl border border-white/8 bg-white/5 p-3">Projects keep uploads, map data, overlays, and sharing organized in one place.</li>
          <li className="rounded-2xl border border-white/8 bg-white/5 p-3">Creating the shell first prevents media from ending up in the wrong job.</li>
          <li className="rounded-2xl border border-white/8 bg-white/5 p-3">Templates are optional, but they reduce repetitive setup for repeat work.</li>
        </ul>
      </div>
    </div>
  );
}

function FormPreview() {
  return (
    <div className="mx-auto max-w-3xl rounded-[28px] border border-white/10 bg-slate-950/90 p-6 shadow-[0_24px_80px_rgba(0,0,0,0.35)]">
      <div className="mb-5 flex items-center justify-between border-b border-white/8 pb-4">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-emerald-400">Create Project</p>
          <h3 className="mt-2 text-xl font-bold text-white">New project details</h3>
        </div>
        <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-[11px] uppercase tracking-widest text-emerald-300">Template optional</span>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {[
          ["Project Name", "Downtown Construction Site Survey"],
          ["Location", "123 Main St, Garland, TX"],
          ["Client Name", "City of Garland"],
          ["Flight Date", "2026-03-23"],
          ["Drone Pilot", "Clay Brown"],
          ["FAA License", "FA12345678"],
        ].map(([label, value]) => (
          <div key={label} className="space-y-2">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{label}</p>
            <div className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white">{value}</div>
          </div>
        ))}
        <div className="space-y-2 md:col-span-2">
          <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Description</p>
          <div className="rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm leading-relaxed text-slate-300">
            Weekly progress capture for site conditions, utility staging, and overlay alignment against current civil plans.
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadPreview() {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.95fr_1.2fr]">
      <div className="rounded-3xl border border-white/10 bg-slate-950/90 p-5">
        <p className="text-xs uppercase tracking-[0.28em] text-emerald-400">Upload Queue</p>
        <div className="mt-4 space-y-4">
          {[
            ["DJI_1042.JPG", 100],
            ["DJI_1043.JPG", 100],
            ["DJI_1044.JPG", 86],
            ["Site-Pass-01.MP4", 64],
          ].map(([name, percent]) => (
            <div key={String(name)} className="rounded-2xl border border-white/8 bg-white/5 p-3">
              <div className="mb-2 flex items-center justify-between text-sm text-white">
                <span>{name}</span>
                <span className="text-emerald-300">{percent}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${percent}%` }}
                  transition={{ duration: 1.2, ease: "easeOut" }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-3xl border border-emerald-400/20 bg-slate-950/90 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-400">Processing Summary</p>
            <h3 className="mt-2 text-xl font-bold text-white">Metadata extraction in progress</h3>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-right">
            <div className="text-lg font-bold text-white">147</div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Files queued</div>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            ["GPS tagged", "128 files"],
            ["Flight path points", "623 extracted"],
            ["Preview thumbnails", "Ready"],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">{label}</p>
              <p className="mt-2 text-sm font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ReviewPreview() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.25fr_0.9fr]">
      <div className="overflow-hidden rounded-3xl border border-white/10 bg-slate-950/90">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-400">Project Map</p>
            <h3 className="mt-1 text-xl font-bold text-white">GPS verification</h3>
          </div>
          <span className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-[11px] uppercase tracking-widest text-cyan-300">Map ready</span>
        </div>
        <div className="relative h-[320px] bg-[radial-gradient(circle_at_top,#163047,transparent_45%),linear-gradient(135deg,#111827,#020617)]">
          {[
            "left-[18%] top-[24%]",
            "left-[36%] top-[38%]",
            "left-[48%] top-[28%]",
            "left-[62%] top-[52%]",
            "left-[76%] top-[34%]",
          ].map((position, index) => (
            <div key={position} className={`absolute ${position}`}>
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-emerald-300/50 bg-emerald-400/20 text-xs font-bold text-white shadow-[0_0_18px_rgba(52,211,153,0.25)]">
                {index + 1}
              </div>
            </div>
          ))}
          <svg className="absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <path d="M18 26 L36 40 L48 30 L62 54 L76 36" fill="none" stroke="rgba(52,211,153,0.85)" strokeWidth="1.4" strokeDasharray="3 2" />
          </svg>
          <div className="absolute bottom-4 left-4 rounded-full border border-white/10 bg-slate-950/80 px-3 py-1 text-[11px] uppercase tracking-widest text-slate-300">128 GPS points</div>
        </div>
      </div>
      <div className="rounded-3xl border border-white/10 bg-slate-950/90 p-5">
        <p className="text-xs uppercase tracking-[0.28em] text-emerald-400">Media check</p>
        <div className="mt-4 space-y-3">
          {[
            ["DJI_1042.JPG", "GPS found · gallery thumbnail ready"],
            ["DJI_1043.JPG", "Map point verified"],
            ["Site-Pass-01.MP4", "Video preview generated"],
          ].map(([name, meta]) => (
            <div key={name} className="rounded-2xl border border-white/8 bg-white/5 p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-white">{name}</p>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              </div>
              <p className="mt-1 text-xs text-slate-400">{meta}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function OverlayPreview() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.95fr]">
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-slate-950/90">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-400">Overlay Manager</p>
            <h3 className="mt-1 text-xl font-bold text-white">Plan alignment</h3>
          </div>
          <button className="rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white">
            <span className="inline-flex items-center gap-2">
              <Layers className="h-4 w-4 text-emerald-400" />
              Add Overlay
            </span>
          </button>
        </div>
        <div className="relative h-[320px] bg-[linear-gradient(160deg,#0f172a,#020617)]">
          <div className="absolute inset-[12%] rounded-2xl border border-cyan-300/40 bg-cyan-300/10 backdrop-blur-[1px]" />
          {[
            "left-[12%] top-[12%]",
            "right-[12%] top-[12%]",
            "right-[12%] bottom-[12%]",
            "left-[12%] bottom-[12%]",
          ].map((position) => (
            <div key={position} className={`absolute ${position} h-3 w-3 rounded-full border border-emerald-300 bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]`} />
          ))}
          <div className="absolute bottom-4 left-4 rounded-full border border-white/10 bg-slate-950/80 px-3 py-1 text-[11px] uppercase tracking-widest text-slate-300">Opacity 70%</div>
        </div>
      </div>
      <div className="rounded-3xl border border-white/10 bg-slate-950/90 p-5">
        <p className="text-xs uppercase tracking-[0.28em] text-emerald-400">Checklist</p>
        <div className="mt-4 space-y-3 text-sm text-slate-300">
          {[
            "Upload a plan sheet or exported overlay image.",
            "Use the alignment handles to match the real site.",
            "Lower opacity until the crew can compare field conditions and design intent.",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/5 p-4">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
              <span>{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SharePreview() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_1.1fr]">
      <div className="rounded-3xl border border-white/10 bg-slate-950/90 p-5">
        <p className="text-xs uppercase tracking-[0.28em] text-emerald-400">Stakeholder handoff</p>
        <div className="mt-4 space-y-3">
          <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Share link</p>
            <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl border border-white/8 bg-slate-900 px-3 py-3 text-sm text-white">
              <span className="truncate">mapit.skyveedrones.com/share/garland-site-q1</span>
              <Copy className="h-4 w-4 text-slate-400" />
            </div>
          </div>
          <div className="rounded-2xl border border-white/8 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">Email draft</p>
            <div className="mt-2 rounded-2xl border border-white/8 bg-slate-900 px-4 py-3 text-sm text-slate-300">
              City Manager team, here is the latest MAPIT project for review. The link opens the current map, gallery, and aligned plan set.
            </div>
          </div>
        </div>
      </div>
      <div className="rounded-3xl border border-emerald-400/20 bg-slate-950/90 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-emerald-400">Share actions</p>
            <h3 className="mt-1 text-xl font-bold text-white">Ready to send</h3>
          </div>
          <Share2 className="h-5 w-5 text-emerald-400" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {shareActions.map(({ Icon, label }) => (
            <button key={label} className="rounded-2xl border border-white/8 bg-white/5 px-4 py-4 text-left text-sm font-semibold text-white transition-colors hover:bg-white/10">
              <span className="inline-flex items-center gap-3">
                <Icon className="h-4 w-4 text-emerald-400" />
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TutorialPreview({ stepIndex }: { stepIndex: number }) {
  const previews = [
    <DashboardPreview key="dashboard" />,
    <FormPreview key="form" />,
    <UploadPreview key="upload" />,
    <ReviewPreview key="review" />,
    <OverlayPreview key="overlay" />,
    <SharePreview key="share" />,
  ];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={stepIndex}
        initial={{ opacity: 0, y: 18, scale: 0.985 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -16, scale: 0.985 }}
        transition={{ duration: 0.28, ease: "easeOut" }}
      >
        {previews[stepIndex]}
      </motion.div>
    </AnimatePresence>
  );
}

export default function CreationTutorial() {
  const [stepIndex, setStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [narrationEnabled, setNarrationEnabled] = useState(false);
  const narrationTimeoutRef = useRef<number | null>(null);

  const currentStep = tutorialSteps[stepIndex];

  useEffect(() => {
    if (!isPlaying) return;

    const timer = window.setInterval(() => {
      setStepIndex((current) => {
        if (current >= tutorialSteps.length - 1) {
          setIsPlaying(false);
          return current;
        }
        return current + 1;
      });
    }, AUTO_ADVANCE_MS);

    return () => window.clearInterval(timer);
  }, [isPlaying]);

  useEffect(() => {
    if (!narrationEnabled || typeof window === "undefined" || !window.speechSynthesis) return;

    const synth = window.speechSynthesis;
    const step = tutorialSteps[stepIndex];
    const rawText = [
      `Step ${step.id}.`,
      `${step.eyebrow}.`,
      `${step.title}.`,
      step.summary,
      ...step.bullets,
      `Tip. ${step.tip}`,
    ].join(" ");

    const segments = rawText
      .split(/(?<=[.!?])\s+/)
      .map((segment) => segment.trim())
      .filter(Boolean);

    let disposed = false;

    const clearNarrationTimeout = () => {
      if (narrationTimeoutRef.current !== null) {
        window.clearTimeout(narrationTimeoutRef.current);
        narrationTimeoutRef.current = null;
      }
    };

    const speakSegments = () => {
      if (disposed) return;

      synth.cancel();
      const selectedVoice = pickNarrationVoice(synth.getVoices());
      let segmentIndex = 0;

      const speakNext = () => {
        if (disposed || segmentIndex >= segments.length) return;

        const utterance = new SpeechSynthesisUtterance(segments[segmentIndex]);
        if (selectedVoice) {
          utterance.voice = selectedVoice;
          utterance.lang = selectedVoice.lang;
        } else {
          utterance.lang = "en-GB";
        }

        utterance.rate = 0.9;
        utterance.pitch = 1.03;
        utterance.volume = 0.95;
        utterance.onend = () => {
          segmentIndex += 1;
          narrationTimeoutRef.current = window.setTimeout(speakNext, 120);
        };
        synth.speak(utterance);
      };

      speakNext();
    };

    const handleVoicesChanged = () => {
      speakSegments();
      synth.removeEventListener("voiceschanged", handleVoicesChanged);
    };

    if (synth.getVoices().length === 0) {
      synth.addEventListener("voiceschanged", handleVoicesChanged);
    } else {
      speakSegments();
    }

    return () => {
      disposed = true;
      clearNarrationTimeout();
      synth.removeEventListener("voiceschanged", handleVoicesChanged);
      synth.cancel();
    };
  }, [stepIndex, narrationEnabled]);

  const goToStep = (index: number) => {
    setStepIndex(index);
    setIsPlaying(false);
  };

  const handleNarrationToggle = () => {
    setNarrationEnabled((v) => {
      if (v && typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (!v) setIsPlaying(false);
      return !v;
    });
  };

  const handleNext = () => {
    setStepIndex((current) => Math.min(current + 1, tutorialSteps.length - 1));
    setIsPlaying(false);
  };

  const handlePrevious = () => {
    setStepIndex((current) => Math.max(current - 1, 0));
    setIsPlaying(false);
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.16),_transparent_28%),linear-gradient(180deg,#020617,#020617_55%,#0f172a)] text-white">
      <div className="mx-auto max-w-[1440px] px-4 py-6 md:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-white/10 bg-slate-950/70 px-5 py-4 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <a href="/dashboard" className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-slate-300 transition-colors hover:bg-white/10 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
            </a>
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-emerald-400">Guided Walkthrough</p>
              <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">How to set up a new MAPIT project</h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setIsPlaying((value) => !value)}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isPlaying ? "Pause walkthrough" : "Resume walkthrough"}
            </button>
            <button
              type="button"
              onClick={handleNarrationToggle}
              className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold transition-colors ${
                narrationEnabled
                  ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300 hover:bg-emerald-400/20"
                  : "border-white/10 bg-white/5 text-white hover:bg-white/10"
              }`}
            >
              {narrationEnabled ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              {narrationEnabled ? "Mute narration" : "Voice narration"}
            </button>
            <a href="/project/1" className="inline-flex items-center gap-2 rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 transition-transform hover:scale-[1.02]">
              <MapPin className="h-4 w-4" />
              Open Demo Project
            </a>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
          <aside className="rounded-[30px] border border-white/10 bg-slate-950/70 p-5 backdrop-blur-xl xl:sticky xl:top-6 xl:h-[calc(100vh-6rem)] xl:overflow-hidden">
            <div className="mb-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.28em] text-slate-500">Step {currentStep.id} of {tutorialSteps.length.toString().padStart(2, "0")}</span>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] uppercase tracking-wider text-emerald-300">Autoplay ready</span>
              </div>
              <h2 className="text-2xl font-bold tracking-tight">{currentStep.title}</h2>
              <p className="mt-3 text-sm leading-6 text-slate-300">{currentStep.summary}</p>
            </div>

            <div className="mb-6 space-y-3">
              {tutorialSteps.map((step, index) => {
                const isActive = index === stepIndex;
                const isDone = index < stepIndex;
                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => goToStep(index)}
                    className={`w-full rounded-2xl border px-4 py-3 text-left transition-all ${
                      isActive
                        ? "border-emerald-400/40 bg-emerald-400/10"
                        : isDone
                          ? "border-white/8 bg-white/5"
                          : "border-white/8 bg-transparent hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-[10px] uppercase tracking-[0.24em] text-slate-500">{step.eyebrow}</p>
                        <p className="mt-1 text-sm font-semibold text-white">{step.title}</p>
                      </div>
                      <div className={`flex h-8 w-8 items-center justify-center rounded-full border ${isActive ? "border-emerald-400/40 bg-emerald-400/20 text-emerald-300" : "border-white/10 bg-white/5 text-slate-400"}`}>
                        {isDone ? <CheckCircle2 className="h-4 w-4" /> : step.id}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="rounded-3xl border border-white/8 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.28em] text-emerald-400">What to tell the user</p>
              <ul className="mt-3 space-y-3 text-sm text-slate-300">
                {currentStep.bullets.map((bullet) => (
                  <li key={bullet} className="flex gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-400" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 rounded-2xl border border-emerald-400/15 bg-emerald-400/5 p-3 text-xs leading-5 text-emerald-100/85">
                <span className="font-semibold text-emerald-300">Trainer note:</span> {currentStep.tip}
              </div>
            </div>
          </aside>

          <section className="rounded-[34px] border border-white/10 bg-slate-950/55 p-4 backdrop-blur-xl md:p-5 lg:p-6">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/8 bg-white/5 px-4 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-emerald-400">Walkthrough canvas</p>
                <p className="mt-1 text-sm text-slate-300">A realistic guide for new users, based on the actual MAPIT setup flow.</p>
              </div>
              <div className="flex items-center gap-2">
                {tutorialSteps.map((step, index) => (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => goToStep(index)}
                    className={`h-2.5 rounded-full transition-all ${index === stepIndex ? "w-10 bg-emerald-400" : "w-4 bg-white/12 hover:bg-white/20"}`}
                    aria-label={`Go to step ${step.id}`}
                  />
                ))}
              </div>
            </div>

            <TutorialPreview stepIndex={stepIndex} />

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/8 bg-white/5 px-4 py-4">
              <div className="flex items-center gap-2 text-sm text-slate-300">
                <Sparkles className="h-4 w-4 text-emerald-400" />
                This walkthrough is designed to be watched or stepped through manually.
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handlePrevious}
                  disabled={stepIndex === 0}
                  className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={stepIndex === tutorialSteps.length - 1}
                  className="inline-flex items-center gap-2 rounded-2xl bg-emerald-400 px-4 py-2 text-sm font-bold text-slate-950 transition-transform hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Next step
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
