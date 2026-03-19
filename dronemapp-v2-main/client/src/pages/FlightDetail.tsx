/**
 * Flight Detail Page
 * Shows detailed view of a single flight with its media
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { BackToDashboard } from "@/components/BackToDashboard";
import { EmbeddedProjectMap } from "@/components/EmbeddedProjectMap";
import { MediaGallery } from "@/components/MediaGallery";
import { MediaUploadDialog } from "@/components/MediaUploadDialog";
import { FlightReportDialog } from "@/components/FlightReportDialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Calendar,
  ChevronDown,
  Download,
  FileText,
  FolderOpen,
  Image,
  Loader2,
  LogOut,
  Map,
  Pencil,
  Plane,
  Plus,
  Shield,
  Trash2,
  Upload,
  User,
} from "lucide-react";
import { useState } from "react";
import { Link, useLocation, useParams } from "wouter";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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

export default function FlightDetail() {
  const { user, logout } = useAuth();
  const params = useParams<{ id: string; flightId: string }>();
  const [, setLocation] = useLocation();
  const projectId = parseInt(params.id || "0", 10);
  const flightId = parseInt(params.flightId || "0", 10);
  const isDemoProject = projectId === 1;

  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  // Edit form state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editFlightDate, setEditFlightDate] = useState("");
  const [editDronePilot, setEditDronePilot] = useState("");
  const [editFaaLicenseNumber, setEditFaaLicenseNumber] = useState("");
  const [editLaancAuthNumber, setEditLaancAuthNumber] = useState("");

  const utils = trpc.useUtils();

  // Fetch flight details with media - use demo procedure for unauthenticated demo access
  const { data: flight, isLoading, error } = isDemoProject
    ? trpc.flight.getDemo.useQuery(
        { id: flightId },
        { enabled: flightId > 0 }
      )
    : trpc.flight.get.useQuery(
        { id: flightId },
        { enabled: flightId > 0 }
      );

  // Fetch parent project for breadcrumb - use demo procedure for unauthenticated demo access
  const { data: project } = isDemoProject
    ? trpc.project.getDemo.useQuery(
        { id: projectId },
        { enabled: projectId > 0 }
      )
    : trpc.project.get.useQuery(
        { id: projectId },
        { enabled: projectId > 0 }
      );

  const updateFlight = trpc.flight.update.useMutation({
    onSuccess: () => {
      toast.success("Flight updated successfully");
      utils.flight.get.invalidate({ id: flightId });
      utils.flight.list.invalidate({ projectId });
      setEditDialogOpen(false);
    },
    onError: (error) => {
      toast.error("Failed to update flight", {
        description: error.message,
      });
    },
  });

  const deleteFlight = trpc.flight.delete.useMutation({
    onSuccess: () => {
      toast.success("Flight deleted successfully");
      setLocation(`/project/${projectId}`);
    },
    onError: (error) => {
      toast.error("Failed to delete flight", {
        description: error.message,
      });
    },
  });

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    window.location.href = "/";
  };

  const handleOpenEditDialog = () => {
    if (flight) {
      setEditName(flight.name);
      setEditDescription(flight.description || "");
      setEditFlightDate(
        flight.flightDate
          ? format(new Date(flight.flightDate), "yyyy-MM-dd")
          : ""
      );
      setEditDronePilot(flight.dronePilot || "");
      setEditFaaLicenseNumber(flight.faaLicenseNumber || "");
      setEditLaancAuthNumber(flight.laancAuthNumber || "");
      setEditDialogOpen(true);
    }
  };

  const handleUpdateFlight = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) {
      toast.error("Please enter a flight name");
      return;
    }
    updateFlight.mutate({
      id: flightId,
      name: editName.trim(),
      description: editDescription.trim() || null,
      flightDate: editFlightDate ? new Date(editFlightDate) : null,
      dronePilot: editDronePilot.trim() || null,
      faaLicenseNumber: editFaaLicenseNumber.trim() || null,
      laancAuthNumber: editLaancAuthNumber.trim() || null,
    });
  };

  const handleDeleteFlight = () => {
    deleteFlight.mutate({ id: flightId });
    setDeleteDialogOpen(false);
  };

  // Check if user is owner
  const isOwner = project && (project as any).accessRole === "owner";
  const isEditor = project && (project as any).accessRole === "editor";
  const canEdit = isOwner || isEditor;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="container flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <img
                src="/images/mapit-logo-new.png"
                alt="Mapit"
                className="h-8 w-auto"
              />
            </Link>
          </div>
        </nav>
        <main className="pt-24 pb-12">
          <div className="container">
            <Skeleton className="h-8 w-48 mb-4" />
            <Skeleton className="h-64 w-full mb-4" />
          </div>
        </main>
      </div>
    );
  }

  if (error || !flight) {
    return (
      <div className="min-h-screen bg-background text-foreground">
        <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="container flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2">
              <img
                src="/images/mapit-logo-new.png"
                alt="Mapit"
                className="h-8 w-auto"
              />
            </Link>
          </div>
        </nav>
        <main className="pt-24 pb-12">
          <div className="container">
            <Card className="border-destructive/50">
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                  <Plane className="h-8 w-8 text-destructive" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Flight Not Found</h3>
                <p className="text-muted-foreground mb-4">
                  The flight you're looking for doesn't exist or you don't have
                  access to it.
                </p>
                <Link href={`/project/${projectId}`}>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back to Project
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  const formattedFlightDate = flight.flightDate
    ? format(new Date(flight.flightDate), "MMMM d, yyyy")
    : null;

  const hasMedia = flight.media && flight.media.length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img
              src="/images/mapit-logo-new.png"
              alt="Mapit"
              className="h-8 w-auto"
            />
          </Link>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">
                {user?.name || user?.email || "User"}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-foreground"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </Button>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-12">
        <div className="container">
          <motion.div
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
          >
            {/* Back to Project Navigation */}
            <motion.div variants={fadeInUp} className="mb-6">
              <BackToDashboard projectId={projectId} />
            </motion.div>

            {/* Flight Header */}
            <motion.div
              variants={fadeInUp}
              className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-8"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <Plane className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <h1
                    className="text-2xl md:text-3xl font-bold mb-2"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {flight.name}
                  </h1>
                  {flight.description && (
                    <p className="text-muted-foreground max-w-2xl">
                      {flight.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {/* Flight Actions Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                      Flight Actions
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    {canEdit && (
                      <DropdownMenuItem
                        onClick={() => setUploadDialogOpen(true)}
                      >
                        <Upload className="h-4 w-4 mr-2 text-emerald-500" />
                        Upload Media
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem
                      onClick={() =>
                        setLocation(`/project/${projectId}/flight/${flightId}/map`)
                      }
                    >
                      <Map className="h-4 w-4 mr-2 text-blue-500" />
                      View Map
                    </DropdownMenuItem>
                    {!isDemoProject && (
                      <DropdownMenuItem
                        onClick={() => setReportDialogOpen(true)}
                      >
                        <Download className="h-4 w-4 mr-2 text-purple-500" />
                        Download Report
                      </DropdownMenuItem>
                    )}

                    {canEdit && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleOpenEditDialog}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit Flight
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteDialogOpen(true)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Flight
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </motion.div>

            {/* Flight Info Cards */}
            <motion.div
              variants={fadeInUp}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8"
            >
              {formattedFlightDate && (
                <Card className="bg-card">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Calendar className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-wide">
                        Flight Date
                      </span>
                    </div>
                    <p className="font-medium">{formattedFlightDate}</p>
                  </CardContent>
                </Card>
              )}

              <Card className="bg-card">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <Image className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-wide">
                      Media Items
                    </span>
                  </div>
                  <p className="font-medium">{flight.media?.length || 0} items</p>
                </CardContent>
              </Card>

              <Card className="bg-card">
                <CardContent className="pt-4">
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <FolderOpen className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-wide">
                      Parent Project
                    </span>
                  </div>
                  <Link
                    href={`/project/${projectId}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {project?.name || "View Project"}
                  </Link>
                </CardContent>
              </Card>

              {/* Pilot Information Cards */}
              {flight.dronePilot && (
                <Card className="bg-card">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <User className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-wide">
                        Drone Pilot
                      </span>
                    </div>
                    <p className="font-medium">{flight.dronePilot}</p>
                  </CardContent>
                </Card>
              )}

              {flight.faaLicenseNumber && (
                <Card className="bg-card">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <FileText className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-wide">
                        FAA License #
                      </span>
                    </div>
                    <p className="font-medium">{flight.faaLicenseNumber}</p>
                  </CardContent>
                </Card>
              )}

              {flight.laancAuthNumber && (
                <Card className="bg-card">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 text-muted-foreground mb-1">
                      <Shield className="h-4 w-4" />
                      <span className="text-xs uppercase tracking-wide">
                        LAANC Auth #
                      </span>
                    </div>
                    <p className="font-medium">{flight.laancAuthNumber}</p>
                  </CardContent>
                </Card>
              )}
            </motion.div>

            {/* Flight Map Section */}
            <motion.div variants={fadeInUp} className="mb-8">
              <EmbeddedProjectMap
                projectId={projectId}
                projectName={flight.name}
                flightId={flightId}
              />
            </motion.div>

            {/* Media Section */}
            <motion.div variants={fadeInUp}>
              <div className="flex items-center justify-between mb-4">
                <h2
                  className="text-lg font-semibold"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Flight Media
                </h2>
              </div>

              {hasMedia ? (
                <MediaGallery
                  projectId={projectId}
                  flightId={flightId}
                  canEdit={canEdit}
                  onUploadClick={() => setUploadDialogOpen(true)}
                  isDemoProject={isDemoProject}
                />
              ) : (
                <Card className="border-dashed">
                  <CardContent className="py-12 text-center">
                    <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                      <Image className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">
                      No media uploaded yet
                    </h3>
                    <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                      {canEdit
                        ? "Upload drone photos and videos to this flight. Media with GPS data will automatically appear on the map."
                        : "No media has been uploaded to this flight yet."}
                    </p>
                    {canEdit && (
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
          </motion.div>
        </div>
      </main>

      {/* Upload Dialog */}
      <MediaUploadDialog
        projectId={projectId}
        flightId={flightId}
        open={uploadDialogOpen}
        onOpenChange={setUploadDialogOpen}
      />

      {/* Edit Flight Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Edit Flight
            </DialogTitle>
            <DialogDescription>
              Update the flight details below.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateFlight} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-flight-name">Flight Name *</Label>
              <Input
                id="edit-flight-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                disabled={updateFlight.isPending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-flight-date">Flight Date</Label>
              <div className="relative">
                <Input
                  id="edit-flight-date"
                  type="date"
                  value={editFlightDate}
                  onChange={(e) => setEditFlightDate(e.target.value)}
                  disabled={updateFlight.isPending}
                  className="pl-10"
                />
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-flight-description">Description</Label>
              <Textarea
                id="edit-flight-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                disabled={updateFlight.isPending}
                rows={3}
              />
            </div>

            {/* Pilot Information Section */}
            <div className="border-t pt-4 space-y-4">
              <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Pilot Information
              </h4>
              
              <div className="space-y-2">
                <Label htmlFor="edit-drone-pilot">Drone Pilot Name</Label>
                <Input
                  id="edit-drone-pilot"
                  placeholder="Enter pilot name"
                  value={editDronePilot}
                  onChange={(e) => setEditDronePilot(e.target.value)}
                  disabled={updateFlight.isPending}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-faa-license" className="flex items-center gap-1">
                    <FileText className="h-3 w-3" />
                    FAA License #
                  </Label>
                  <Input
                    id="edit-faa-license"
                    placeholder="e.g., 1234567"
                    value={editFaaLicenseNumber}
                    onChange={(e) => setEditFaaLicenseNumber(e.target.value)}
                    disabled={updateFlight.isPending}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="edit-laanc-auth" className="flex items-center gap-1">
                    <Shield className="h-3 w-3" />
                    LAANC Auth #
                  </Label>
                  <Input
                    id="edit-laanc-auth"
                    placeholder="e.g., LAANC-2025-001"
                    value={editLaancAuthNumber}
                    onChange={(e) => setEditLaancAuthNumber(e.target.value)}
                    disabled={updateFlight.isPending}
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
                disabled={updateFlight.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateFlight.isPending}>
                {updateFlight.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Flight Report Dialog */}
      <FlightReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        flightId={flightId}
        flightName={flight.name}
        media={flight.media || []}
        isDemoProject={isDemoProject}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Flight</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{flight.name}"? This will also
              delete all {flight.media?.length || 0} media files in this flight.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFlight}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
