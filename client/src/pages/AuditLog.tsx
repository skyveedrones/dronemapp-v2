import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Loader2,
  Trash2,
  RotateCcw,
  Plus,
  Edit,
  Eye,
  Shield,
  UserCircle,
} from "lucide-react";
import { useState } from "react";

const PAGE_SIZE = 50;

function formatDate(date: string | Date | null): string {
  if (!date) return "Unknown";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}

const actionIcons: Record<string, React.ReactNode> = {
  delete: <Trash2 className="h-4 w-4 text-red-400" />,
  restore: <RotateCcw className="h-4 w-4 text-green-400" />,
  permanent_delete: <Shield className="h-4 w-4 text-red-600" />,
  create: <Plus className="h-4 w-4 text-blue-400" />,
  update: <Edit className="h-4 w-4 text-amber-400" />,
  view: <Eye className="h-4 w-4 text-gray-400" />,
};

const actionColors: Record<string, string> = {
  delete: "bg-red-500/10 text-red-400 border-red-500/20",
  restore: "bg-green-500/10 text-green-400 border-green-500/20",
  permanent_delete: "bg-red-800/10 text-red-600 border-red-800/20",
  create: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  update: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  view: "bg-gray-500/10 text-gray-400 border-gray-500/20",
};

const entityTypeLabels: Record<string, string> = {
  project: "Project",
  media: "Media",
  flight: "Flight",
  client: "Client",
  user: "User",
};

export default function AuditLog() {
  const { user } = useAuth();
  const [entityTypeFilter, setEntityTypeFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [offset, setOffset] = useState(0);

  const queryInput = {
    entityType: entityTypeFilter !== "all" ? entityTypeFilter : undefined,
    action: actionFilter !== "all" ? actionFilter : undefined,
    limit: PAGE_SIZE,
    offset,
  };

  const { data: entries, isLoading } = trpc.auditLog.list.useQuery(queryInput);
  const { data: totalCount } = trpc.auditLog.count.useQuery({
    entityType: entityTypeFilter !== "all" ? entityTypeFilter : undefined,
    action: actionFilter !== "all" ? actionFilter : undefined,
  });

  if (user && user.role !== "admin" && user.role !== "webmaster") {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Access restricted to admin and webmaster roles.</p>
      </div>
    );
  }

  const total = totalCount ?? 0;
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <DashboardLayout>
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-display">Audit Log</h1>
          <p className="text-muted-foreground mt-1">
            Track all actions performed across the system
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={entityTypeFilter} onValueChange={(v) => { setEntityTypeFilter(v); setOffset(0); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Entity type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="project">Projects</SelectItem>
              <SelectItem value="media">Media</SelectItem>
              <SelectItem value="flight">Flights</SelectItem>
              <SelectItem value="client">Clients</SelectItem>
              <SelectItem value="user">Users</SelectItem>
            </SelectContent>
          </Select>
          <Select value={actionFilter} onValueChange={(v) => { setActionFilter(v); setOffset(0); }}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              <SelectItem value="delete">Delete</SelectItem>
              <SelectItem value="restore">Restore</SelectItem>
              <SelectItem value="permanent_delete">Permanent Delete</SelectItem>
              <SelectItem value="create">Create</SelectItem>
              <SelectItem value="update">Update</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !entries || entries.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <ClipboardList className="h-12 w-12 text-muted-foreground/40 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">No audit log entries</h3>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Actions will be logged here as they occur
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-2">
            {entries.map((entry) => {
              const actionColor = actionColors[entry.action] ?? actionColors.view;
              const actionIcon = actionIcons[entry.action] ?? actionIcons.view;

              return (
                <Card key={entry.id} className="hover:border-border/80 transition-colors">
                  <CardContent className="flex items-center gap-4 py-3 px-5">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-lg border ${actionColor}`}>
                      {actionIcon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-sm">
                          {entry.userName || `User #${entry.userId}`}
                        </span>
                        <Badge variant="outline" className="text-xs capitalize">
                          {entry.action.replace("_", " ")}
                        </Badge>
                        <Badge variant="secondary" className="text-xs capitalize">
                          {entityTypeLabels[entry.entityType] ?? entry.entityType}
                        </Badge>
                        {entry.entityName && (
                          <span className="text-sm text-muted-foreground truncate">
                            &mdash; {entry.entityName}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                        <span>{formatDate(entry.createdAt)}</span>
                        {entry.details && <span className="truncate">{entry.details}</span>}
                        {entry.ipAddress && <span>IP: {entry.ipAddress}</span>}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground/50 shrink-0">
                      #{entry.id}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4">
              <p className="text-sm text-muted-foreground">
                Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total} entries
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                  disabled={offset === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setOffset(offset + PAGE_SIZE)}
                  disabled={offset + PAGE_SIZE >= total}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
    </DashboardLayout>
  );
}
