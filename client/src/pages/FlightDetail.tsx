/**
 * Flight Detail Page
 * Shows detailed view of a single flight with its media
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { BackToDashboard } from "@/components/BackToDashboard";
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

// Fallback for missing wrapper if not yet imported
const LazyMapWrapper = ({ children, height }: any) => (
  <div style={{ height }} className="w-full bg-muted rounded-xl flex items-center justify-center">
    {children}
  </div>
);

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

  // Fetch flight details
  const { data: flight, isLoading, error } = isDemoProject
    ? trpc.flight.getDemo.useQuery({ id: flightId }, { enabled: flightId > 0 })
    : trpc.flight.get.useQuery({ id: flightId }, { enabled: flightId > 0 });

  // Fetch parent project
  const { data: project } = isDemoProject
    ? trpc.project.getDemo.useQuery({ id: projectId }, { enabled: projectId > 0 })
    : trpc.project.get.useQuery({ id: projectId }, { enabled: projectId > 0 });

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
        flight.flightDate ? format(new Date(flight.flightDate), "yyyy-MM-dd") : ""
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

  const isOwner = project && (project as any).accessRole === "owner";
  const isEditor = project && (project as any).accessRole === "editor";
  const canEdit = isOwner || isEditor;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background text-foreground">
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
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="py-12 text-center">
            <Plane className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Flight Not Found</h3>
            <Link href={`/project/${projectId}`}>
              <Button variant="outline">Back to Project</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formattedFlightDate = flight.flightDate
    ? format(new Date(flight.flightDate), "MMMM d, yyyy")
    : null;

  const hasMedia = flight.media && flight.media.length > 0;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="container flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2">
            <img src="/images/mapit-logo-new.png" alt="MAPIT" className="h-8 w-auto" />
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline">{user?.email}</span>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" /> Logout
            </Button>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-12">
        <div className="container">
          <motion.div variants={staggerContainer} initial="hidden" animate="visible">
            <BackToDashboard projectId={projectId} />
            
            <div className="flex flex-col md:flex-row justify-between items-start gap-4 mt-6 mb-8">
              <div>
                <h1 className="text-3xl font-bold">{flight.name}</h1>
                <p className="text-muted-foreground">{flight.description}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button>Flight Actions <ChevronDown className="ml-2 h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {canEdit && <DropdownMenuItem onClick={() => setUploadDialogOpen(true)}>Upload Media</DropdownMenuItem>}
                  <DropdownMenuItem onClick={handleOpenEditDialog}>Edit Flight</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-destructive">Delete Flight</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <Card><CardContent className="pt-6"><strong>Date:</strong> {formattedFlightDate || 'N/A'}</CardContent></Card>
              <Card><CardContent className="pt-6"><strong>Media:</strong> {flight.media?.length || 0} items</CardContent></Card>
              <Card><CardContent className="pt-6"><strong>Pilot:</strong> {flight.dronePilot || 'N/A'}</CardContent></Card>
            </div>

            <LazyMapWrapper height="400px">
              <div className="text-center text-muted-foreground p-8">Map View</div>
            </LazyMapWrapper>

            <div className="mt-8">
              <h2 className="text-xl font-bold mb-4">Flight Media</h2>
              {hasMedia ? (
                <MediaGallery projectId={projectId} flightId={flightId} canEdit={canEdit} onUploadClick={() => setUploadDialogOpen(true)} isDemoProject={isDemoProject} />
              ) : (
                <div className="text-center p-12 border-2 border-dashed rounded-xl">No media found.</div>
              )}
            </div>
          </motion.div>
        </div>
      </main>

      <MediaUploadDialog projectId={projectId} flightId={flightId} open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} />

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Flight</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdateFlight} className="space-y-4">
             <Input placeholder="Flight Name" value={editName} onChange={e => setEditName(e.target.value)} />
             <Textarea placeholder="Description" value={editDescription} onChange={e => setEditDescription(e.target.value)} />
             <DialogFooter><Button type="submit">Save</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Are you sure?</AlertDialogTitle></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFlight} className="bg-destructive">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <FlightReportDialog open={reportDialogOpen} onOpenChange={setReportDialogOpen} flightId={flightId} flightName={flight.name} media={flight.media || []} isDemoProject={isDemoProject} />
    </div>
  );
}