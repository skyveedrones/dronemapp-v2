import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";
import {
  Calendar,
  FileImage,
  MoreVertical,
  Pencil,
  Plane,
  Trash2,
} from "lucide-react";
import { Link } from "wouter";
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
import { useState } from "react";

interface Flight {
  id: number;
  projectId: number;
  name: string;
  description: string | null;
  flightDate: Date | null;
  mediaCount: number;
  createdAt: Date;
}

interface FlightCardProps {
  flight: Flight;
  canEdit?: boolean;
  onEdit?: (flight: Flight) => void;
}

export function FlightCard({ flight, canEdit = true, onEdit }: FlightCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const utils = trpc.useUtils();

  const deleteFlight = trpc.flight.delete.useMutation({
    onSuccess: () => {
      toast.success("Flight deleted successfully");
      utils.flight.list.invalidate({ projectId: flight.projectId });
    },
    onError: (error) => {
      toast.error("Failed to delete flight", {
        description: error.message,
      });
    },
  });

  const handleDelete = () => {
    deleteFlight.mutate({ id: flight.id });
    setDeleteDialogOpen(false);
  };

  return (
    <>
      <Card className="group hover:border-primary/50 transition-colors">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <Link
              href={`/project/${flight.projectId}/flight/${flight.id}`}
              className="flex-1 min-w-0"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Plane className="h-5 w-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {flight.name}
                  </h3>
                  {flight.description && (
                    <p className="text-sm text-muted-foreground line-clamp-1">
                      {flight.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {flight.flightDate && (
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>{format(new Date(flight.flightDate), "MMM d, yyyy")}</span>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <FileImage className="h-4 w-4" />
                  <span>{flight.mediaCount} media</span>
                </div>
              </div>
            </Link>

            {canEdit && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onEdit?.(flight)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Flight
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => setDeleteDialogOpen(true)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Flight
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Flight</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{flight.name}"? This will also delete
              all {flight.mediaCount} media files in this flight. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
