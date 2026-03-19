# MAPIT Tooltip & User Guidance System - Complexity Analysis

**Date:** February 10, 2026  
**Status:** Analysis & Planning  
**Scope:** Comprehensive hover tooltips and contextual help system

---

## Executive Summary

Adding a comprehensive tooltip and user guidance system to MAPIT requires implementing:

1. **Reusable Tooltip Component** - Standardized UI for all tooltips
2. **Content Management System** - Centralized tooltip text storage
3. **Context-Aware Help** - Dynamic tooltips based on user role and subscription tier
4. **Interactive Walkthroughs** - Step-by-step guides for complex tasks
5. **Accessibility Features** - Keyboard navigation and screen reader support

**Estimated Effort:** 80-120 hours (2-3 weeks for full implementation)  
**Complexity Level:** Medium-High (requires careful UX design and content creation)

---

## Table of Contents

1. [Current State Analysis](#current-state-analysis)
2. [Tooltip Categories & Content](#tooltip-categories--content)
3. [System Architecture](#system-architecture)
4. [Implementation Roadmap](#implementation-roadmap)
5. [GPS Editing User Guide](#gps-editing-user-guide)
6. [Report Generation User Guide](#report-generation-user-guide)
7. [Effort Estimate & Timeline](#effort-estimate--timeline)

---

## Current State Analysis

### Existing Tooltip Infrastructure

**Current Implementation:**
- Shadcn/ui Tooltip component available but not widely used
- No centralized tooltip content management
- Limited contextual help throughout the application
- No interactive tutorials or walkthroughs

**Components with Tooltip Potential:**
- Dashboard (project cards, action buttons)
- Project Detail (edit, delete, share buttons)
- Media Gallery (upload, download, watermark, GPS edit)
- Map Features (marker meanings, flight path, clustering)
- Report Generator (format options, resolution settings)
- Export Data (format selection, file types)
- Warranty Management (date fields, reminder intervals)

### Existing Help Mechanisms

```typescript
// Current help patterns in codebase:
1. Toast notifications for errors/success
2. Dialog descriptions in modals
3. Placeholder text in form inputs
4. Icon-based visual indicators
5. No persistent help documentation
```

---

## Tooltip Categories & Content

### 1. Dashboard & Project Management

#### Project Card Actions

| Action | Tooltip Content | Complexity | Priority |
|--------|-----------------|------------|----------|
| **Create Project** | "Start a new drone mapping project. You'll be able to upload photos, set GPS locations, and generate reports." | Low | High |
| **Edit Project** | "Update project name, description, location, client info, and warranty dates." | Low | High |
| **Delete Project** | "Permanently remove this project and all associated media files. This action cannot be undone." | Low | High |
| **Select Project** | "Click to view project details, media gallery, flights, and generate reports." | Low | High |
| **View Projects** | "Browse all your drone mapping projects. Filter by status or search by name." | Low | Medium |

#### Project Information Fields

| Field | Tooltip Content | Complexity | Priority |
|-------|-----------------|------------|----------|
| **Project Name** | "Give your project a descriptive name (e.g., 'City Park Survey 2026')" | Low | High |
| **Description** | "Add details about the project scope, objectives, or special notes." | Low | High |
| **Location** | "Enter the project address or GPS coordinates. Used to center the map view." | Low | High |
| **Client Name** | "Name of the client or organization requesting the drone mapping." | Low | Medium |
| **Flight Date** | "Date when the drone flight was conducted and photos/videos were captured." | Low | High |
| **Status** | "Active: Currently in progress. Completed: Finished and archived. Archived: Hidden from main view." | Medium | High |

### 2. Project Actions

#### New Flight

**Tooltip:** "Create a new drone flight session within this project. Each flight can have its own set of photos, GPS data, and metadata."

**Step-by-Step Guide:**
```
1. Click "New Flight" button
2. Enter flight name (e.g., "Morning Survey - East Side")
3. Select flight date
4. Enter drone pilot name
5. Enter FAA license number
6. Enter LAANC authorization number
7. Click "Create Flight"
8. Upload photos/videos for this flight
```

**Complexity:** Low  
**Priority:** High

#### Warranty Management

**Tooltip:** "Set warranty period for this project and configure automated email reminders before warranty expires."

**Step-by-Step Guide:**
```
1. Click "Edit Project" or "Warranty" section
2. Set "Warranty Start Date" (when warranty begins)
3. Set "Warranty End Date" (when warranty expires)
4. Click "Add Reminder" to set up automated notifications
5. Select reminder intervals (3, 6, 9 months before end date)
6. Enter recipient email address
7. Choose email template or customize message
8. Click "Save Warranty"
```

**Complexity:** Medium  
**Priority:** High

#### Progress Update

**Tooltip:** "Add a progress note or status update to the project timeline. Useful for tracking project milestones and changes."

**Step-by-Step Guide:**
```
1. Click "Add Progress Update" button
2. Enter update title (e.g., "Phase 2 Complete")
3. Enter description of progress
4. Optionally attach photos or documents
5. Click "Post Update"
6. Update appears in project timeline
```

**Complexity:** Medium  
**Priority:** Medium

#### Generate Report

**Tooltip:** "Create a professional PDF report with project information, map, and selected photos. Perfect for client deliverables."

**Step-by-Step Guide:**
```
1. Click "Generate Report" button
2. Select photos to include (or "Select All")
3. Choose image resolution:
   - Low (faster, smaller file)
   - Medium (balanced)
   - High (best quality, larger file)
4. Configure map settings:
   - Map style (satellite, terrain, street)
   - Show flight path (yes/no)
   - Show markers (yes/no)
5. Add watermark (optional):
   - Choose from saved watermarks
   - Or upload new watermark image
6. Preview report
7. Click "Download PDF"
```

**Complexity:** High  
**Priority:** High

#### Export GPS Data

**Tooltip:** "Export GPS coordinates and flight path in multiple formats for use in GIS software or mapping applications."

**Step-by-Step Guide:**
```
1. Click "Export GPS Data" button
2. Choose export format:
   - KML: For Google Earth
   - CSV: For spreadsheets (Excel, Google Sheets)
   - GeoJSON: For GIS applications (ArcGIS, QGIS)
   - GPX: For GPS navigation devices
3. Click "Export"
4. File downloads to your computer
5. Open with appropriate software:
   - KML: Google Earth, ArcGIS
   - CSV: Excel, Google Sheets
   - GeoJSON: QGIS, ArcGIS
   - GPX: Garmin BaseCamp, other GPS software
```

**Complexity:** Medium  
**Priority:** High

#### Share Project

**Tooltip:** "Give other users access to this project. They can view, download, and comment on photos and data."

**Step-by-Step Guide:**
```
1. Click "Share Project" button
2. Enter email address of person to share with
3. Select their role:
   - Viewer: Can only view and download
   - Editor: Can also upload and edit
4. Click "Send Invite"
5. Recipient receives email with access link
6. They click link and accept invitation
7. Project appears in their dashboard
```

**Complexity:** Medium  
**Priority:** High

#### Change Logo

**Tooltip:** "Upload your company logo to display on project reports and media exports."

**Step-by-Step Guide:**
```
1. Click "Change Logo" or logo image
2. Click "Upload Logo"
3. Select image file (PNG, JPG, WebP recommended)
4. Image is automatically compressed and optimized
5. Logo preview updates immediately
6. Logo appears on all future reports and exports
7. To remove: Click "Remove Logo"
```

**Complexity:** Low  
**Priority:** Medium

### 3. Media Actions

#### Upload Media

**Tooltip:** "Add photos or videos to this project. Supported formats: JPEG, PNG, MP4, MOV. Files are automatically compressed."

**Step-by-Step Guide:**
```
1. Click "Upload Media" or drag-and-drop files
2. Select photos/videos from your computer
3. Multiple files can be uploaded at once
4. Files are automatically compressed:
   - Photos: Optimized to ~8MB
   - Videos: Shows warning if > 500MB (compress externally)
5. GPS data is extracted from photo EXIF data if available
6. Upload progress shows in toast notification
7. Photos appear in media gallery with thumbnails
```

**Complexity:** Low  
**Priority:** High

#### Download Media

**Tooltip:** "Download original or optimized versions of photos and videos to your computer."

**Step-by-Step Guide:**
```
1. Select media files (single or multiple)
2. Click "Download" button
3. Choose download format:
   - Original: Full resolution, uncompressed
   - Optimized: Compressed version (faster download)
   - Watermarked: With company logo watermark
4. Files download to your computer's Downloads folder
5. Multiple files download as ZIP archive
```

**Complexity:** Low  
**Priority:** High

#### Watermark Media

**Tooltip:** "Add your company logo as a watermark to photos and videos before sharing or exporting."

**Step-by-Step Guide:**
```
1. Select media files to watermark
2. Click "Watermark" button
3. Choose watermark source:
   - Use saved company logo
   - Upload custom watermark image
4. Configure watermark settings:
   - Position: Corner (TL, TR, BL, BR) or Center
   - Size: Small, Medium, Large
   - Opacity: 0-100% transparency
5. Preview watermarked image
6. Click "Apply Watermark"
7. Watermarked versions are created (originals unchanged)
8. Download watermarked files
```

**Complexity:** High  
**Priority:** High

#### Edit GPS Data

**Tooltip:** "Manually add or correct GPS coordinates for photos that don't have location data or have incorrect data."

**Step-by-Step Guide:**
```
1. Select media file without GPS data (or with incorrect data)
2. Click "Edit GPS" button
3. Map opens centered on project location
4. Existing GPS points from other photos shown as markers
5. Click on map to set GPS location, OR
   Enter coordinates manually:
   - Latitude: (e.g., 32.7479)
   - Longitude: (e.g., -96.4719)
   - Altitude: (optional, in meters)
6. Marker updates on map
7. Click "Save GPS Data"
8. Photo now appears on map with correct location
```

**Complexity:** Medium  
**Priority:** High

#### Delete Media

**Tooltip:** "Permanently remove this photo or video from the project. This action cannot be undone."

**Step-by-Step Guide:**
```
1. Select media file(s) to delete
2. Click "Delete" button
3. Confirmation dialog appears
4. Click "Confirm Delete"
5. Media is permanently removed from project
6. Storage space is freed up
```

**Complexity:** Low  
**Priority:** Medium

#### View Media Details

**Tooltip:** "See detailed information about this photo or video, including GPS location, camera info, and capture date."

**Step-by-Step Guide:**
```
1. Click on media thumbnail
2. Details panel opens showing:
   - Filename and file size
   - Capture date and time
   - GPS coordinates (latitude, longitude, altitude)
   - Camera make and model
   - User notes
3. Click "View on Map" to see location
4. Click "Edit" to modify GPS or notes
5. Click "Download" to save file
```

**Complexity:** Low  
**Priority:** Medium

### 4. Map Features

#### Map Markers

**Tooltip:** "Each numbered marker represents a photo or video location. Color indicates media type or priority."

**Marker Color Legend:**
```
🟢 Green Marker: Photo with high priority (important for report)
🟡 Yellow Marker: Photo with low priority
🔵 Blue Marker: Photo with no priority set
🔴 Red Marker: Video file
⚪ White Marker: GPS location without media
```

**Complexity:** Low  
**Priority:** High

#### Flight Path

**Tooltip:** "Green line shows the drone's flight path connecting all GPS points in chronological order."

**Step-by-Step Guide:**
```
1. Flight path automatically appears when 2+ photos have GPS data
2. Line connects photos in order they were taken
3. Shows drone's movement across the project area
4. Useful for understanding coverage and flight pattern
5. Click on path segment to see which photos are nearby
```

**Complexity:** Low  
**Priority:** High

#### Marker Clustering

**Tooltip:** "When zoomed out, nearby markers combine into clusters showing the count. Zoom in to see individual photos."

**Step-by-Step Guide:**
```
1. At full zoom out, markers cluster together
2. Cluster shows number (e.g., "47" photos in this area)
3. Click cluster to zoom in
4. Individual markers appear as you zoom closer
5. Useful for projects with 100+ photos
```

**Complexity:** Low  
**Priority:** Medium

#### Click Marker to View Image

**Tooltip:** "Click any marker to see the photo or video at that location. Shows thumbnail and details."

**Step-by-Step Guide:**
```
1. Click on any marker on the map
2. Info window opens showing:
   - Thumbnail of photo/video
   - File name
   - Capture date
   - GPS coordinates
3. Click thumbnail to view full-size image
4. Click "View Details" for more information
5. Click "Edit GPS" to adjust location
6. Click "Download" to save file
7. Click elsewhere on map to close info window
```

**Complexity:** Low  
**Priority:** High

#### Map Style Selection

**Tooltip:** "Choose how the map displays: Street (roads and labels), Satellite (aerial imagery), or Terrain (topography)."

**Step-by-Step Guide:**
```
1. Look for map style buttons (usually top-left)
2. Click "Map" for street view
3. Click "Satellite" for aerial view
4. Click "Terrain" for topographic view
5. Map updates immediately
6. Markers and flight path remain visible
```

**Complexity:** Low  
**Priority:** Medium

### 5. Report Generation

#### Report Format Options

**Tooltip:** "Choose how your report displays photos and data. Different formats work best for different purposes."

**Format Guide:**
```
📄 Standard Report (Default)
- Professional layout with project info, map, and photos
- Best for: Client deliverables, documentation
- Page count: ~5-20 pages depending on photo count

🗺️ Map-Focused Report
- Large map with flight path and markers
- Minimal photo thumbnails
- Best for: Showing coverage and flight pattern
- Page count: ~2-5 pages

📸 Photo Gallery Report
- Large photo thumbnails with minimal text
- Good for visual review
- Best for: Quality review, before/after comparison
- Page count: ~10-30 pages depending on photo count
```

**Complexity:** Medium  
**Priority:** High

#### Image Resolution Settings

**Tooltip:** "Higher resolution = better quality but larger file size and longer generation time."

**Resolution Guide:**
```
🚀 Low Resolution (Fast)
- File size: 2-5 MB
- Quality: Good for screen viewing
- Best for: Quick reviews, email sharing
- Generation time: 30-60 seconds

⚖️ Medium Resolution (Balanced)
- File size: 5-15 MB
- Quality: Good for printing
- Best for: Most use cases
- Generation time: 1-3 minutes

🎨 High Resolution (Best Quality)
- File size: 15-50 MB
- Quality: Excellent for large prints
- Best for: Professional presentations, archival
- Generation time: 3-10 minutes
```

**Complexity:** Low  
**Priority:** High

#### Watermark Configuration

**Tooltip:** "Add your company logo to all photos in the report. Watermark settings control position and transparency."

**Step-by-Step Guide:**
```
1. In report generator, scroll to "Watermark" section
2. Toggle "Add Watermark" ON
3. Choose watermark source:
   - Use Company Logo (if uploaded)
   - Upload Custom Watermark
4. Configure position:
   - Top-Left, Top-Right, Bottom-Left, Bottom-Right, Center
5. Set opacity (transparency):
   - 0%: Invisible
   - 50%: Semi-transparent (recommended)
   - 100%: Fully opaque
6. Set size:
   - Small: 10% of photo width
   - Medium: 20% of photo width (recommended)
   - Large: 30% of photo width
7. Preview shows watermark placement
8. Click "Apply" to include in report
```

**Complexity:** Medium  
**Priority:** High

#### Map Settings in Report

**Tooltip:** "Control how the map appears in your report: style, markers, flight path, and zoom level."

**Step-by-Step Guide:**
```
1. In report generator, find "Map Settings"
2. Choose map style:
   - Street: Roads and labels
   - Satellite: Aerial view
   - Terrain: Topographic view
3. Toggle options:
   - Show Markers: Display photo locations
   - Show Flight Path: Show drone's path
   - Show Cluster Info: Show marker numbers
4. Set zoom level:
   - Auto: Fits all markers
   - Manual: Choose specific zoom (1-20)
5. Preview updates to show map as it will appear
6. Click "Apply Settings"
```

**Complexity:** Medium  
**Priority:** High

#### Preview Report

**Tooltip:** "See how your report will look before downloading. You can make changes and preview again."

**Step-by-Step Guide:**
```
1. After configuring all report settings
2. Click "Preview Report" button
3. Report preview opens in new window/tab
4. Scroll through to review:
   - Project information section
   - Map and markers
   - Photo layout and quality
   - Watermark placement
   - Overall formatting
5. If changes needed:
   - Close preview
   - Adjust settings
   - Click "Preview" again
6. When satisfied, click "Download PDF"
```

**Complexity:** Low  
**Priority:** High

#### Download PDF Report

**Tooltip:** "Save the report as a PDF file to your computer. File is ready to share, print, or archive."

**Step-by-Step Guide:**
```
1. After previewing report (or skip preview)
2. Click "Download PDF" button
3. Report generation starts (shows progress)
4. Once complete, PDF downloads to Downloads folder
5. File name format: ProjectName_YYYY-MM-DD.pdf
6. Open with:
   - Adobe Reader (free)
   - Web browser (Chrome, Firefox, Safari)
   - Any PDF viewer
7. Share via email or cloud storage
8. Print if needed (use high-quality printer for best results)
```

**Complexity:** Low  
**Priority:** High

### 6. Export Data Features

#### Export Format Selection

**Tooltip:** "Choose the file format that works with your software. Each format is designed for different applications."

**Format Comparison:**

| Format | Best For | Software | Complexity |
|--------|----------|----------|-----------|
| **KML** | Google Earth, mapping visualization | Google Earth, ArcGIS, QGIS | Low |
| **CSV** | Spreadsheets, data analysis | Excel, Google Sheets, Python | Low |
| **GeoJSON** | GIS analysis, web mapping | QGIS, ArcGIS, Mapbox | Medium |
| **GPX** | GPS devices, navigation | Garmin, hiking apps | Low |

**Complexity:** Low  
**Priority:** High

#### KML Export

**Tooltip:** "Export as KML (Keyhole Markup Language) for viewing in Google Earth with 3D visualization."

**Step-by-Step Guide:**
```
1. Click "Export GPS Data"
2. Select "KML" format
3. Click "Export"
4. File downloads: ProjectName.kml
5. Open with Google Earth:
   - Download Google Earth (free)
   - Open the KML file
   - Markers and flight path appear in 3D
   - Can rotate, zoom, and explore
6. Features in Google Earth:
   - 3D terrain visualization
   - Satellite imagery
   - Flight path as line
   - Photo locations as markers
   - Click markers to see details
```

**Complexity:** Low  
**Priority:** High

#### CSV Export

**Tooltip:** "Export as CSV (Comma-Separated Values) for spreadsheet analysis and data processing."

**Step-by-Step Guide:**
```
1. Click "Export GPS Data"
2. Select "CSV" format
3. Click "Export"
4. File downloads: ProjectName.csv
5. Open with spreadsheet software:
   - Microsoft Excel
   - Google Sheets
   - LibreOffice Calc
6. CSV contains columns:
   - Photo filename
   - Latitude
   - Longitude
   - Altitude
   - Capture date/time
   - Camera info
7. Use for:
   - Data analysis
   - Creating charts
   - Filtering and sorting
   - Integration with other tools
```

**Complexity:** Low  
**Priority:** High

#### GeoJSON Export

**Tooltip:** "Export as GeoJSON for advanced GIS analysis and web mapping applications."

**Step-by-Step Guide:**
```
1. Click "Export GPS Data"
2. Select "GeoJSON" format
3. Click "Export"
4. File downloads: ProjectName.geojson
5. Open with GIS software:
   - QGIS (free, open-source)
   - ArcGIS (professional)
   - Mapbox (web-based)
6. GeoJSON features:
   - Standard format for web mapping
   - Includes all photo metadata
   - Flight path as LineString
   - Photo locations as Points
7. Use for:
   - Professional GIS analysis
   - Creating custom maps
   - Integration with web applications
   - Advanced spatial analysis
```

**Complexity:** Medium  
**Priority:** High

#### GPX Export

**Tooltip:** "Export as GPX (GPS Exchange Format) for use with GPS navigation devices and hiking apps."

**Step-by-Step Guide:**
```
1. Click "Export GPS Data"
2. Select "GPX" format
3. Click "Export"
4. File downloads: ProjectName.gpx
5. Use with GPS devices:
   - Garmin BaseCamp (free)
   - Garmin eTrex devices
   - Other GPS receivers
6. Use with mobile apps:
   - Hiking apps (AllTrails, Gaia GPS)
   - Navigation apps
   - Fitness trackers
7. GPX contains:
   - Waypoints (photo locations)
   - Track (flight path)
   - Elevation data
8. Useful for:
   - Field navigation
   - Outdoor recreation
   - Comparing with ground surveys
```

**Complexity:** Low  
**Priority:** High

---

## System Architecture

### Tooltip Component Design

```typescript
// Proposed reusable Tooltip component
interface TooltipProps {
  content: string;
  title?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delay?: number;
  maxWidth?: number;
  children: React.ReactNode;
  icon?: React.ReactNode;
  keyboard?: boolean; // Show keyboard shortcut
  video?: string; // Optional video tutorial URL
}

export function HelpTooltip({
  content,
  title,
  position = 'top',
  delay = 200,
  maxWidth = 300,
  children,
  icon,
  keyboard,
  video,
}: TooltipProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="inline-flex items-center gap-1 cursor-help">
          {children}
          {icon && <HelpCircle className="w-4 h-4 text-gray-400" />}
        </div>
      </TooltipTrigger>
      <TooltipContent 
        side={position} 
        delayDuration={delay}
        className={`max-w-[${maxWidth}px]`}
      >
        {title && <div className="font-semibold mb-1">{title}</div>}
        <div>{content}</div>
        {keyboard && <div className="text-xs mt-1 opacity-70">{keyboard}</div>}
        {video && <a href={video} className="text-xs text-blue-400">Watch tutorial →</a>}
      </TooltipContent>
    </Tooltip>
  );
}
```

### Tooltip Content Management

```typescript
// Centralized tooltip content storage
export const TOOLTIPS = {
  dashboard: {
    createProject: {
      title: "Create New Project",
      content: "Start a new drone mapping project. You'll be able to upload photos, set GPS locations, and generate reports.",
      video: "/tutorials/create-project.mp4",
    },
    editProject: {
      title: "Edit Project",
      content: "Update project name, description, location, client info, and warranty dates.",
    },
    // ... more tooltips
  },
  media: {
    uploadMedia: {
      title: "Upload Media",
      content: "Add photos or videos to this project. Supported formats: JPEG, PNG, MP4, MOV. Files are automatically compressed.",
      keyboard: "Ctrl+U",
    },
    editGPS: {
      title: "Edit GPS Data",
      content: "Manually add or correct GPS coordinates for photos that don't have location data.",
      video: "/tutorials/edit-gps.mp4",
    },
    // ... more tooltips
  },
  // ... more categories
};
```

### Interactive Tutorial System

```typescript
// Proposed tutorial/walkthrough component
interface TutorialStep {
  target: string; // CSS selector of element to highlight
  title: string;
  content: string;
  action?: 'click' | 'type' | 'wait';
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface Tutorial {
  id: string;
  name: string;
  steps: TutorialStep[];
  estimatedTime: number; // minutes
}

export const TUTORIALS: Record<string, Tutorial> = {
  gpsEditing: {
    id: 'gps-editing',
    name: 'How to Edit GPS Data',
    estimatedTime: 5,
    steps: [
      {
        target: '[data-tutorial="select-media"]',
        title: 'Step 1: Select Media',
        content: 'Click on a photo that needs GPS data correction.',
        action: 'click',
      },
      {
        target: '[data-tutorial="edit-gps-button"]',
        title: 'Step 2: Open GPS Editor',
        content: 'Click the "Edit GPS" button to open the map editor.',
        action: 'click',
      },
      {
        target: '[data-tutorial="map-container"]',
        title: 'Step 3: Click on Map',
        content: 'Click on the map to set the GPS location for this photo.',
        action: 'click',
      },
      {
        target: '[data-tutorial="save-gps"]',
        title: 'Step 4: Save',
        content: 'Click "Save GPS Data" to confirm the new location.',
        action: 'click',
      },
    ],
  },
  // ... more tutorials
};
```

---

## Implementation Roadmap

### Phase 1: Foundation (Week 1)

**Tasks:**
- [ ] Create reusable Tooltip component with shadcn/ui
- [ ] Set up centralized tooltip content file (TOOLTIPS.ts)
- [ ] Add tooltip to 10 high-priority UI elements
- [ ] Create tooltip styling and animations
- [ ] Add keyboard shortcut support

**Deliverables:**
- Tooltip component library
- Initial tooltip content (100+ tooltips)
- Visual design system for tooltips

**Effort:** 20 hours

### Phase 2: Core Features (Week 2)

**Tasks:**
- [ ] Add tooltips to Dashboard (project cards, buttons)
- [ ] Add tooltips to Project Detail (all action buttons)
- [ ] Add tooltips to Media Gallery (upload, download, watermark, GPS)
- [ ] Add tooltips to Map Features (markers, flight path, clustering)
- [ ] Add tooltips to Report Generator (all settings)
- [ ] Add tooltips to Export Data (format selection)

**Deliverables:**
- 200+ tooltips across main features
- Comprehensive help coverage

**Effort:** 40 hours

### Phase 3: Advanced Features (Week 3)

**Tasks:**
- [ ] Create interactive tutorials/walkthroughs
- [ ] Implement tutorial progress tracking
- [ ] Add video tutorial links
- [ ] Create help documentation pages
- [ ] Add contextual help based on user role
- [ ] Add accessibility features (keyboard navigation)

**Deliverables:**
- 5-10 interactive tutorials
- Help documentation site
- Accessibility compliance

**Effort:** 40 hours

### Phase 4: Polish & Testing (Week 4)

**Tasks:**
- [ ] User testing and feedback
- [ ] Refine tooltip content based on feedback
- [ ] Performance optimization
- [ ] Cross-browser testing
- [ ] Mobile responsiveness
- [ ] Analytics tracking

**Deliverables:**
- Refined tooltip system
- Performance metrics
- User feedback report

**Effort:** 20 hours

---

## GPS Editing User Guide

### Overview

GPS editing allows you to manually add or correct GPS coordinates for photos that:
- Don't have GPS data (no EXIF location)
- Have incorrect GPS data
- Need precise location adjustment

### Step-by-Step Process

#### Step 1: Select Media File

```
1. Navigate to Project Detail page
2. Scroll to "Media Gallery" section
3. Find the photo that needs GPS editing
4. Click on the photo thumbnail to select it
5. A details panel opens on the right side
```

#### Step 2: Open GPS Editor

```
1. In the media details panel, look for "Edit GPS" button
2. Click the "Edit GPS" button
3. GPS Edit Dialog opens with a map
4. Map is centered on:
   - Existing GPS point (if photo has coordinates)
   - Average of all project GPS points
   - Default location (Forney, TX) if no GPS data exists
```

#### Step 3: View Existing GPS Points

```
1. All other photos in the project with GPS data appear as markers
2. Markers are numbered (1, 2, 3, etc.)
3. Existing GPS point for current photo (if any) shows as a highlighted marker
4. This helps you understand the project's geographic context
```

#### Step 4: Set GPS Location - Option A: Click on Map

```
1. Click anywhere on the map to set the GPS location
2. A marker appears at that location
3. Latitude and Longitude fields update automatically
4. Altitude field remains editable (optional)
5. You can click multiple times to adjust location
```

#### Step 5: Set GPS Location - Option B: Manual Entry

```
1. If you know exact coordinates, enter them manually:
   - Latitude: -90 to +90 (e.g., 32.7479)
   - Longitude: -180 to +180 (e.g., -96.4719)
   - Altitude: Elevation in meters (optional)
2. Press Enter or Tab after each field
3. Map updates to show the new location
4. Marker moves to the entered coordinates
```

#### Step 6: Verify Location

```
1. Double-check that marker is in correct location
2. Compare with nearby markers from other photos
3. Verify coordinates make sense for project area
4. If incorrect, click map again or edit coordinates
```

#### Step 7: Save GPS Data

```
1. Click "Save GPS Data" button
2. Dialog closes
3. Photo is now associated with GPS location
4. Photo appears on project map with numbered marker
5. GPS data is saved to database
```

### Common GPS Editing Scenarios

#### Scenario 1: Photo Has No GPS Data

**Problem:** Photo was taken with GPS disabled or camera doesn't have GPS.

**Solution:**
```
1. Open GPS Edit dialog
2. Map shows default location or project center
3. Click on map where photo was taken
4. Or manually enter coordinates if you know them
5. Save GPS data
```

#### Scenario 2: Photo Has Incorrect GPS Data

**Problem:** Photo has GPS data but it's in wrong location (e.g., taken with old cached coordinates).

**Solution:**
```
1. Open GPS Edit dialog
2. Current GPS location shows as marker
3. Click on correct location on map
4. Or manually enter correct coordinates
5. Marker moves to new location
6. Save GPS data (overwrites old coordinates)
```

#### Scenario 3: Batch GPS Editing

**Problem:** Multiple photos need GPS data added.

**Solution:**
```
1. Open first photo's GPS editor
2. Set GPS location
3. Save and close
4. Open next photo's GPS editor
5. Map remembers previous location as starting point
6. Click nearby to adjust for next photo
7. Repeat for all photos
```

### Tips & Best Practices

**Tip 1: Use Project Context**
- Look at existing GPS markers to understand project area
- New GPS points should cluster with existing points
- If point is far away, double-check coordinates

**Tip 2: Altitude Data**
- Altitude is optional but useful for elevation tracking
- Typically ranges from 0-500 meters for drone flights
- Leave blank if unsure

**Tip 3: Accuracy**
- GPS coordinates are accurate to ~5-10 meters
- Don't worry about extreme precision
- Focus on general location accuracy

**Tip 4: Batch Processing**
- Edit multiple photos in sequence
- Map remembers zoom level and center
- Speeds up process for large projects

### Troubleshooting GPS Editing

| Issue | Cause | Solution |
|-------|-------|----------|
| Map won't load | Network issue | Refresh page, check internet |
| Can't click on map | Map not initialized | Wait 2-3 seconds, try again |
| Coordinates won't save | Invalid format | Check latitude (-90 to +90), longitude (-180 to +180) |
| Marker in wrong place | Clicked wrong location | Click again to adjust, or use manual entry |
| GPS data reverted | Browser crashed | Retry GPS editing, save again |

---

## Report Generation User Guide

### Overview

Report generation creates professional PDF documents containing:
- Project information and metadata
- Interactive map with GPS markers and flight path
- Selected photos with metadata
- Optional watermark with company logo
- Customizable layout and styling

### Report Generation Workflow

#### Step 1: Open Report Generator

```
1. Navigate to Project Detail page
2. Click "Project Actions" dropdown button
3. Select "Generate Report"
4. Report Generator Dialog opens
```

#### Step 2: Select Photos

**Option A: Select All Photos**
```
1. Click "Select All" button
2. All photos in project are selected
3. Count shows: "X photos selected"
```

**Option B: Select Specific Photos**
```
1. Scroll through photo gallery
2. Click checkbox next to each photo to include
3. Photos are highlighted when selected
4. Count updates: "X photos selected"
```

**Option C: Select by Flight**
```
1. If project has multiple flights
2. Click flight name to expand
3. Click "Select All in Flight" to select all photos from that flight
4. Or select individual photos from flight
```

#### Step 3: Configure Image Resolution

**Choose resolution based on use case:**

```
🚀 Low Resolution (Fast)
- File size: 2-5 MB
- Quality: Good for screen viewing
- Generation time: 30-60 seconds
- Best for: Quick reviews, email sharing

⚖️ Medium Resolution (Balanced) ← Recommended
- File size: 5-15 MB
- Quality: Good for printing
- Generation time: 1-3 minutes
- Best for: Most use cases

🎨 High Resolution (Best Quality)
- File size: 15-50 MB
- Quality: Excellent for large prints
- Generation time: 3-10 minutes
- Best for: Professional presentations, archival
```

#### Step 4: Configure Map Settings

**Map Style:**
```
1. Click "Map Style" dropdown
2. Choose:
   - Street: Roads, labels, standard map
   - Satellite: Aerial imagery
   - Terrain: Topographic with elevation
3. Preview updates to show selected style
```

**Map Options:**
```
1. Toggle "Show Markers":
   - ON: Photo locations appear as numbered markers
   - OFF: Only flight path visible
   
2. Toggle "Show Flight Path":
   - ON: Green line connects photos chronologically
   - OFF: Only markers visible
   
3. Toggle "Show Cluster Info":
   - ON: Shows marker count in clusters
   - OFF: Individual markers only
```

**Map Zoom:**
```
1. Choose "Auto" (recommended):
   - Map automatically zooms to fit all markers
   - Optimal view of entire project
   
2. Or choose "Manual":
   - Select zoom level (1-20)
   - 1 = World view
   - 10 = City/region
   - 20 = Street level
```

#### Step 5: Add Watermark (Optional)

**Enable Watermark:**
```
1. Toggle "Add Watermark" ON
2. Watermark options appear
```

**Choose Watermark Source:**
```
1. Option A: Use Company Logo
   - If you've uploaded company logo to profile
   - Logo appears on all photos
   
2. Option B: Upload Custom Watermark
   - Click "Upload Watermark"
   - Select image file (PNG recommended for transparency)
   - Image is optimized automatically
```

**Configure Watermark Position:**
```
1. Click position button:
   - TL (Top-Left)
   - TR (Top-Right)
   - BL (Bottom-Left)
   - BR (Bottom-Right)
   - C (Center)
2. Preview updates to show position
```

**Configure Watermark Size:**
```
1. Drag size slider:
   - Small: 10% of photo width
   - Medium: 20% of photo width (recommended)
   - Large: 30% of photo width
2. Preview updates to show size
```

**Configure Watermark Opacity:**
```
1. Drag opacity slider:
   - 0%: Invisible (not recommended)
   - 25%: Very transparent
   - 50%: Semi-transparent (recommended)
   - 75%: Mostly opaque
   - 100%: Fully opaque (may obscure photo)
2. Preview updates to show transparency
```

#### Step 6: Preview Report

**Generate Preview:**
```
1. After configuring all settings
2. Click "Preview Report" button
3. Report generation starts (progress bar shows)
4. Preview opens in new window/tab
```

**Review Preview:**
```
1. Scroll through entire report
2. Check:
   - Project information section
   - Map appearance and zoom level
   - Photo quality and layout
   - Watermark placement and opacity
   - Overall formatting and styling
3. If changes needed:
   - Close preview window
   - Adjust settings
   - Click "Preview" again
```

**Make Adjustments:**
```
1. If photos are too small:
   - Increase image resolution
   - Decrease number of photos per page
   
2. If photos are too large:
   - Decrease image resolution
   - Increase number of photos per page
   
3. If watermark is too prominent:
   - Decrease opacity
   - Decrease size
   
4. If map is not showing properly:
   - Change map style
   - Adjust zoom level
   - Toggle markers/flight path
```

#### Step 7: Download PDF Report

**Generate Final Report:**
```
1. When satisfied with preview
2. Click "Download PDF" button
3. Report generation starts
4. Progress bar shows generation status
5. Once complete, PDF downloads to Downloads folder
```

**File Details:**
```
- File name: ProjectName_YYYY-MM-DD.pdf
- File size: Depends on resolution (2-50 MB)
- Format: Standard PDF (compatible with all readers)
```

**Open & Share Report:**
```
1. Open with:
   - Adobe Reader (free)
   - Web browser (Chrome, Firefox, Safari)
   - Any PDF viewer
   
2. Share via:
   - Email (attach PDF)
   - Cloud storage (Google Drive, Dropbox)
   - File sharing (WeTransfer, Slack)
   
3. Print:
   - Use high-quality printer for best results
   - Recommend 300 DPI for professional printing
```

### Report Generation Scenarios

#### Scenario 1: Quick Client Preview

**Goal:** Send quick preview to client for approval

**Settings:**
```
- Photos: Select key photos (10-20)
- Resolution: Low (fast generation)
- Map: Street style, show markers
- Watermark: No
- Time: ~1 minute
- File size: ~3 MB
```

#### Scenario 2: Professional Deliverable

**Goal:** Create polished final report for client

**Settings:**
```
- Photos: All photos or by flight
- Resolution: High (best quality)
- Map: Satellite style, show flight path
- Watermark: Yes, with company logo
- Time: ~5-10 minutes
- File size: ~20-40 MB
```

#### Scenario 3: Internal Archive

**Goal:** Archive project for future reference

**Settings:**
```
- Photos: All photos
- Resolution: Medium (balanced)
- Map: Terrain style, show markers and path
- Watermark: Yes
- Time: ~2-3 minutes
- File size: ~10-15 MB
```

#### Scenario 4: Print for Presentation

**Goal:** Print report for in-person presentation

**Settings:**
```
- Photos: Select best photos (20-30)
- Resolution: High (for printing)
- Map: Satellite style (visually impressive)
- Watermark: Yes, prominent placement
- Time: ~5-10 minutes
- File size: ~30-50 MB
- Print: Use color printer, 300 DPI
```

### Troubleshooting Report Generation

| Issue | Cause | Solution |
|-------|-------|----------|
| Report generation hangs | Too many high-res photos | Reduce photo count or resolution |
| PDF is blank/corrupted | Browser issue | Try different browser, clear cache |
| Photos appear blurry | Resolution too low | Increase resolution setting |
| Watermark not visible | Opacity too low | Increase opacity slider |
| Map not showing | GPS data missing | Add GPS data to photos first |
| File too large | High resolution + many photos | Reduce resolution or photo count |
| Generation takes too long | Server busy | Try again later, or reduce complexity |

### Report Generation Tips

**Tip 1: Preview Before Download**
- Always preview before final download
- Saves time if adjustments needed
- Catches formatting issues early

**Tip 2: Optimal Photo Count**
- 10-30 photos: Best for reports
- 50+ photos: Consider multiple reports
- 100+ photos: Split into flights or sections

**Tip 3: Map Settings**
- Satellite + flight path: Most visually interesting
- Street + markers: Most professional
- Terrain: Best for topographic analysis

**Tip 4: Watermark Best Practices**
- 50% opacity: Visible but not distracting
- Bottom-right: Standard placement
- 20% size: Professional appearance

**Tip 5: Resolution Selection**
- Low: Quick reviews, email (< 5 MB)
- Medium: Most common use (5-15 MB)
- High: Professional printing (15-50 MB)

---

## Effort Estimate & Timeline

### Implementation Effort Breakdown

| Phase | Task | Hours | Days |
|-------|------|-------|------|
| **Phase 1** | Tooltip component setup | 20 | 2.5 |
| **Phase 2** | Add 200+ tooltips | 40 | 5 |
| **Phase 3** | Interactive tutorials | 40 | 5 |
| **Phase 4** | Testing & refinement | 20 | 2.5 |
| **Total** | | **120** | **15** |

### Timeline Options

**Option 1: Full Implementation (3 weeks)**
```
Week 1: Foundation (Phase 1)
Week 2: Core Features (Phase 2)
Week 3: Advanced Features (Phase 3 + 4)
```

**Option 2: MVP Implementation (2 weeks)**
```
Week 1: Foundation + Core Features (Phase 1 + 2)
Week 2: Advanced Features (Phase 3 + 4)
```

**Option 3: Phased Rollout (4 weeks)**
```
Week 1: Foundation (Phase 1)
Week 2: Core Features (Phase 2)
Week 3: Advanced Features (Phase 3)
Week 4: Testing & Refinement (Phase 4)
```

### Resource Requirements

**Development:**
- 1 Frontend Developer: 120 hours
- 1 UX/Content Writer: 40 hours (tooltip content)
- 1 QA/Tester: 20 hours

**Total:** 180 hours (4.5 weeks with 1 developer)

### Complexity Assessment

| Component | Complexity | Effort | Priority |
|-----------|-----------|--------|----------|
| Tooltip component | Low | 10 hrs | High |
| Dashboard tooltips | Low | 15 hrs | High |
| Media tooltips | Medium | 25 hrs | High |
| Map tooltips | Medium | 20 hrs | High |
| Report tooltips | Medium | 20 hrs | High |
| Export tooltips | Low | 10 hrs | High |
| Interactive tutorials | High | 40 hrs | Medium |
| Help documentation | Medium | 20 hrs | Medium |
| Accessibility | Medium | 15 hrs | Low |

---

## Recommendations

### Priority 1: Start With (Week 1)

1. **Tooltip Component** - Build reusable infrastructure
2. **Dashboard Tooltips** - High-impact, easy to implement
3. **Media Action Tooltips** - Most-used features
4. **GPS Editing Guide** - Complex feature, needs guidance

### Priority 2: Follow With (Week 2)

1. **Map Feature Tooltips** - Visual, important for UX
2. **Report Generation Guide** - Complex workflow
3. **Export Data Tooltips** - Technical feature

### Priority 3: Nice to Have (Week 3+)

1. **Interactive Tutorials** - Enhances learning
2. **Video Tutorials** - Expensive but valuable
3. **Help Documentation Site** - Long-term resource

### Success Metrics

After implementation, measure:
- **Adoption:** % of users who hover over tooltips
- **Engagement:** Average time spent reading tooltips
- **Support Reduction:** Decrease in support tickets
- **User Satisfaction:** NPS score improvement
- **Task Completion:** % of users completing complex tasks

---

## Conclusion

Adding a comprehensive tooltip and user guidance system to MAPIT is a **medium-high complexity project** requiring **80-120 hours of development**. The system will significantly improve user onboarding, reduce support burden, and enhance overall user experience.

**Recommended approach:**
1. Start with reusable Tooltip component
2. Add tooltips to high-priority features (Dashboard, Media, Reports)
3. Create detailed user guides for complex workflows (GPS editing, Report generation)
4. Add interactive tutorials for advanced users
5. Measure adoption and iterate based on feedback

This investment will pay dividends in reduced support costs and improved user satisfaction.

---

**Document prepared by:** Development Team  
**Last updated:** February 10, 2026  
**Status:** Ready for Implementation Planning
