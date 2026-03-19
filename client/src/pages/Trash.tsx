import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle,
  FolderOpen,
  Image,
  Loader2,
  Plane,
  Building2,
  RotateCcw,
  Trash2,
  Clock,
} from "lucide-react";
import { useState } from "react";
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

type EntityType = "all" | "project" | "media" | "flight" | "client";

function getDaysRemaining(deletedAt: string | Date | null): number {
  if (!deletedAt) return 30;
  const deleted = new Date(deletedAt);
  const expiry = new Date(deleted.getTime() + 30 * 24 * 60 * 60 * 1000);
  const now = new Date();
  return Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function formatDate(date: string | Date | null): string {
  if (!date) return "Unknown";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

const entityIcons: Record<string, React.ReactNode> = {
  project: <FolderOpen className="h-4 w-4" />,
  media: <Image className="h-4 w-4" />,
  flight: <Plane className="h-4 w-4" />,
  client: <Building2 className="h-4 w-4" />,
};

const entityColors: Record<string, string> = {
  project: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  media: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  flight: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  client: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
};

export default function Trash() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<EntityType>("all");

  const { data, isLoading, refetch } = trpc.trash.list.useQuery();
  const restoreMutation = trpc.trash.restore.useMutation({
    onSuccess: () => {
      toast.success("Item restored successfully");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });
  const permanentDeleteMutation = trpc.trash.permanentDelete.useMutation({
    onSuccess: () => {
      toast.success("Item permanently deleted");
      refetch();
    },
    onError: (err) => toast.error(err.message),
  });

  if (user && user.role !== "admin" && user.role !== "webmaster") {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Access restricted to admin and webmaster roles.</p>
      </div>
    );
  }

  // Flatten all items into a unified list
  const allItems: Array<{
    entityType: "project" | "media" | "flight" | "client";
    id: number;
    name: string | null;
    deletedAt: Date | string | null;
    deletedBy: number | null;
    createdAt: Date | string | null;
    extra?: string;
  }> = [];

  if (data) {
    data.projects.forEach((p) =>
      allItems.push({ entityType: "project", id: p.id, name: p.name, deletedAt: p.deletedAt, deletedBy: p.deletedBy, createdAt: p.createdAt })
    );
    data.media.forEach((m) =>
      allItems.push({ entityType: "media", id: m.id, name: m.name, deletedAt: m.deletedAt, deletedBy: m.deletedBy, createdAt: m.createdAt, extra: m.mediaType ?? undefined })
    );
    data.flights.forEach((f) =>
      allItems.push({ entityType: "flight", id: f.id, name: f.name, deletedAt: f.deletedAt, deletedBy: f.deletedBy, createdAt: f.createdAt })
    );
    data.clients.forEach((c) =>
      allItems.push({ entityType: "client", id: c.id, name: c.name, deletedAt: c.deletedAt, deletedBy: c.deletedBy, createdAt: c.createdAt })
    );
  }

  // Sort by deletedAt desc
  allItems.sort((a, b) => {
    const da = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
    const db = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
    return db - da;
  });

  const filteredItems = filter === "all" ? allItems : allItems.filter((i) => i.entityType === filter);

  const totalCount = allItems.length;
  const counts = {
    project: data?.projects.length ?? 0,
    media: data?.media.length ?? 0,
    flight: data?.flights.length ?? 0,
    client: data?.clients.length ?? 0,
  };

  return (
    <DashboardLayout>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-display">Trash</h1>
          <p className="text-muted-foreground mt-1">
            Deleted items are kept for 30 days before permanent removal
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filter} onValueChange={(v) => setFilter(v as EntityType)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All ({totalCount})</SelectItem>
              <SelectItem value="project">Projects ({counts.project})</SelectItem>
              <SelectItem value="media">Media ({counts.media})</SelectItem>
              <SelectItem value="flight">Flights ({counts.flight})</SelectItem>
              <SelectItem value="client">Clients ({counts.client})</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredItems.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Trash2 className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">Trash is empty</h3>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Deleted items will appear here for 30 days
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredItems.map((item) => {
            const daysLeft = getDaysRemaining(item.deletedAt);
            const isExpiring = daysLeft <= 7;

            return (
              <Card key={`${item.entityType}-${item.id}`} className="hover:border-border/80 transition-colors">
                <CardContent className="flex items-center justify-between py-4 px-5">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className={`flex items-center justify-center w-9 h-9 rounded-lg border ${entityColors[item.entityType]}`}>
                      {entityIcons[item.entityType]}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{item.name || `Unnamed ${item.entityType}`}</span>
                        <Badge variant="outline" className="text-xs capitalize shrink-0">
                          {item.entityType}
                        </Badge>
                        {item.extra && (
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {item.extra}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                        <span>Deleted {formatDate(item.deletedAt)}</span>
                        <span className={`flex items-center gap-1 ${isExpiring ? "text-destructive" : ""}`}>
                          <Clock className="h-3 w-3" />
                          {daysLeft} days remaining
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => restoreMutation.mutate({ entityType: item.entityType, entityId: item.id })}
                      disabled={restoreMutation.isPending}
                    >
                      <RotateCcw className="h-4 w-4 mr-1" />
                      Restore
                    </Button>

                    {user?.role === "webmaster" && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete Forever
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle className="flex items-center gap-2">
                              <AlertTriangle className="h-5 w-5 text-destructive" />
                              Permanently Delete
                            </AlertDialogTitle>
                            <AlertDialogDescription asChild>
                              <div className="space-y-2">
                                <span className="block">
                                  This will permanently delete <strong>{item.name || item.entityType}</strong>. This action cannot be undone.
                                </span>
                                {item.entityType === "project" && (
                                  <span className="block text-destructive text-sm">
                                    All associated media and flights will also be permanently deleted.
                                  </span>
                                )}
                              </div>
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              onClick={() => permanentDeleteMutation.mutate({ entityType: item.entityType, entityId: item.id })}
                            >
                              Delete Permanently
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
    </DashboardLayout>
  );
}
