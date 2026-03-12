/**
 * Shared Project Card Component
 * Displays a project that has been shared with the current user
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Project } from "../../../drizzle/schema";
import { Calendar, Image, MapPin, Users } from "lucide-react";
import { Link } from "wouter";

interface SharedProjectCardProps {
  project: Project & { sharedRole: "viewer" | "editor" | "vendor" };
}

export function SharedProjectCard({ project }: SharedProjectCardProps) {
  const statusColors = {
    active: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    completed: "bg-blue-500/10 text-blue-500 border-blue-500/20",
    archived: "bg-gray-500/10 text-gray-400 border-gray-500/20",
  };

  const formattedDate = project.flightDate
    ? new Date(project.flightDate).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Link href={`/project/${project.id}`}>
      <Card className="group cursor-pointer hover:border-primary/50 transition-all duration-200 overflow-hidden h-full">
        {/* Cover Image or Placeholder */}
        <div className="h-32 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 relative">
          {project.coverImage ? (
            <img
              src={project.coverImage}
              alt={project.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Users className="h-12 w-12 text-cyan-500/50" />
            </div>
          )}
          
          {/* Shared Badge */}
          <div className="absolute top-2 left-2">
            <Badge variant="secondary" className="bg-cyan-500/20 text-cyan-400 border-cyan-500/30">
              <Users className="h-3 w-3 mr-1" />
              {project.sharedRole === "editor" ? "Editor" : "Viewer"}
            </Badge>
          </div>

          {/* Status Badge */}
          <div className="absolute top-2 right-2">
            <span
              className={`px-2 py-0.5 text-xs font-medium rounded-full border ${statusColors[project.status]}`}
            >
              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </span>
          </div>
        </div>

        <CardHeader className="pb-2">
          <CardTitle className="text-lg group-hover:text-primary transition-colors line-clamp-1">
            {project.name}
          </CardTitle>
          {project.description && (
            <CardDescription className="line-clamp-2">
              {project.description}
            </CardDescription>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            {project.location && (
              <div className="flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" />
                <span className="truncate max-w-[120px]">{project.location}</span>
              </div>
            )}
            {formattedDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5" />
                <span>{formattedDate}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Image className="h-3.5 w-3.5" />
              <span>{project.mediaCount} items</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
