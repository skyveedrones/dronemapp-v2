/**
 * Flight Detail Page
 * Shows detailed view of a single flight with its media
 */

import { useAuth } from "@/_core/hooks/useAuth";
import BackToDashboard from "@/components/BackToDashboard";
import MediaGallery from "@/components/MediaGallery";
import MediaUploadDialog from "@/components/MediaUploadDialog";
import FlightReportDialog from "@/components/FlightReportDialog";
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
  Calendar,
  ChevronDown,
  LogOut,
  Plane,
  Plus,
  Trash2,
  Upload,
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

// Fallback for missing wrapper
const LazyMapWrapper = ({ children, height }: any) => (
  <div style={{ height }} className="w-full bg-muted rounded-xl flex items-center justify-center border-2 border-dashed">
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

  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editFlightDate, setEditFlightDate] = useState("");

  const utils = trpc.useUtils();

  const { data: flight, isLoading, error } = isDemoProject
    ? trpc.flight.getDemo.useQuery({ id: flightId }, { enabled: flightId > 0 })
    : trpc.flight.get.useQuery({ id: flightId }, { enabled: flightId > 0 });

  const { data: project } = isDemoProject
    ? trpc.project.getDemo.useQuery({ id: projectId }, { enabled: projectId > 0 })
    : trpc.project.get.useQuery({ id: projectId }, { enabled: projectId > 0 });

  const updateFlight = trpc.flight.update.useMutation({
    onSuccess: () => {
      toast.success("Flight updated successfully");
      utils.flight.get.invalidate({ id: flightId });
      setEditDialogOpen(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteFlight = trpc.flight.delete.useMutation({
    onSuccess: () => {
      toast.success("Flight deleted successfully");
      setLocation(`/project/${projectId}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleLogout = async () => {
    await logout();
    window.location.href = "/";
  };

  const handleOpenEditDialog = () => {
    if (flight) {
      setEditName(flight.name);
      setEditDescription(flight.description || "");
      setEditDialogOpen(true);
    }
  };

  const handleUpdateFlight = (e: React.FormEvent) => {
    e.preventDefault();
    updateFlight.mutate({
      id: flightId,
      name: editName,
      description: editDescription || null,
    });
  };

  const handleDeleteFlight = () => deleteFlight.mutate({ id: flightId });

  if (isLoading) return <div className="p-24 text-center">Loading Flight Details...</div>;

  if (error || !flight) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full text-center p-8">
          <Plane className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-xl font-bold mb-4">Flight Not Found</h3>
          <Link href={`/project/${projectId}`}><Button>Back to Project</Button></Link>
        </Card>
      </div>
    );
  }

  const formattedFlightDate = flight.flightDate ? format(new Date(flight.flightDate), "MMMM d, yyyy") : "No date set";

  return (
    <div className="min-h-screen bg-background text-foreground">
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b p-4">
        <div className="container flex items-center justify-between">
          <Link href="/" className="font-bold text-xl">MAPIT</Link>
          <div className="flex items-center gap-4">
            <span className="text-sm hidden sm:inline">{user?.email}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}><LogOut className="h-4 w-4 mr-2" /> Logout</Button>
          </div>
        </div>
      </nav>

      <main className="pt-24 pb-12 container mx-auto px-4">
        <motion.div variants={staggerContainer} initial="hidden" animate="visible">
          <BackToDashboard projectId={projectId} />
          
          <div className="flex flex-col md:flex-row justify-between items-start gap-4 mt-6 mb-8">
            <div>
              <h1 className="text-4xl font-bold tracking-tight">{flight.name}</h1>
              <p className="text-muted-foreground mt-2">{flight.description || "No description provided."}</p>
            </div>
            <div className="flex gap-2">
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="lg">Actions <ChevronDown className="ml-2 h-4 w-4" /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => setUploadDialogOpen(true)}><Upload className="mr-2 h-4 w-4" /> Upload Media</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleOpenEditDialog}>Edit Details</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)} className="text-destructive font-bold"><Trash2 className="mr-2 h-4 w-4" /> Delete Flight</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <Card><CardContent className="pt-6"><strong>Date</strong><br/>{formattedFlightDate}</CardContent></Card>
            <Card><CardContent className="pt-6"><strong>Media</strong><br/>{flight.media?.length || 0} items</CardContent></Card>
            <Card><CardContent className="pt-6"><strong>Pilot</strong><br/>{flight.dronePilot || 'Unassigned'}</CardContent></Card>
          </div>

          <LazyMapWrapper height="400px">
            <span className="text-muted-foreground">Map visualization placeholder</span>
          </LazyMapWrapper>

          <div className="mt-12">
            <h2 className="text-2xl font-bold mb-6">Media Gallery</h2>
            {flight.media && flight.media.length > 0 ? (
              <MediaGallery projectId={projectId} flightId={flightId} canEdit={true} onUploadClick={() => setUploadDialogOpen(true)} isDemoProject={isDemoProject} />
            ) : (
              <div className="text-center p-20 border-2 border-dashed rounded-3xl bg-muted/30">
                <p className="mb-4 text-muted-foreground">No media uploaded to this flight.</p>
                <Button onClick={() => setUploadDialogOpen(true)}><Plus className="mr-2 h-4 w-4" /> Upload First Photo</Button>
              </div>
            )}
          </div>
        </motion.div>
      </main>

      <MediaUploadDialog projectId={projectId} flightId={flightId} open={uploadDialogOpen} onOpenChange={setUploadDialogOpen} />

      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Flight Details</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdateFlight} className="space-y-4">
             <div className="space-y-1"><Label>Flight Name</Label><Input value={editName} onChange={e => setEditName(e.target.value)} /></div>
             <div className="space-y-1"><Label>Description</Label><Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} /></div>
             <DialogFooter><Button type="submit">Update Flight</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Permanently delete this flight?</AlertDialogTitle><AlertDialogDescription>This will remove all media and map data associated with this flight. This cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteFlight} className="bg-destructive text-destructive-foreground">Yes, Delete Flight</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <FlightReportDialog open={reportDialogOpen} onOpenChange={setReportDialogOpen} flightId={flightId} flightName={flight.name} media={flight.media || []} isDemoProject={isDemoProject} />
    </div>
  );
}