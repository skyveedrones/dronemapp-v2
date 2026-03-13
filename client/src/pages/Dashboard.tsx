/**
 * Mapit Dashboard - Protected page for authenticated users
 * Shows user projects with simplified action menu
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { useClientAccess } from "@/hooks/useClientAccess";
import { CreateProjectDialog } from "@/components/CreateProjectDialog";
import DashboardLayout from "@/components/DashboardLayout";
import { DeleteProjectDialog } from "@/components/DeleteProjectDialog";
import { EditProjectDialog } from "@/components/EditProjectDialog";
import { ProjectCard } from "@/components/ProjectCard";
import { SharedProjectCard } from "@/components/SharedProjectCard";
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
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Project } from "../../../drizzle/schema";
import { motion } from "framer-motion";
import {
  ChevronDown,
  Download,
  FolderOpen,
  FolderPlus,
  LogOut,
  Plus,
  Settings,
  Users,
  FileJson,
} from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { useLocation } from "wouter";
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

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { isClientOnly } = useClientAccess();
  const [, setLocation] = useLocation();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [exportFormat, setExportFormat] = useState<'csv' | 'pdf'>('csv');

  // Fetch projects
  const { data: projects, isLoading: projectsLoading } = trpc.project.list.useQuery();
  
  // Fetch shared projects
  const { data: sharedProjects } = trpc.sharing.getSharedWithMe.useQuery();

  // PHASE 2 FALLBACK GUARD: Redirect client-role users away from the admin dashboard
  // Placed after all hooks to comply with React's rules of hooks
  useEffect(() => {
    if (user?.role === 'client') {
      setLocation('/portal');
    }
  }, [user, setLocation]);

  if (user?.role === 'client') {
    return null;
  }



  // Removed 'Feature coming soon' handler. Implement actual guide trigger if available.

  const handleExportData = async () => {
    if (!projects || projects.length === 0) {
      toast.info('No projects to export');
      return;
    }
    setExportDialogOpen(true);
  };

  const handleConfirmExport = async () => {
    try {
      if (!projects || projects.length === 0) {
        toast.info('No projects to export');
        return;
      }
      // Fetch all projects with their data
      const projectsData = projects.map(p => ({
        id: p.id,
        name: p.name,
        location: p.location,
        status: p.status,
        createdAt: p.createdAt,
        flightDate: p.flightDate,
        clientName: p.clientName,
      }));

      // Create CSV content
      const headers = ['ID', 'Project Name', 'Location', 'Status', 'Created Date', 'Flight Date', 'Client'];
      const rows = projectsData.map(p => [
        p.id,
        p.name,
        p.location || '',
        p.status || '',
        new Date(p.createdAt).toLocaleDateString(),
        p.flightDate ? new Date(p.flightDate).toLocaleDateString() : '',
        p.clientName || '',
      ]);

            if (exportFormat === 'csv') {
        const csvContent = [
          headers.join(','),
          ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `mapit-projects-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);

        toast.success('Projects exported successfully!', {
          description: `Exported ${projectsData.length} projects to CSV.`,
        });
      } else if (exportFormat === 'pdf') {
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>Mapit Projects Export</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 20px; color: #333; }
              h1 { color: #10b981; border-bottom: 3px solid #10b981; padding-bottom: 10px; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; }
              th { background-color: #10b981; color: white; padding: 12px; text-align: left; font-weight: 600; }
              td { padding: 10px 12px; border-bottom: 1px solid #e5e7eb; }
              tr:nth-child(even) { background-color: #f9fafb; }
              .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #6b7280; }
            </style>
          </head>
          <body>
            <h1>Mapit Projects Export</h1>
            <p>Generated on ${new Date().toLocaleString()}</p>
            <table>
              <thead>
                <tr>
                  ${headers.map(h => `<th>${h}</th>`).join('')}
                </tr>
              </thead>
              <tbody>
                ${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join('')}</tr>`).join('')}
              </tbody>
            </table>
            <div class="footer">
              <p>Total Projects: ${projectsData.length}</p>
              <p>Exported from Mapit - Drone Mapping Project Manager</p>
            </div>
          </body>
          </html>
        `;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
          toast.error('Please allow popups to export PDF');
          return;
        }

        printWindow.document.write(htmlContent);
        printWindow.document.close();

        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            toast.success('Projects exported successfully!', {
              description: `Exported ${projectsData.length} projects to PDF.`,
            });
          }, 500);
        };
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export data');
    }
  };

  const handleEditProject = (project: Project) => {
    setSelectedProject(project);
    setEditDialogOpen(true);
  };

  const handleDeleteProject = (project: Project) => {
    setSelectedProject(project);
    setDeleteDialogOpen(true);
  };

  return (
    <DashboardLayout>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={staggerContainer}
        className="space-y-6"
      >
        {/* Welcome Section with Action Dropdown */}
        <motion.div variants={fadeInUp}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1
                className="text-3xl md:text-4xl font-bold mb-2"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Welcome back, {user?.name?.split(" ")[0] || "Pilot"}!
              </h1>
              <p className="text-muted-foreground">
                Manage your drone mapping projects and visualize your aerial data.
              </p>
            </div>

            {/* Consolidated Action Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Actions
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                {!isClientOnly && (
                  <>
                    <DropdownMenuItem onClick={() => setCreateDialogOpen(true)}>
                      <FolderPlus className="h-4 w-4 mr-2" />
                      New Project
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem onClick={handleExportData}>
                  <FileJson className="h-4 w-4 mr-2" />
                  Export Projects
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/settings" className="cursor-pointer flex items-center">
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => logout()} className="text-red-500 focus:text-red-500">
                  <LogOut className="h-4 w-4 mr-2" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.div>

        {/* Projects Section */}
        <motion.div variants={fadeInUp}>
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-xl font-semibold"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Your Projects
            </h2>
            <span className="text-sm text-muted-foreground">
              {projects?.length || 0} project{projects?.length !== 1 ? "s" : ""}
            </span>
          </div>

          {/* Projects Grid */}
          {projectsLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="overflow-hidden">
                  <Skeleton className="h-32 w-full" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                </Card>
              ))}
            </div>
          ) : projects && projects.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onEdit={handleEditProject}
                  onDelete={handleDeleteProject}
                />
              ))}
            </div>
          ) : (
            /* Empty State */
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <FolderOpen className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  Create your first drone mapping project to start organizing and visualizing your aerial footage.
                </p>
                {!isClientOnly && (
                  <Button
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => setCreateDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Project
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </motion.div>

        {/* Shared Projects Section */}
        {(sharedProjects && sharedProjects.length > 0) && (
          <motion.div variants={fadeInUp}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-cyan-500" />
                <h2
                  className="text-xl font-semibold"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  Shared With Me
                </h2>
              </div>
              <span className="text-sm text-muted-foreground">
                {sharedProjects.length} project{sharedProjects.length !== 1 ? "s" : ""}
              </span>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {sharedProjects.map((project) => (
                <SharedProjectCard key={project.id} project={project} />
              ))}
            </div>
          </motion.div>
        )}

        {/* Help Section */}
        <motion.div variants={fadeInUp}>
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="py-6">
              <div className="flex flex-col md:flex-row items-center gap-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">
                    Need help getting started?
                  </h3>
                  <p className="text-muted-foreground text-sm">
                    Check out our quick start guide to learn how to upload your first drone footage and create interactive maps.
                  </p>
                </div>
                {/* Replace with actual guide trigger or remove if not implemented */}
                {/* <Button
                  variant="outline"
                  className="border-primary/50 text-primary hover:bg-primary hover:text-primary-foreground whitespace-nowrap"
                  onClick={handleGuideOpen}
                >
                  View Guide
                </Button> */}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>

      {/* Dialogs */}
      <CreateProjectDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
      />
      <EditProjectDialog
        project={selectedProject}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
      />
      <DeleteProjectDialog
        project={selectedProject}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
      />
      
      {/* Export Format Selection Dialog */}
      <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Export Projects
            </DialogTitle>
            <DialogDescription>
              Choose the format for exporting your projects
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-3 py-4">
            <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-accent transition-colors" onClick={() => setExportFormat('csv')}>
              <input type="radio" name="format" value="csv" checked={exportFormat === 'csv'} onChange={() => setExportFormat('csv')} className="h-4 w-4" />
              <div className="flex-1">
                <div className="font-medium">CSV Format</div>
                <div className="text-sm text-muted-foreground">Spreadsheet compatible (Excel, Google Sheets)</div>
              </div>
            </label>
            
            <label className="flex items-center gap-3 p-3 rounded-lg border border-border cursor-pointer hover:bg-accent transition-colors" onClick={() => setExportFormat('pdf')}>
              <input type="radio" name="format" value="pdf" checked={exportFormat === 'pdf'} onChange={() => setExportFormat('pdf')} className="h-4 w-4" />
              <div className="flex-1">
                <div className="font-medium">PDF Format</div>
                <div className="text-sm text-muted-foreground">Professional document format</div>
              </div>
            </label>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setExportDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              handleConfirmExport();
              setExportDialogOpen(false);
            }} className="bg-emerald-600 hover:bg-emerald-700">
              <Download className="h-4 w-4 mr-2" />
              Export as {exportFormat.toUpperCase()}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
