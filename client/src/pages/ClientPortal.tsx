/**
 * Client Portal - Read-only dashboard for client users
 * Shows only projects assigned to the client they have access to
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { BackToDashboard } from "@/components/BackToDashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Building2, FolderOpen, Image, LogOut, MapPin, Settings } from "lucide-react";
import { Link, useLocation } from "wouter";

export default function ClientPortal() {
  const { user, logout, loading: authLoading } = useAuth();
  const [, setLocation] = useLocation();
  
  // Get client portal data for the current user
  const { data: portalData, isLoading } = trpc.clientPortal.getMyPortal.useQuery(undefined, {
    enabled: !!user,
  });

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container flex items-center justify-between h-16">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-8 w-24" />
          </div>
        </header>
        <main className="container py-8">
          <Skeleton className="h-10 w-64 mb-6" />
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (!portalData || portalData.clients.length === 0) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Client Access</CardTitle>
            <CardDescription>
              You don't have access to any client portals yet. Please contact your administrator
              to request access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // For now, show the first client's portal (can be extended to support multiple clients)
  const clientAccess = portalData.clients[0];
  const client = clientAccess.client;
  const projects = clientAccess.projects;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            {client.logoUrl ? (
              <img src={client.logoUrl} alt={client.name} className="h-8 w-8 rounded object-cover" />
            ) : (
              <Building2 className="h-8 w-8 text-primary" />
            )}
            <div>
              <h1 className="font-semibold text-lg">{client.name}</h1>
              <p className="text-xs text-muted-foreground">Client Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">{user?.name}</span>
            <Button variant="outline" size="sm" onClick={() => setLocation("/portal/manage-user")}>
              <Settings className="mr-2 h-4 w-4" />
              Manage User
            </Button>
            <Button variant="ghost" size="sm" onClick={() => logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container py-8">
        <BackToDashboard />
        <div className="mb-8">
          <h2 className="text-2xl font-bold mb-2">Your Projects</h2>
          <p className="text-muted-foreground">
            View all projects assigned to {client.name}. Click on a project to view details, media, and maps.
          </p>
        </div>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No Projects Yet</h3>
              <p className="text-muted-foreground text-center max-w-md">
                No projects have been assigned to your account yet. Please contact your project manager
                for more information.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <Link key={project.id} href={`/portal/project/${project.id}`}>
                <Card className="cursor-pointer hover:border-primary/50 transition-colors h-full">
                  {project.coverImage ? (
                    <div className="aspect-video relative overflow-hidden rounded-t-lg">
                      <img
                        src={project.coverImage}
                        alt={project.name}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-muted flex items-center justify-center rounded-t-lg">
                      <FolderOpen className="h-12 w-12 text-muted-foreground" />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg line-clamp-1">{project.name}</CardTitle>
                    {project.location && (
                      <CardDescription className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {project.location}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        project.status === "completed" 
                          ? "bg-primary/20 text-primary" 
                          : project.status === "active"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-muted text-muted-foreground"
                      }`}>
                        {project.status}
                      </span>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Image className="h-3 w-3" />
                        {project.mediaCount} media
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
