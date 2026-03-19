/**
 * Media Gallery Component
 * Displays uploaded media files in a grid with preview and actions
 * Includes Action dropdown with Upload, Download, Watermark, Delete, and Sort options
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { useClientRole, canEdit, canDownload } from "@/_core/hooks/useClientRole";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Media } from "../../../drizzle/schema";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Calendar,
  Camera,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  FileImage,
  FileVideo,
  ImagePlus,
  MapPin,
  MapPinOff,
  Maximize2,
  Minimize2,
  Mountain,
  RotateCcw,
  SortAsc,
  SortDesc,
  Trash2,
  Upload,
  X,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { useState, useMemo, useEffect, useCallback, useRef, memo, useLayoutEffect } from "react";
import { VList } from "virtua";
import { toast } from "sonner";
import { WatermarkDialog } from "./WatermarkDialog";
import { GPSEditDialog } from "./GPSEditDialog";
import { MediaMetadataDisplay } from "./MediaMetadataDisplay";

// ── Cloudinary gallery thumbnail helper ──────────────────────────────────────
// Inserts w_400,h_400,c_fill,q_auto,f_auto into Cloudinary delivery URLs
// so the gallery loads small, optimized tiles instead of full-resolution files.
function cloudinaryGalleryThumb(url: string): string {
  if (!url) return url;
  // Match Cloudinary delivery URL: https://res.cloudinary.com/<cloud>/image|video/upload/...
  const match = url.match(/^(https:\/\/res\.cloudinary\.com\/[^/]+\/(image|video)\/upload\/)(.*)$/);
  if (!match) return url;
  const [, base, , rest] = match;
  // Strip a leading Cloudinary transformation segment.
  // A transformation segment looks like "w_300,h_200,c_fill" (key_value pairs separated by commas)
  // followed by a slash. We only strip if the first path component looks like a transform.
  const stripped = rest.replace(/^([a-z][a-z0-9]*_[^/,]+)(,[a-z][a-z0-9]*_[^/,]+)*\//, "");
  return `${base}w_400,h_400,c_fill,q_auto,f_auto/${stripped}`;
}

interface MediaGalleryProps {
  isDemoProject?: boolean;
  projectId: number;
  flightId?: number;
  canEdit?: boolean;
  onUploadClick?: () => void;
}

type SortOption = "newest" | "oldest" | "name-asc" | "name-desc" | "size-asc" | "size-desc" | "flight-path";

// ── LazyImage: Intersection Observer-based lazy loader with blur placeholder ──
interface LazyImageProps {
  src: string;
  alt: string;
  className?: string;
  onError?: React.ReactEventHandler<HTMLImageElement>;
}

const LazyImage = memo(function LazyImage({ src, alt, className, onError }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [inView, setInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setInView(true); observer.disconnect(); } },
      { rootMargin: "1200px" } // Start loading 1200px before entering viewport for smoother scrolling
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className={`relative w-full h-full overflow-hidden ${className ?? ""}`} style={{ minHeight: "200px" }}>
      {/* Blur placeholder shown until image loads */}
      {!loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded" />
      )}
      {inView && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
          onLoad={() => setLoaded(true)}
          onError={(e) => { setLoaded(true); onError?.(e); }}
        />
      )}
    </div>
  );
});

// ── MediaCard: memoized gallery tile ──────────────────────────────────────────
interface MediaCardProps {
  item: Media;
  isSelected: boolean;
  markerNumber?: number;
  canEditMedia: boolean;
  isDemoProject: boolean;
  onCardClick: (item: Media) => void;
  onToggleSelection: (id: number, e: React.MouseEvent) => void;
}

