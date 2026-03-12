/**
 * Project Card Component
 * Displays a single project in the projects grid
 */

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Project } from "../../../drizzle/schema";
import {
  Calendar,
  FolderOpen,
  Image,
  MapPin,
  MoreVertical,
  Pencil,
  Trash2,
  User,
} from "lucide-react";
import { useLocation } from "wouter";
import { useClientAccess } from "@/hooks/useClientAccess";

interface ProjectCardProps {
  project: Project;
  onEdit?: (project: Project) => void;
  onDelete?: (project: Project) => void;
}

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

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  const [, setLocation] = useLocation();
  const { canEdit, canDelete } = useClientAccess(project.id);
  
  const formattedDate = project.flightDate
    ? new Date(project.flightDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const createdDate = new Date(project.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on the dropdown menu
    const target = e.target as HTMLElement;
    if (target.closest('[data-radix-collection-item]') || 
        target.closest('[role="menu"]') ||
        target.closest('button')) {
      return;
    }
    setLocation(`/project/${project.id}`);
  };

  return (
    <Card 
      className="glow-card group hover:border-primary/50 transition-all overflow-hidden cursor-pointer"
      onClick={handleCardClick}
    >
      {/* Cover Image or Placeholder */}
      <div className="relative h-32 bg-gradient-to-br from-primary/20 to-primary/5 overflow-hidden">
        {project.coverImage ? (
          <img
            src={project.coverImage}
            alt={project.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FolderOpen className="h-12 w-12 text-primary/30" />
          </div>
        )}
        
        {/* Status Badge */}
        <div className="absolute top-2 left-2">
          <span
            className={`px-2 py-0.5 text-xs font-medium rounded-full border ${statusColors[project.status]}`}
          >
            {statusLabels[project.status]}
          </span>
        </div>

        {/* Actions Menu - Only show for owners */}
        {(canEdit || canDelete) && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="secondary"
                size="icon"
                className="h-8 w-8 bg-background/80 backdrop-blur-sm"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-card border-border">
              <DropdownMenuItem onClick={(e) => {
                e.stopPropagation();
                onEdit?.(project);
              }}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit Project
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete?.(project);
                }}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Project
              </DropdownMenuItem>
            </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>

      <CardHeader className="pb-2">
        <CardTitle className="text-base line-clamp-1 group-hover:text-primary transition-colors">
          {project.name}
        </CardTitle>
        {project.description && (
          <CardDescription className="line-clamp-2 text-sm">
            {project.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <div className="space-y-1.5 text-xs text-muted-foreground">
          {project.location && (
            <div className="flex items-center gap-1.5">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{project.location}</span>
            </div>
          )}
          {project.clientName && (
            <div className="flex items-center gap-1.5">
              <User className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{project.clientName}</span>
            </div>
          )}
          {formattedDate && (
            <div className="flex items-center gap-1.5">
              <Calendar className="h-3 w-3 flex-shrink-0" />
              <span>Flight: {formattedDate}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <Image className="h-3 w-3 flex-shrink-0" />
            <span>{project.mediaCount} media items</span>
          </div>
        </div>

        <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
          Created {createdDate}
        </div>
      </CardContent>
    </Card>
  );
}
