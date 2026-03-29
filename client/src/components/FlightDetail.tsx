/*
 * Flight Detail Page
 * Shows detailed view of a single flight with its media
 */

import { useAuth } from "@/_core/hooks/useAuth";
import { BackToDashboard } from "@/components/BackToDashboard";
import { MapboxProjectMap } from "@/components/MapboxProjectMap";
import { LazyMapWrapper } from "@/components/LazyMapWrapper";
import { MediaGallery } from "@/components/MediaGallery";
import { MediaUploadDialog } from "@/components/MediaUploadDialog";
import { FlightReportDialog } from "@/components/FlightReportDialog";
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
  ArrowLeft,
  Calendar,
  ChevronDown,
  Download,
  FileText,
  FolderOpen,
  Image,
  Loader2,
  LogOut,
  Map,
  Pencil,
  Plane,
  Plus,
  Shield,
  Trash2,
  Upload,
  User,
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
  // ...rest of the code from Mapit Build Admin FlightDetail.tsx...
}
