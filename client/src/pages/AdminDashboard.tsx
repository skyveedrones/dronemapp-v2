import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import { BarChart3, Users, Building2, FolderOpen, ArrowLeft, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  if (user?.role !== "webmaster") {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Only webmasters can access the admin dashboard.
            </p>
            <Button onClick={() => setLocation("/account")} className="w-full">
              Back to Account
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { data: stats, isLoading: statsLoading, refetch: refetchStats, isRefetching: isRefetchingStats } = trpc.admin.getDashboardStats.useQuery();
  const { data: orgs, isLoading: orgsLoading, refetch: refetchOrgs, isRefetching: isRefetchingOrgs } = trpc.admin.getAllOrganizations.useQuery();
  const { data: clients, isLoading: clientsLoading, refetch: refetchClients, isRefetching: isRefetchingClients } = trpc.admin.getAllClients.useQuery();
  const { data: allUsers, isLoading: usersLoading, refetch: refetchUsers, isRefetching: isRefetchingUsers } = trpc.admin.getAllUsers.useQuery();
  const { data: projects, isLoading: projectsLoading, refetch: refetchProjects, isRefetching: isRefetchingProjects } = trpc.admin.getAllProjects.useQuery();

  const deleteOrganizationMutation = trpc.admin.deleteOrganization.useMutation({
    onSuccess: async () => {
      toast.success("Organization deleted");
      await handleRefresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete organization");
    },
  });

  const deleteClientMutation = trpc.admin.deleteClient.useMutation({
    onSuccess: async () => {
      toast.success("Client deleted");
      await handleRefresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete client");
    },
  });

  const deleteUserMutation = trpc.admin.deleteUser.useMutation({
    onSuccess: async () => {
      toast.success("User deleted");
      await handleRefresh();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete user");
    },
  });

  const isLoading = statsLoading || orgsLoading || clientsLoading || usersLoading || projectsLoading;
  const isRefreshing = isRefetchingStats || isRefetchingOrgs || isRefetchingClients || isRefetchingUsers || isRefetchingProjects;

  const handleRefresh = async () => {
    await Promise.all([
      refetchStats(),
      refetchOrgs(),
      refetchClients(),
      refetchUsers(),
      refetchProjects(),
    ]);
  };

  const handleDeleteOrganization = async (organizationId: number, organizationName: string) => {
    const confirmed = window.confirm(`Delete organization \"${organizationName}\"? This cannot be undone.`);
    if (!confirmed) return;
    await deleteOrganizationMutation.mutateAsync({ organizationId });
  };

  const handleDeleteClient = async (clientId: number, clientName: string) => {
    const confirmed = window.confirm(`Delete client \"${clientName}\"? This cannot be undone.`);
    if (!confirmed) return;
    await deleteClientMutation.mutateAsync({ clientId });
  };

  const handleDeleteUser = async (userId: number, userName: string | null) => {
    const confirmed = window.confirm(`Delete user \"${userName || "Unknown"}\"? This cannot be undone.`);
    if (!confirmed) return;
    await deleteUserMutation.mutateAsync({ userId });
  };

  return (
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="mb-8">
        <Button variant="ghost" onClick={() => setLocation("/account")} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Account
        </Button>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Sitewide overview of all organizations, users, and projects.
            </p>
          </div>
          <Button variant="outline" onClick={handleRefresh} disabled={isLoading || isRefreshing}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            {isRefreshing ? "Refreshing..." : "Refresh Data"}
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-emerald-500" />
                  Organizations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalOrganizations || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4 text-emerald-500" />
                  Users
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-emerald-500" />
                  Projects
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalProjects || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-500" />
                  Media Files
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalMedia || 0}</div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="organizations" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="organizations">Organizations</TabsTrigger>
              <TabsTrigger value="clients">Clients</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="projects">Projects</TabsTrigger>
            </TabsList>

            <TabsContent value="organizations" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>All Organizations</CardTitle>
                  <CardDescription>
                    {orgs?.length || 0} organizations registered in the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orgs && orgs.length > 0 ? (
                      orgs.map((org) => (
                        <div
                          key={org.id}
                          className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex-1">
                            <h3 className="font-semibold">{org.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {org.userCount} users • {org.projectCount} projects
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right text-sm text-muted-foreground">
                              Created {new Date(org.createdAt).toLocaleDateString()}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteOrganization(org.id, org.name)}
                              disabled={deleteOrganizationMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">No organizations found</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="clients" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>All Clients</CardTitle>
                  <CardDescription>
                    {clients?.length || 0} clients registered in the system
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {clients && clients.length > 0 ? (
                      clients.map((client) => (
                        <div
                          key={client.id}
                          className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => setLocation(`/clients/${client.id}`)}
                        >
                          <div className="flex-1">
                            <h3 className="font-semibold">{client.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {client.contactEmail || "No email"} • {client.projectCount} projects
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right text-sm text-muted-foreground">
                              Created {new Date(client.createdAt).toLocaleDateString()}
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleDeleteClient(client.id, client.name);
                              }}
                              disabled={deleteClientMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">No clients found</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>All Users</CardTitle>
                  <CardDescription>
                    {allUsers?.length || 0} users across all organizations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 font-semibold">Name</th>
                          <th className="text-left py-3 px-4 font-semibold">Email</th>
                          <th className="text-left py-3 px-4 font-semibold">Organization</th>
                          <th className="text-left py-3 px-4 font-semibold">Role</th>
                          <th className="text-left py-3 px-4 font-semibold">Joined</th>
                          <th className="text-left py-3 px-4 font-semibold">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allUsers && allUsers.length > 0 ? (
                          allUsers.map((entry) => (
                            <tr key={entry.id} className="border-b border-border hover:bg-accent/50">
                              <td className="py-3 px-4">{entry.name || "Unknown"}</td>
                              <td className="py-3 px-4 text-muted-foreground">{entry.email || "No email"}</td>
                              <td className="py-3 px-4">{entry.organizationName}</td>
                              <td className="py-3 px-4">
                                <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-emerald-500/20 text-emerald-600">
                                  {entry.role}
                                </span>
                              </td>
                              <td className="py-3 px-4 text-muted-foreground">
                                {new Date(entry.createdAt).toLocaleDateString()}
                              </td>
                              <td className="py-3 px-4">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleDeleteUser(entry.id, entry.name)}
                                  disabled={deleteUserMutation.isPending || entry.id === user?.id}
                                >
                                  <Trash2 className="w-4 h-4 mr-1" />
                                  Delete
                                </Button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-6 text-center text-muted-foreground">
                              No users found
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="projects" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>All Projects</CardTitle>
                  <CardDescription>
                    {projects?.length || 0} projects across all organizations
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {projects && projects.length > 0 ? (
                      projects.map((project) => (
                        <div
                          key={project.id}
                          className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => setLocation(`/project/${project.id}`)}
                        >
                          <div className="flex-1">
                            <h3 className="font-semibold">{project.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              {project.organizationName} • {project.mediaCount} media files
                            </p>
                          </div>
                          <div className="text-right text-sm text-muted-foreground">
                            Created {new Date(project.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-muted-foreground">No projects found</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
