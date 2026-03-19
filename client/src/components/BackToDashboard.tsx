/**
 * BackToDashboard Component
 * Reusable navigation component for returning to the dashboard or project
 */

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

interface BackToDashboardProps {
  variant?: "default" | "ghost";
  size?: "default" | "sm";
  className?: string;
  projectId?: number; // Optional: if provided, links back to project instead of dashboard
}

export function BackToDashboard({ 
  variant = "ghost", 
  size = "sm", 
  className = "mb-4 -ml-2",
  projectId
}: BackToDashboardProps) {
  const href = projectId ? `/project/${projectId}` : "/dashboard";
  const label = projectId ? "Back to Project" : "Back to Dashboard";
  
  return (
    <Link href={href}>
      <Button variant={variant} size={size} className={className}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        {label}
      </Button>
    </Link>
  );
}