const MediaCard = memo(function MediaCard({
  item,
  isSelected,
  markerNumber,
  canEditMedia,
  isDemoProject,
  onCardClick,
  onToggleSelection,
}: MediaCardProps) {
  const thumbSrc = cloudinaryGalleryThumb(item.mediaType === "photo" ? item.url : (item.thumbnailUrl || item.url));

  return (
    <div
      className={`group relative aspect-square rounded-lg overflow-hidden bg-card border cursor-pointer transition-all ${
        isSelected
          ? "border-primary ring-2 ring-primary/20"
          : "border-border hover:border-primary/50"
      }`}
      style={{ contentVisibility: "auto" }}
      onClick={() => !isDemoProject && onCardClick(item)}
    >
      <LazyImage
        src={thumbSrc}
        alt={item.filename}
        onError={(e) => {
          if (item.mediaType === "video" && (e.currentTarget as HTMLImageElement).src !== item.url) {
            (e.currentTarget as HTMLImageElement).src = item.url;
          }
        }}
      />

      {/* Video play icon */}
      {item.mediaType === "video" && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-12 h-12 rounded-full bg-black/60 flex items-center justify-center">
            <div className="w-0 h-0 border-t-[10px] border-t-transparent border-l-[16px] border-l-white border-b-[10px] border-b-transparent ml-1" />
          </div>
        </div>
      )}

      {/* GPS Marker Number Badge */}
      {markerNumber !== undefined && (
        <div className="absolute bottom-2 right-2 z-10">
          <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-lg border-2 border-white">
            {markerNumber}
          </div>
        </div>
      )}

      {/* Selection Checkbox */}
      {canEditMedia && (
        <div
          className="absolute top-2 left-2 z-10"
          onClick={(e) => onToggleSelection(item.id, e)}
        >
          <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
            isSelected
              ? "bg-primary border-primary"
              : "bg-white/90 border-gray-400 hover:border-primary"
          }`}>
            {isSelected && <Check className="h-4 w-4 text-primary-foreground" />}
          </div>
        </div>
      )}

      {/* Hover overlay with filename */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white text-sm font-medium truncate">{item.filename}</p>
          {item.latitude && item.longitude && (
            <div className="flex items-center gap-1 text-white/80 text-xs mt-1">
              <MapPin className="h-3 w-3" />
              <span>GPS Available</span>
            </div>
          )}
        </div>
      </div>

      {/* Priority / HD / No-GPS badges */}
      <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
        {item.highResUrl && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/90 text-white text-xs font-medium shadow-lg">
            <span>HD</span>
          </div>
        )}
        {item.priority && item.priority !== "none" && (
          <div className={`w-7 h-7 rounded-full flex items-center justify-center shadow-lg ${
            item.priority === "high" ? "bg-red-500" : "bg-yellow-500"
          }`}>
            <span className="text-white font-bold text-lg">!</span>
          </div>
        )}
        {(!item.latitude || !item.longitude) && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-amber-500/90 text-white text-xs font-medium">
            <MapPinOff className="h-3 w-3" />
            <span>No GPS</span>
          </div>
        )}
      </div>
    </div>
  );
}, (prev, next) =>
  // Custom comparison: only re-render if selection, data, or marker number changes
  prev.isSelected === next.isSelected &&
  prev.markerNumber === next.markerNumber &&
  prev.item.id === next.item.id &&
  prev.item.url === next.item.url &&
  prev.item.thumbnailUrl === next.item.thumbnailUrl &&
  prev.canEditMedia === next.canEditMedia
);

// ── VirtualMediaGrid: VList-based virtual scrolling for 50+ items ─────────────
// Chunks items into rows and uses VList to only render visible rows.
// This eliminates browser repaint lag when scrolling large galleries.
interface VirtualMediaGridProps {
  items: Media[];
  selectedIds: Set<number>;
  gpsMarkerNumbers: Map<number, number>;
  canEditMedia: boolean;
  isDemoProject: boolean;
  onCardClick: (item: Media) => void;
  onToggleSelection: (id: number, e: React.MouseEvent) => void;
}

const VirtualMediaGrid = memo(function VirtualMediaGrid({
  items,
  selectedIds,
  gpsMarkerNumbers,
  canEditMedia,
  isDemoProject,
  onCardClick,
  onToggleSelection,
}: VirtualMediaGridProps) {
  // Determine column count from window width (matches Tailwind breakpoints)
  const getColCount = () => {
    if (typeof window === "undefined") return 4;
    if (window.innerWidth >= 1024) return 4;
    if (window.innerWidth >= 768) return 3;
    return 2;
  };

  const [colCount, setColCount] = useState(getColCount);

  useEffect(() => {
    const handleResize = () => setColCount(getColCount());
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Chunk items into rows
  const rows = useMemo(() => {
    const result: Media[][] = [];
    for (let i = 0; i < items.length; i += colCount) {
      result.push(items.slice(i, i + colCount));
    }
    return result;
  }, [items, colCount]);

  return (
    <VList style={{ height: "70vh" }}>
      {rows.map((row, rowIdx) => (
        <div key={rowIdx} className="flex gap-4 mb-4">
          {row.map((item) => (
            <div key={`media-${item.id}`} className="flex-1 min-w-0" style={{ aspectRatio: "1", minHeight: "200px", height: "auto" }}>
              <MediaCard
                item={item}
                isSelected={selectedIds.has(item.id)}
                markerNumber={gpsMarkerNumbers.get(item.id)}
                canEditMedia={canEditMedia}
                isDemoProject={isDemoProject}
                onCardClick={onCardClick}
                onToggleSelection={onToggleSelection}
              />
            </div>
          ))}
          {/* Fill empty slots in the last row */}
          {row.length < colCount &&
            Array.from({ length: colCount - row.length }).map((_, i) => (
              <div key={`empty-${i}`} className="flex-1 min-w-0" />
            ))}
        </div>
      ))}
    </VList>
  );
});

export function MediaGallery({ projectId, flightId, canEdit = true, onUploadClick, isDemoProject = false }: MediaGalleryProps) {
  const { user: authUser } = useAuth();
  const userClientRole = useClientRole();
  const isViewer = userClientRole === 'viewer';
  const canEditMedia = canEdit && !isViewer;
  const canDeleteMedia = canEditMedia && (authUser?.role === 'admin' || authUser?.role === 'webmaster');
  const canDownloadMedia = canDownload(userClientRole);
  const [selectedMedia, setSelectedMedia] = useState<Media | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<Media | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [watermarkDialogOpen, setWatermarkDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("flight-path");
  const [gpsEditDialogOpen, setGpsEditDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [mediaToRename, setMediaToRename] = useState<Media | null>(null);
  const [newFilename, setNewFilename] = useState("");
  const [mediaForGpsEdit, setMediaForGpsEdit] = useState<Media | null>(null);
  
  // Fullscreen and zoom state
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isHoveringImage, setIsHoveringImage] = useState(false);
  const imageContainerRef = useRef<HTMLDivElement>(null);
  const dialogContentRef = useRef<HTMLDivElement>(null);

  // Fetch media - use demo procedure for unauthenticated demo access
  const { data: mediaList, isLoading } = isDemoProject
    ? trpc.media.listDemo.useQuery({ projectId, flightId }, { staleTime: Infinity, refetchOnWindowFocus: false })
    : trpc.media.list.useQuery({ projectId, flightId }, { staleTime: Infinity, refetchOnWindowFocus: false });
  const deleteMutation = trpc.media.delete.useMutation();
  const updateNotesMutation = trpc.media.updateNotes.useMutation({
    onSuccess: () => {
      // Invalidate media list to refresh data
      utils.media.list.invalidate({ projectId, flightId });
      toast.success("Notes saved");
    },
    onError: (error) => {
      toast.error(`Failed to save notes: ${error.message}`);
    },
  });
  const updatePriorityMutation = trpc.media.updatePriority.useMutation({
    onSuccess: () => {
      // Invalidate media list to refresh data
      utils.media.list.invalidate({ projectId, flightId });
      toast.success("Priority updated");
    },
    onError: (error) => {
      toast.error(`Failed to update priority: ${error.message}`);
    },
  });
  const renameMutation = trpc.media.rename.useMutation();
  const utils = trpc.useUtils();

  // Create GPS marker number mapping based on capture time (flight path order)
  // This ensures numbers stay consistent with map markers regardless of gallery sorting
  const gpsMarkerNumbers = useMemo(() => {
    if (!mediaList) return new Map<number, number>();
    
    // Get only media with GPS coordinates
    const gpsMedia = mediaList.filter(m => m.latitude && m.longitude);
    
    // Sort by capture time to match map marker order
    const sortedByCapture = [...gpsMedia].sort((a, b) => {
      if (a.capturedAt && b.capturedAt) {
        return new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime();
      }
      if (a.capturedAt && !b.capturedAt) return -1;
      if (!a.capturedAt && b.capturedAt) return 1;
      return a.filename.localeCompare(b.filename);
    });
    
    // Create mapping: media ID -> marker number
    const numberMap = new Map<number, number>();
    sortedByCapture.forEach((media, index) => {
      numberMap.set(media.id, index + 1);
    });
    
    console.log('[GPS Markers] Total GPS media:', gpsMedia.length, 'Mapped:', numberMap.size);
    
    return numberMap;
  }, [mediaList]);

  // Sort media based on selected option
  const sortedMedia = useMemo(() => {
    if (!mediaList) return [];
    const sorted = [...mediaList];
    
    switch (sortBy) {
      case "newest":
        return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      case "oldest":
        return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      case "name-asc":
        return sorted.sort((a, b) => a.filename.localeCompare(b.filename));
      case "name-desc":
        return sorted.sort((a, b) => b.filename.localeCompare(a.filename));
      case "size-asc":
        return sorted.sort((a, b) => a.fileSize - b.fileSize);
      case "size-desc":
        return sorted.sort((a, b) => b.fileSize - a.fileSize);
      case "flight-path":
        // Sort by capture time to match drone flight sequence
        return sorted.sort((a, b) => {
          // Items with capture time come first
          if (a.capturedAt && b.capturedAt) {
            return new Date(a.capturedAt).getTime() - new Date(b.capturedAt).getTime();
          }
          // Items without capture time go to the end
          if (a.capturedAt && !b.capturedAt) return -1;
          if (!a.capturedAt && b.capturedAt) return 1;
          // Fall back to filename for items without capture time
          return a.filename.localeCompare(b.filename);
        });
      default:
        return sorted;
    }
  }, [mediaList, sortBy]);

  // Get selected media items
  const selectedMediaItems = useMemo(() => {
    return sortedMedia.filter(m => selectedIds.has(m.id));
  }, [sortedMedia, selectedIds]);

  // Get current media index for navigation
  const currentMediaIndex = useMemo(() => {
    if (!selectedMedia) return -1;
    return sortedMedia.findIndex(m => m.id === selectedMedia.id);
  }, [selectedMedia, sortedMedia]);

  // Navigate to previous media
  const navigateToPrevious = useCallback(() => {
    if (currentMediaIndex > 0) {
      setSelectedMedia(sortedMedia[currentMediaIndex - 1]);
    }
  }, [currentMediaIndex, sortedMedia]);

  // Navigate to next media
  const navigateToNext = useCallback(() => {
    if (currentMediaIndex < sortedMedia.length - 1) {
      setSelectedMedia(sortedMedia[currentMediaIndex + 1]);
    }
  }, [currentMediaIndex, sortedMedia]);

  // Zoom functions
  const MIN_ZOOM = 1;
  const MAX_ZOOM = 5;
  const ZOOM_STEP = 0.5;

  const handleZoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomLevel(prev => {
      const newZoom = Math.max(prev - ZOOM_STEP, MIN_ZOOM);
      if (newZoom === MIN_ZOOM) {
        setPanPosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  }, []);

  const handleResetZoom = useCallback(() => {
    setZoomLevel(1);
    setPanPosition({ x: 0, y: 0 });
  }, []);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev);
    // Reset zoom when exiting fullscreen
    if (isFullscreen) {
      handleResetZoom();
    }
  }, [isFullscreen, handleResetZoom]);

  // Reset zoom and scroll when changing media
  useEffect(() => {
    handleResetZoom();
    // Scroll to top when opening or changing media
    if (selectedMedia && dialogContentRef.current) {
      dialogContentRef.current.scrollTop = 0;
    }
  }, [selectedMedia?.id, handleResetZoom]);

  // Handle mouse wheel zoom
  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!selectedMedia || selectedMedia.mediaType !== "photo") return;
    e.preventDefault();
    e.stopPropagation();
    if (e.deltaY < 0) {
      handleZoomIn();
    } else {
      handleZoomOut();
    }
  }, [selectedMedia, handleZoomIn, handleZoomOut]);

  // Handle drag/pan when zoomed
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoomLevel <= 1) return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - panPosition.x, y: e.clientY - panPosition.y });
  }, [zoomLevel, panPosition]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    setPanPosition({ x: newX, y: newY });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Keyboard navigation and zoom
  useEffect(() => {
    if (!selectedMedia) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === "ArrowLeft" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        navigateToPrevious();
      } else if (e.key === "ArrowRight" && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        navigateToNext();
      } else if (e.key === "Escape") {
        if (isFullscreen) {
          setIsFullscreen(false);
          handleResetZoom();
        } else {
          setSelectedMedia(null);
        }
      } else if (e.key === "+" || e.key === "=") {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === "-") {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === "0") {
        e.preventDefault();
        handleResetZoom();
      } else if (e.key === "f" || e.key === "F") {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedMedia, navigateToPrevious, navigateToNext, isFullscreen, handleZoomIn, handleZoomOut, handleResetZoom, toggleFullscreen]);

  // Toggle selection
  const toggleSelection = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  // Select all / deselect all
  const toggleSelectAll = () => {
    if (selectedIds.size === sortedMedia.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedMedia.map(m => m.id)));
    }
  };

  // Handle single delete
  const handleDelete = async () => {
    if (!mediaToDelete) return;

    try {
      await deleteMutation.mutateAsync({ id: mediaToDelete.id });
      toast.success("Media deleted successfully");
      setDeleteDialogOpen(false);
      setMediaToDelete(null);
      if (selectedMedia?.id === mediaToDelete.id) {
        setSelectedMedia(null);
      }
      selectedIds.delete(mediaToDelete.id);
      setSelectedIds(new Set(selectedIds));
      // Invalidate queries
      await utils.media.list.invalidate({ projectId });
      await utils.project.get.invalidate({ id: projectId });
      await utils.project.list.invalidate();
    } catch (error) {
      toast.error("Failed to delete media");
    }
  };

  // Handle rename
  const handleRename = async () => {
    if (!mediaToRename || !newFilename.trim()) return;

    try {
      await renameMutation.mutateAsync({
        id: mediaToRename.id,
        filename: newFilename.trim(),
      });
      toast.success("Media renamed successfully");
      setRenameDialogOpen(false);
      setMediaToRename(null);
      setNewFilename("");
      // Update selected media if it's the one being renamed
      if (selectedMedia?.id === mediaToRename.id) {
        setSelectedMedia({ ...selectedMedia, filename: newFilename.trim() });
      }
      // Invalidate queries
      await utils.media.list.invalidate({ projectId });
      await utils.project.get.invalidate({ id: projectId });
      await utils.project.list.invalidate();
    } catch (error) {
      toast.error("Failed to rename media");
    }
  };

  // Handle bulk delete
  const handleBulkDelete = async () => {
    const idsToDelete = Array.from(selectedIds);
    let successCount = 0;
    let failCount = 0;

    for (const id of idsToDelete) {
      try {
        await deleteMutation.mutateAsync({ id });
        successCount++;
      } catch (error) {
        failCount++;
      }
    }

    if (successCount > 0) {
      toast.success(`Deleted ${successCount} item${successCount > 1 ? "s" : ""}`);
    }
    if (failCount > 0) {
      toast.error(`Failed to delete ${failCount} item${failCount > 1 ? "s" : ""}`);
    }

    setBulkDeleteDialogOpen(false);
    setSelectedIds(new Set());
    await utils.media.list.invalidate({ projectId });
    await utils.project.get.invalidate({ id: projectId });
    await utils.project.list.invalidate();
  };

  // Download selected media
  const handleDownloadSelected = () => {
    selectedMediaItems.forEach((item, index) => {
      setTimeout(() => {
        const link = document.createElement("a");
        link.href = item.url;
        link.download = item.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, index * 300);
    });
    toast.success(`Downloading ${selectedMediaItems.length} file${selectedMediaItems.length > 1 ? "s" : ""}`);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "Unknown";
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatCoordinate = (value: string | null, type: "lat" | "lng") => {
    if (!value) return null;
    const num = parseFloat(value);
    if (isNaN(num)) return null;
    const direction = type === "lat" ? (num >= 0 ? "N" : "S") : num >= 0 ? "E" : "W";
    return `${Math.abs(num).toFixed(6)}° ${direction}`;
  };

  const getSortLabel = (option: SortOption) => {
    switch (option) {
      case "newest": return "Newest First";
      case "oldest": return "Oldest First";
      case "name-asc": return "Name (A-Z)";
      case "name-desc": return "Name (Z-A)";
      case "size-asc": return "Size (Smallest)";
      case "size-desc": return "Size (Largest)";
      case "flight-path": return "Flight Path";
    }
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[...Array(8)].map((_, i) => (
          <Skeleton key={i} className="aspect-square rounded-lg" />
        ))}
      </div>
    );
  }

  if (!mediaList || mediaList.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <FileImage className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>No media uploaded yet</p>
        <p className="text-sm mb-4">Upload drone photos and videos to see them here</p>
        {canEditMedia && onUploadClick && (
          <Button onClick={onUploadClick}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Media
          </Button>
        )}
      </div>
    );
  }

  const photoCount = selectedMediaItems.filter(m => m.mediaType === "photo").length;
  const videoCount = selectedMediaItems.filter(m => m.mediaType === "video").length;
  const watermarkableCount = photoCount + videoCount;

  return (
    <>
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        {/* Left side - Media Action dropdown */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm">
                Media Action
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {isDemoProject ? (
                <div className="px-2 py-1.5 text-sm text-muted-foreground">
                  Demo project is read-only
                </div>
              ) : (
                <>
                  {canEditMedia && (
                    <>
                      <DropdownMenuItem onClick={onUploadClick}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Media
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={handleDownloadSelected}
                    disabled={selectedIds.size === 0 || !canDownloadMedia}
                    title={!canDownloadMedia ? "Viewers cannot download media" : ""}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Selected ({selectedIds.size})
                  </DropdownMenuItem>
                  {canEditMedia && (
                    <>
                      <DropdownMenuItem
                        onClick={() => setWatermarkDialogOpen(true)}
                        disabled={watermarkableCount === 0}
                      >
                        <ImagePlus className="h-4 w-4 mr-2" />
                        Watermark Media ({watermarkableCount})
                      </DropdownMenuItem>
                      {canDeleteMedia && (
                      <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => setBulkDeleteDialogOpen(true)}
                        disabled={selectedIds.size === 0}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete Selected ({selectedIds.size})
                      </DropdownMenuItem>
                      </>
                      )}
                    </>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          {selectedIds.size > 0 && (
            <span className="text-sm text-muted-foreground">
              {selectedIds.size} selected
            </span>
          )}
        </div>

        {/* Right side - Select All and Sort */}
        <div className="flex items-center gap-2">
          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <SortAsc className="h-4 w-4 mr-2" />
                {getSortLabel(sortBy)}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setSortBy("newest")}>
                <SortDesc className="h-4 w-4 mr-2" />
                Newest First
                {sortBy === "newest" && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("oldest")}>
                <SortAsc className="h-4 w-4 mr-2" />
                Oldest First
                {sortBy === "oldest" && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortBy("name-asc")}>
                <ArrowDownAZ className="h-4 w-4 mr-2" />
                Name (A-Z)
                {sortBy === "name-asc" && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("name-desc")}>
                <ArrowUpAZ className="h-4 w-4 mr-2" />
                Name (Z-A)
                {sortBy === "name-desc" && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortBy("size-asc")}>
                <SortAsc className="h-4 w-4 mr-2" />
                Size (Smallest)
                {sortBy === "size-asc" && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setSortBy("size-desc")}>
                <SortDesc className="h-4 w-4 mr-2" />
                Size (Largest)
                {sortBy === "size-desc" && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setSortBy("flight-path")}>
                <MapPin className="h-4 w-4 mr-2" />
                Flight Path (by capture time)
                {sortBy === "flight-path" && <Check className="h-4 w-4 ml-auto" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Select All button - now on the right */}
          <Button
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
            disabled={isDemoProject}
            title={isDemoProject ? "Selection disabled in demo mode" : ""}
          >
            {selectedIds.size === sortedMedia.length ? (
              <>
                <X className="h-4 w-4 mr-2" />
                Deselect All
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-2" />
                Select All
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Help Text */}
      <div className="mb-4 p-3 rounded-lg bg-muted/50 border border-border">
        <p className="text-xs text-muted-foreground">
          <strong>Tip:</strong> Click on any image to view details and metadata. 
          {canEditMedia && " Use checkboxes to select multiple items, then use the Action menu to download, watermark, or delete them in bulk."}
          {" "}Images with GPS data will appear on the project map.
        </p>
      </div>

      {/* Media Grid — VList virtual scrolling for 50+ items, CSS grid for smaller sets */}
      {sortedMedia.length >= 50 ? (
        // VList with row-chunking: only renders rows currently visible — eliminates repaint lag
        // Each "row" contains COLS_PER_ROW MediaCards rendered as a flex row
        <VirtualMediaGrid
          items={sortedMedia}
          selectedIds={selectedIds}
          gpsMarkerNumbers={gpsMarkerNumbers}
          canEditMedia={canEditMedia}
          isDemoProject={isDemoProject}
          onCardClick={setSelectedMedia}
          onToggleSelection={toggleSelection}
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {sortedMedia.map((item) => (
            <MediaCard
              key={item.id}
              item={item}
              isSelected={selectedIds.has(item.id)}
              markerNumber={gpsMarkerNumbers.get(item.id)}
              canEditMedia={canEditMedia}
              isDemoProject={isDemoProject}
              onCardClick={setSelectedMedia}
              onToggleSelection={toggleSelection}
            />
          ))}
        </div>
      )}

      {/* Media Preview Dialog */}
      <Dialog open={!!selectedMedia} onOpenChange={() => { setSelectedMedia(null); setIsFullscreen(false); handleResetZoom(); }}>
        <DialogContent 
          className={`overflow-hidden flex flex-col transition-all duration-300 ${
            isFullscreen 
              ? "!fixed !inset-0 !top-0 !left-0 !translate-x-0 !translate-y-0 !w-screen !h-screen !max-w-none !max-h-none !rounded-none !border-none !p-0" 
              : "sm:max-w-4xl max-h-[90vh]"
          }`}
          showCloseButton={!isFullscreen}
        >
          <DialogHeader className={`flex-shrink-0 ${isFullscreen ? "absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4" : "border-b border-border p-4"}`}>
            <div className="flex items-center justify-between pr-8">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <DialogTitle className={`truncate text-lg font-semibold ${isFullscreen ? "text-white" : "text-foreground"}`}>
                  {selectedMedia?.filename}
                </DialogTitle>
                {canEditMedia && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 flex-shrink-0"
                    onClick={() => {
                      setMediaToRename(selectedMedia);
                      setNewFilename(selectedMedia?.filename || "");
                      setRenameDialogOpen(true);
                    }}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2 ml-4 flex-shrink-0">
                {sortedMedia.length > 1 && (
                  <span className={`text-sm ${isFullscreen ? "text-white/80" : "text-muted-foreground"}`}>
                    {currentMediaIndex + 1} of {sortedMedia.length}
                  </span>
                )}
                {/* Zoom controls for photos and videos */}
                {selectedMedia && (
                  <div className={`flex items-center gap-1 ml-2 px-2 py-1 rounded-lg ${isFullscreen ? "bg-black/50" : "bg-muted"}`}>
                    <button
                      onClick={handleResetZoom}
                      disabled={zoomLevel <= 1}
                      className={`p-1 rounded hover:bg-white/20 ${zoomLevel <= 1 ? "opacity-50 pointer-events-none" : ""} ${isFullscreen ? "text-white" : ""}`}
                      title="Reset zoom (0)"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                    <button
                      onClick={handleZoomOut}
                      disabled={zoomLevel <= MIN_ZOOM}
                      className={`p-1 rounded hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed ${isFullscreen ? "text-white" : ""}`}
                      title="Zoom out (-)"
                    >
                      <ZoomOut className="h-4 w-4" />
                    </button>
                    <span className={`text-xs min-w-[3rem] text-center ${isFullscreen ? "text-white" : ""}`}>
                      {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                      onClick={handleZoomIn}
                      disabled={zoomLevel >= MAX_ZOOM}
                      className={`p-1 rounded hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed ${isFullscreen ? "text-white" : ""}`}
                      title="Zoom in (+)"
                    >
                      <ZoomIn className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {/* Fullscreen toggle */}
                <button
                  onClick={toggleFullscreen}
                  className={`p-1.5 rounded-lg hover:bg-white/20 ${isFullscreen ? "text-white bg-black/50" : "bg-muted"}`}
                  title={isFullscreen ? "Exit fullscreen (F)" : "Fullscreen (F)"}
                >
                  {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </DialogHeader>

          {selectedMedia && (
            <div ref={dialogContentRef} className={`flex-1 ${isFullscreen ? "h-full overflow-hidden" : isHoveringImage ? "overflow-hidden" : "overflow-y-auto"}`}>
              {/* Media Preview with Navigation */}
              <div 
                ref={imageContainerRef}
                className={`relative bg-black overflow-hidden group ${
                  isFullscreen ? "h-full" : "rounded-lg mb-4"
                } ${zoomLevel > 1 ? "cursor-grab active:cursor-grabbing" : ""}`}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={() => {
                  handleMouseUp();
                  setIsHoveringImage(false);
                }}
                onMouseEnter={() => setIsHoveringImage(true)}
              >
                {selectedMedia.mediaType === "photo" ? (
                  <img
                    src={selectedMedia.url}
                    alt={selectedMedia.filename}
                    className={`w-full object-contain select-none transition-transform duration-100 ${
                      isFullscreen ? "h-full" : "max-h-[50vh]"
                    }`}
                    style={{
                      transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
                    }}
                    draggable={false}
                  />
                ) : (
                  <div className={`relative ${isFullscreen ? "h-full flex items-center justify-center" : ""}`}>
                    <video
                      key={selectedMedia.id}
                      controls
                      controlsList="nodownload"
                      playsInline
                      poster={selectedMedia.thumbnailUrl || undefined}
                      className={`w-full bg-black select-none transition-transform duration-100 ${isFullscreen ? "h-full object-contain" : "max-h-[50vh]"}`}
                      style={{
                        transform: `scale(${zoomLevel}) translate(${panPosition.x / zoomLevel}px, ${panPosition.y / zoomLevel}px)`,
                      }}
                      preload="metadata"
                    >
                      {/* Provide multiple source options for better compatibility */}
                      <source src={selectedMedia.url} type={selectedMedia.mimeType || 'video/mp4'} />
                      <source src={selectedMedia.url} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                    {/* Video info overlay */}
                    <div className="absolute top-2 right-2 px-2 py-1 rounded bg-black/70 text-white text-xs flex items-center gap-1">
                      <FileVideo className="h-3 w-3" />
                      Video
                    </div>
                  </div>
                )}

                {/* Navigation Arrows */}
                {sortedMedia.length > 1 && (
                  <>
                    {/* Previous Button */}
                    <button
                      onClick={navigateToPrevious}
                      disabled={currentMediaIndex === 0}
                      className={`absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white transition-all ${
                        currentMediaIndex === 0
                          ? "opacity-30 cursor-not-allowed"
                          : "opacity-0 group-hover:opacity-100 hover:bg-black/80"
                      }`}
                      aria-label="Previous media"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>

                    {/* Next Button */}
                    <button
                      onClick={navigateToNext}
                      disabled={currentMediaIndex === sortedMedia.length - 1}
                      className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/60 text-white transition-all ${
                        currentMediaIndex === sortedMedia.length - 1
                          ? "opacity-30 cursor-not-allowed"
                          : "opacity-0 group-hover:opacity-100 hover:bg-black/80"
                      }`}
                      aria-label="Next media"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                  </>
                )}

                {/* GPS Marker Number Badge - Lower Right Corner */}
                {gpsMarkerNumbers.has(selectedMedia.id) && (
                  <div className="absolute bottom-2 right-2 z-10">
                    <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center font-bold text-sm shadow-lg border-2 border-white">
                      {gpsMarkerNumbers.get(selectedMedia.id)}
                    </div>
                  </div>
                )}
              </div>

              {/* Tip for green screen issues - shown below video */}
              {!isFullscreen && selectedMedia.mediaType === "video" && (
                <div className="text-center py-1.5 px-3 bg-muted/50 rounded-lg mb-3">
                  <p className="text-xs text-muted-foreground">
                    For Full Screen: Right-click video → Open in New Tab → Click the new tab
                  </p>
                </div>
              )}

              {/* Priority Selection - Full width */}
              {!isFullscreen && (
                <div className="mb-4">
                  <div className="p-3 rounded-lg bg-card border border-border flex flex-col">
                    <div className="flex items-center gap-2 text-muted-foreground mb-3">
                      <FileImage className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-wide">Priority for PDF Report</span>
                    </div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="priority"
                          value="none"
                          checked={selectedMedia.priority === "none"}
                          onChange={(e) => {
                            const newPriority = e.target.value as "none" | "low" | "high";
                            setSelectedMedia({ ...selectedMedia, priority: newPriority });
                            updatePriorityMutation.mutate({
                              id: selectedMedia.id,
                              priority: newPriority,
                            });
                          }}
                          disabled={!canEditMedia}
                          className="w-4 h-4"
                        />
                        <span className="text-sm">None</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="priority"
                          value="low"
                          checked={selectedMedia.priority === "low"}
                          onChange={(e) => {
                            const newPriority = e.target.value as "none" | "low" | "high";
                            setSelectedMedia({ ...selectedMedia, priority: newPriority });
                            updatePriorityMutation.mutate({
                              id: selectedMedia.id,
                              priority: newPriority,
                            });
                          }}
                          disabled={!canEditMedia}
                          className="w-4 h-4"
                        />
                        <span className="text-sm flex items-center gap-1">
                          <span className="text-yellow-500 font-bold">!</span>
                          Low Priority (Yellow)
                        </span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="priority"
                          value="high"
                          checked={selectedMedia.priority === "high"}
                          onChange={(e) => {
                            const newPriority = e.target.value as "none" | "low" | "high";
                            setSelectedMedia({ ...selectedMedia, priority: newPriority });
                            updatePriorityMutation.mutate({
                              id: selectedMedia.id,
                              priority: newPriority,
                            });
                          }}
                          disabled={!canEditMedia}
                          className="w-4 h-4"
                        />
                        <span className="text-sm flex items-center gap-1">
                          <span className="text-red-500 font-bold">!</span>
                          High Priority (Red)
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Notes - Full width below image */}
              {!isFullscreen && (
                <div className="mb-4">
                  <div className="p-3 rounded-lg bg-card border border-border flex flex-col">
                    <div className="flex items-center gap-2 text-muted-foreground mb-2">
                      <FileImage className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-wide">Notes</span>
                    </div>
                    <textarea
                      className="w-full min-h-[100px] bg-background border border-input rounded-md px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                      placeholder="Add notes about this media file..."
                      value={selectedMedia.notes || ""}
                      onChange={(e) => {
                        setSelectedMedia({ ...selectedMedia, notes: e.target.value });
                      }}
                      onBlur={(e) => {
                        updateNotesMutation.mutate({
                          id: selectedMedia.id,
                          notes: e.target.value || null,
                        });
                      }}
                      disabled={!canEditMedia}
                    />
                  </div>
                </div>
              )}

              {/* EXIF/GPS Metadata Display */}
              {!isFullscreen && (
                <div className="mb-4">
                  <div className="p-3 rounded-lg bg-card border border-border">
                    <div className="flex items-center gap-2 text-muted-foreground mb-3">
                      <MapPin className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-wide">Metadata</span>
                    </div>
                    <MediaMetadataDisplay
                      latitude={selectedMedia.latitude ? parseFloat(selectedMedia.latitude) : null}
                      longitude={selectedMedia.longitude ? parseFloat(selectedMedia.longitude) : null}
                      altitude={selectedMedia.altitude ? parseFloat(selectedMedia.altitude) : null}
                      capturedAt={selectedMedia.createdAt}
                      cameraMake={selectedMedia.cameraMake}
                      cameraModel={selectedMedia.cameraModel}
                      fileSize={selectedMedia.fileSize}
                      canEdit={canEditMedia}
                      mediaId={selectedMedia.id}
                      onEditGps={() => {
                        setMediaForGpsEdit(selectedMedia);
                        setGpsEditDialogOpen(true);
                      }}
                      onViewOnMap={() => {
                        // Dispatch event to parent to pan map
                        window.dispatchEvent(new CustomEvent('viewOnProjectMap', {
                          detail: {
                            latitude: selectedMedia.latitude,
                            longitude: selectedMedia.longitude,
                            mediaId: selectedMedia.id,
                          },
                        }));
                        // Close the modal immediately
                        setSelectedMedia(null);
                      }}
                    />
                  </div>
                </div>
              )}


            </div>
          )}

          {/* Actions - Hidden in fullscreen */}
          {!isFullscreen && (
          <div className="flex justify-between items-center pt-4 border-t border-border flex-shrink-0">
            {canDeleteMedia ? (
              <Button
                variant="outline"
                className="border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                onClick={() => {
                  setMediaToDelete(selectedMedia);
                  setDeleteDialogOpen(true);
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            ) : (
              <div />
            )}
            <div className="flex flex-col gap-3">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  asChild
                >
                  <a href={selectedMedia?.url} download={selectedMedia?.filename} target="_blank" rel="noopener noreferrer">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </a>
                </Button>
                <Button
                  variant="default"
                  onClick={() => {
                    if (selectedMedia && selectedMedia.highResUrl) {
                      setSelectedMedia({
                        ...selectedMedia,
                        url: selectedMedia.highResUrl,
                      });
                      toast.success("Viewing high-resolution version");
                    } else {
                      toast.info("No high-resolution version uploaded yet");
                    }
                  }}
                  disabled={!selectedMedia?.highResUrl}
                >
                  <Download className="h-4 w-4 mr-2" />
                  View High Resolution
                </Button>

                <Button variant="outline" onClick={() => setSelectedMedia(null)}>
                  Close
                </Button>
              </div>

            </div>
          </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Media</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{mediaToDelete?.filename}"? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Confirmation Dialog */}
      <Dialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {selectedIds.size} Items</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.size} selected item{selectedIds.size > 1 ? "s" : ""}? 
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleBulkDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : `Delete ${selectedIds.size} Items`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Watermark Dialog */}
      <WatermarkDialog
        open={watermarkDialogOpen}
        onOpenChange={setWatermarkDialogOpen}
        selectedMedia={selectedMediaItems}
        projectId={projectId}
        isDemoProject={isDemoProject}
        onWatermarkApplied={() => {
          utils.media.list.invalidate({ projectId, flightId });
          setSelectedIds(new Set());
        }}
      />

      {/* GPS Edit Dialog */}
      <GPSEditDialog
        open={gpsEditDialogOpen}
        onOpenChange={setGpsEditDialogOpen}
        media={mediaForGpsEdit}
        projectId={projectId}
        onSuccess={() => {
          // Refresh the selected media if it was edited
          if (mediaForGpsEdit && selectedMedia?.id === mediaForGpsEdit.id) {
            setSelectedMedia(null);
          }
        }}
      />

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Media File</DialogTitle>
            <DialogDescription>
              Enter a new filename for "{mediaToRename?.filename}"
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <input
              type="text"
              className="w-full px-3 py-2 border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              value={newFilename}
              onChange={(e) => setNewFilename(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newFilename.trim()) {
                  handleRename();
                }
              }}
              placeholder="Enter new filename"
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRename}
              disabled={renameMutation.isPending || !newFilename.trim()}
            >
              {renameMutation.isPending ? "Renaming..." : "Rename"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
