/**
 * Project Detail Page
 * Shows detailed view of a single project with management options
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { useClientAccess } from "@/hooks/useClientAccess";
import { BackToDashboard } from "@/components/BackToDashboard";
import { DeleteProjectDialog } from "@/components/DeleteProjectDialog";
import { EditProjectDialog } from "@/components/EditProjectDialog";
import { EmbeddedProjectMap, type EmbeddedProjectMapHandle } from "@/components/EmbeddedProjectMap";
import { ExportDataDialog } from "@/components/ExportDataDialog";
import { FlightCard } from "@/components/FlightCard";
import { MediaGallery } from "@/components/MediaGallery";
import { MediaUploadDialog } from "@/components/MediaUploadDialog";
import { NewFlightDialog } from "@/components/NewFlightDialog";
import { ReportGeneratorDialog } from "@/components/ReportGeneratorDialog";
import { ShareProjectDialog } from "@/components/ShareProjectDialog";
import { WarrantyReminderDialog } from "@/components/WarrantyReminderDialog";
import { ProjectLogoDialog } from "@/components/ProjectLogoDialog";
import { DemoBanner } from "@/components/DemoBanner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Project } from "../../../drizzle/schema";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  Calendar,
  ChevronDown,
  Download,
  FileText,
  FolderOpen,
  Image,
  ImagePlus,
  Layers,
  LogOut,
  Map,
  MapPin,
  Pencil,
  Plane,
  Plus,
  Share2,
  Shield,
  Trash2,
  Upload,
  User,
  Users,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Link, useLocation, useParams } from "wouter";
import { toast } from "sonner";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const statusColors = {
  active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  completed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  archived: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const statusLabels = {
  active: "Active",
  completed: "Completed",
  archived: "Archived",
};

export default function ProjectDetail() {
  const { user, logout } = useAuth();
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const projectId = parseInt(params.id || "0", 10);
  const mapRef = useRef<EmbeddedProjectMapHandle>(null);
  
  // Check if this is the demo project (read-only mode)
  const isDemoProject = projectId === 1;
  
  // Check user access permissions for this project
  const { isClientOnly, canEdit, canDelete } = useClientAccess(projectId);
  
  // Listen for viewOnProjectMap events from MediaGallery
  useEffect(() => {
    const handleViewOnMap = (event: Event) => {
      const customEvent = event as CustomEvent;
      const { latitude, longitude, mediaId } = customEvent.detail;
      if (mapRef.current && latitude && longitude) {
        setTimeout(() => {
          mapRef.current?.panToMedia(parseFloat(latitude), parseFloat(longitude), mediaId);
          // Scroll to map
          const mapElement = document.getElementById('project-map-section');
          if (mapElement) {
            mapElement.scrollIntoView({ behavior: 'smooth' });
          }
        }, 300);
      }
    };
    
    window.addEventListener('viewOnProjectMap', handleViewOnMap);
    return () => window.removeEventListener('viewOnProjectMap', handleViewOnMap);
  }, []);
  // Override permissions for demo project - lock to read-only
  const demoCanEdit = isDemoProject ? false : canEdit;
  const demoCanDelete = isDemoProject ? false : canDelete;

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [newFlightDialogOpen, setNewFlightDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [warrantyReminderDialogOpen, setWarrantyReminderDialogOpen] = useState(false);
  const [logoDialogOpen, setLogoDialogOpen] = useState(false);
  const [sampleReportDialogOpen, setSampleReportDialogOpen] = useState(false);

  // Fetch project details - use public demo procedures if accessing demo project
  const { data: project, isLoading, error } = isDemoProject
    ? trpc.project.getDemo.useQuery(
        { id: projectId },
        { enabled: projectId > 0 }
      )
    : trpc.project.get.useQuery(
        { id: projectId },
        { enabled: projectId > 0 }
      );

  // Fetch media list to determine if we show gallery or empty state
  const { data: mediaList } = isDemoProject
    ? trpc.media.listDemo.useQuery(
        { projectId },
        { enabled: projectId > 0 }
      )
    : trpc.media.list.useQuery(
        { projectId },
        { enabled: projectId > 0 }
      );

  // Fetch flights for this project
  const { data: flights } = isDemoProject
    ? trpc.flight.listDemo.useQuery(
        { projectId },
        { enabled: projectId > 0 }
      )
    : trpc.flight.list.useQuery(
        { projectId },
        { enabled: projectId > 0 }
      );

  // Overlay upload logic
  const fileInputRef = useRef<HTMLInputElement>(null);
  const handleOverlayClick = () => {
    fileInputRef.current?.click();
  };
  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      // Replace with your actual upload function
      const result = await uploadProjectOverlay(formData, projectId);
      if (result.success) {
        window.location.reload();
      }
    } catch (err) {
      toast.error("Upload failed. Check your server logs.");
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    window.location.href = "/";
  };

  const handleDeleteSuccess = () => {
    setLocation("/dashboard");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="container flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <img src="/images/mapit-logo-new.png" alt="Mapit" className="h-12 md:h-14 w-auto object-contain" />
            </Link>
          </div>
        </nav>
        <main className="pt-24 pb-12">
          <div className="container">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-64 w-full mb-4" />
            <div className="grid md:grid-cols-2 gap-4">
              <Skeleton className="h-32" />
              <Skeleton className="h-32" />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="container flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <img src="/images/mapit-logo-new.png" alt="Mapit" className="h-12 md:h-14 w-auto object-contain" />
            </Link>
          </div>
        </nav>
        <main className="pt-24 pb-12">
          <div className="container">
            <Card className="border-destructive/50">
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="h-8 w-8 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Project Not Found</h3>
                <p className="text-muted-foreground mb-4">
                  The project you're looking for doesn't exist or you don't have access to it.
                </p>
                <BackToDashboard variant="default" />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  const formattedFlightDate = project.flightDate
    ? new Date(project.flightDate).toLocaleDateString("en-US", {
        weekday: "long",
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const formattedCreatedDate = new Date(project.createdAt).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const hasMedia = mediaList && mediaList.length > 0;
  
  // For display purposes: show badge if user is client-only
  const isOwner = !isClientOnly;


  // Comparison Mode toggle state
  const [comparisonMode, setComparisonMode] = useState(false);

  // Helper: get overlays from project (if available)
  const overlays = project.overlays || [];

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img src="/images/mapit-logo-new.png" alt="Mapit" className="h-12 md:h-14 w-auto object-contain" />
          </Link>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{user?.name || user?.email || "User"}</span>
            </div>
          </div>
        </div>
      </nav>
      {/* Main Content */}
      <main className="pt-24 pb-12">
        <div className="container">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
          >
            {/* Demo Banner */}
            {isDemoProject && (
              <motion.div variants={fadeInUp} className="mb-6 flex items-center justify-between gap-4">
                <div className="flex-1">
                  <DemoBanner />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="whitespace-nowrap"
                  onClick={() => setSampleReportDialogOpen(true)}
                >
                  See Sample Project Report
                </Button>
              </motion.div>
            )}
            {/* Back Button & Header */}
            <motion.div variants={fadeInUp} className="mb-6">
              <BackToDashboard />
              <div id="demo-welcome" className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex items-start gap-4">
                  {/* Project Logo */}
                  {project.logoUrl && (
                    <div className="flex-shrink-0">
                      <img
                        key={project.logoUrl}
                        src={`${project.logoUrl}?t=${project.updatedAt}`}
                        alt="Project Logo"
                        className="h-16 w-16 md:h-20 md:w-20 object-contain rounded-lg border border-border bg-card p-1"
                      />
                    </div>
                  )}
                  <div>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h1
                      className="text-2xl md:text-3xl font-bold"
                      style={{ fontFamily: "var(--font-display)" }}
                    >
                      {project.name}
                    </h1>
                    <span
                      className={`px-2 py-0.5 text-xs font-medium rounded-full border ${statusColors[project.status]}`}
                    >
                      {statusLabels[project.status]}
                    </span>
                    {isDemoProject && (
                      <span className="px-3 py-1 text-xs font-semibold rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30 flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        Read-Only Demo
                      </span>
                    )}
                  </div>
                  {project.description && (
                    <p className="text-muted-foreground max-w-2xl">
                      {project.description}
                    </p>
                  )}
                </div>
                </div>
                <div className="flex items-center gap-3">
                  {/* Show access role badge for shared projects */}
                  {isClientOnly && (
                    <span className="px-2 py-1 text-xs font-medium rounded-full bg-cyan-500/10 text-cyan-500 border border-cyan-500/20">
                      <Users className="h-3 w-3 inline mr-1" />
                      Client View
                    </span>
                  )}
                  {/* Comparison Mode Toggle */}
                  <Button
                    variant={comparisonMode ? "primary" : "outline"}
                    size="sm"
                    className="ml-2"
                    onClick={() => setComparisonMode((v) => !v)}
                  >
                    {comparisonMode ? "Exit Comparison Mode" : "Enter Comparison Mode"}
                  </Button>
                  {/* Consolidated Project Actions Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button id="project-actions" className="bg-primary text-primary-foreground hover:bg-primary/90">
                        Project Actions
                        <ChevronDown className="h-4 w-4 ml-2" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                      <DropdownMenuItem onClick={() => window.open('https://www.skyveedrones.com', '_blank')}>
                        <Plane className="h-4 w-4 mr-2 text-green-500" />
                        Hire a Pilot
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      {/* Owner and editor actions */}
                      {demoCanEdit && (
                        <DropdownMenuItem onClick={() => setNewFlightDialogOpen(true)}>
                          <Plane className="h-4 w-4 mr-2 text-sky-500" />
                          New Flight
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={() => setReportDialogOpen(true)}>
                        <FileText className="h-4 w-4 mr-2 text-orange-500" />
                        Generate Report
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => isDemoProject ? null : setExportDialogOpen(true)}
                        disabled={isDemoProject}
                      >
                        <Download className="h-4 w-4 mr-2 text-purple-500" />
                        Export GPS Data {isDemoProject && '(Demo)'}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleOverlayClick}>
                        <Layers className="h-4 w-4 mr-2 text-orange-500" />
                        Site Overlay
                      </DropdownMenuItem>
                      {/* Hidden file input for overlay upload */}
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        accept=".pdf,.png,.jpg"
                        onChange={onFileSelected}
                      />
                      {/* Owner-only actions */}
                      {isOwner && !isDemoProject && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setShareDialogOpen(true)}>
                            <Users className="h-4 w-4 mr-2 text-cyan-500" />
                            Share Project
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setLogoDialogOpen(true)}>
                            <ImagePlus className="h-4 w-4 mr-2 text-pink-500" />
                            {project.logoUrl ? 'Change Logo' : 'Upload Logo'}
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setEditDialogOpen(true)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit Project
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => setDeleteDialogOpen(true)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete Project
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </motion.div>
            {/* Condensed Project Info Tile */}
            <motion.div variants={fadeInUp} className="mb-6">
              <Card className="bg-card">
                <CardContent className="py-3">
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                    {project.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">Location:</span>
                        <span className="font-medium">{project.location}</span>
                      </div>
                    )}
                    {formattedFlightDate && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">Flight:</span>
                        <span className="font-medium">{formattedFlightDate}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <Image className="h-4 w-4 text-primary" />
                      <span className="text-muted-foreground">Media:</span>
                      <span className="font-medium">{project.mediaCount} items</span>
                    </div>
                    {/* Warranty Info */}
                    {project.warrantyEndDate && (
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-primary" />
                        <span className="text-muted-foreground">Warranty:</span>
                        <span className="font-medium">
                          {new Date(project.warrantyStartDate!).toLocaleDateString()} - {new Date(project.warrantyEndDate).toLocaleDateString()}
                        </span>
                        {isOwner && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={() => setWarrantyReminderDialogOpen(true)}
                          >
                            <Bell className="h-3 w-3 mr-1" />
                            Reminders
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
            {/* Project Map Section */}
            <motion.div variants={fadeInUp} className="mb-8" id="project-map-section">
              {comparisonMode && overlays.length >= 2 ? (
                <ComparisonSlider
                  beforeLayer={
                    <Source
                      key={overlays[0].id}
                      id={`overlay-${overlays[0].id}`}
                      type="image"
                      url={overlays[0].fileUrl}
                      coordinates={JSON.parse(overlays[0].coordinates)}
                    >
                      <Layer
                        id={`layer-${overlays[0].id}`}
                        type="raster"
                        paint={{
                          'raster-opacity': overlays[0].opacity || 0.5,
                          'raster-fade-duration': 500
                        }}
                      />
                    </Source>
                  }
                  afterLayer={
                    <Source
                      key={overlays[1].id}
                      id={`overlay-${overlays[1].id}`}
                      type="image"
                      url={overlays[1].fileUrl}
                      coordinates={JSON.parse(overlays[1].coordinates)}
                    >
                      <Layer
                        id={`layer-${overlays[1].id}`}
                        type="raster"
                        paint={{
                          'raster-opacity': overlays[1].opacity || 0.5,
                          'raster-fade-duration': 500
                        }}
                      />
                    </Source>
                  }
                />
              ) : (
                <EmbeddedProjectMap
                  ref={mapRef}
                  projectId={project.id}
                  projectName={project.name}
                  isDemoProject={isDemoProject}
                />
              )}
            </motion.div>

            {/* Flights Section */}
            {flights && flights.length > 0 && (
              <motion.div variants={fadeInUp} className="mb-8">
                <div className="flex items-center justify-between mb-4">
                  <h2
                    className="text-lg font-semibold"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    <Plane className="h-5 w-5 inline mr-2 text-primary" />
                    Flights ({flights.length})
                  </h2>
                  {demoCanEdit && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNewFlightDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      New Flight
                    </Button>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-4">
                  Organize your drone media by flight sessions. Each flight can contain its own set of photos and videos.
                </p>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {flights.map((flight) => (
                    <FlightCard
                      key={flight.id}
                      flight={flight}
                      canEdit={demoCanEdit}
                    />
                  ))}
                </div>
              </motion.div>
            )}

            {/* Media Section */}
            <motion.div variants={fadeInUp}>
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-lg font-semibold"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Project Media
                </h2>
              </div>

              {hasMedia ? (
                <div id="media-gallery">
                <MediaGallery
                  isDemoProject={isDemoProject}
                  projectId={projectId} 
                  canEdit={canEdit}
                  onUploadClick={() => setUploadDialogOpen(true)}
                />
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Image className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">No media uploaded yet</h3>
                    <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                      {demoCanEdit 
                        ? "Upload drone photos and videos to this project. Media with GPS data will automatically appear on the map."
                        : "No media has been uploaded to this project yet."}
                    </p>
                    {demoCanEdit && (
                      <Button
                        className="bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => setUploadDialogOpen(true)}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Upload Media
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </motion.div>

            {/* Project Metadata */}
            <motion.div variants={fadeInUp} className="mt-8 text-sm text-muted-foreground">
              <p>Created on {formattedCreatedDate}</p>
            </motion.div>
          </motion.div>
        </div>
      </main>

      {/* Dialogs */}
      <EditProjectDialog
        project={project}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />

      <DeleteProjectDialog
        project={project}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onSuccess={handleDeleteSuccess}
      />

      <MediaUploadDialog
        projectId={projectId}
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />

      <ExportDataDialog
        projectId={projectId}
        projectName={project.name}
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
      />

      <ShareProjectDialog
        projectId={projectId}
        projectName={project.name}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
      />

      <NewFlightDialog
        projectId={projectId}
        open={newFlightDialogOpen}
        onOpenChange={setNewFlightDialogOpen}
      />

      <ReportGeneratorDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        projectId={projectId}
        projectName={project?.name || "Project"}
        media={mediaList || []}
        isDemoProject={isDemoProject}
      />

      <WarrantyReminderDialog
        projectId={projectId}
        projectName={project?.name || "Project"}
        warrantyStartDate={project?.warrantyStartDate ? new Date(project.warrantyStartDate) : null}
        warrantyEndDate={project?.warrantyEndDate ? new Date(project.warrantyEndDate) : null}
        open={warrantyReminderDialogOpen}
        onOpenChange={setWarrantyReminderDialogOpen}
      />

      <ProjectLogoDialog
        projectId={projectId}
        currentLogoUrl={project?.logoUrl}
        open={logoDialogOpen}
        onOpenChange={setLogoDialogOpen}
      />

      {/* Sample Report Dialog - Shows the PDF sample report */}
      {sampleReportDialogOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Sample Project Report</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSampleReportDialogOpen(false)}
              >
                X
              </Button>
            </div>
            <div className="p-6 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-emerald-600" />
              <h3 className="text-xl font-semibold mb-2">DemoSampleReport.pdf</h3>
              <p className="text-muted-foreground mb-6">Click below to view the sample project report</p>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700"
                onClick={() => {
                  window.open('https://files.manuscdn.com/user_upload_by_module/session_file/310519663204719166/riHovZjBSqWGYnSa.pdf', '_blank');
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                View PDF
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
