/**
 * Project Report Generation Service
 * Generates PDF reports with project info, map, and media gallery
 */

import { Project, Media } from "../drizzle/schema";
import sharp from "sharp";

// Resolution presets for media in reports
export const RESOLUTION_PRESETS = {
  high: { width: 1920, quality: 75, label: "High (1920px)" },
  medium: { width: 1280, quality: 65, label: "Medium (1280px)" },
  low: { width: 800, quality: 55, label: "Low (800px)" },
  thumbnail: { width: 400, quality: 45, label: "Thumbnail (400px)" },
} as const;

export type ResolutionPreset = keyof typeof RESOLUTION_PRESETS;

export interface ReportOptions {
  projectId: number;
  mediaIds: number[];
  resolution: ResolutionPreset;
  includeWatermark: boolean;
  watermarkUrl?: string;
  watermarkPosition?: "top-left" | "top-right" | "center" | "bottom-left" | "bottom-right";
  watermarkOpacity?: number;
  watermarkScale?: number;
}

export interface ReportData {
  project: Project;
  media: Media[];
  mapImageUrl?: string;
  generatedAt: Date;
}

import { ENV } from "./_core/env";

// Map style options
export type MapStyle = "roadmap" | "satellite" | "hybrid" | "terrain";

export const MAP_STYLE_OPTIONS: { value: MapStyle; label: string }[] = [
  { value: "hybrid", label: "Hybrid (Satellite + Labels)" },
  { value: "satellite", label: "Satellite" },
  { value: "roadmap", label: "Roadmap" },
  { value: "terrain", label: "Terrain" },
];

export interface StaticMapOptions {
  mapStyle?: MapStyle;
  showFlightPath?: boolean;
}

/**
 * Generate a static Google Maps URL with markers for all GPS points
 * Uses the Manus Maps proxy for authentication
 */
export function generateStaticMapUrl(
  media: Media[],
  options: StaticMapOptions = {}
): string | null {
  const { mapStyle = "hybrid", showFlightPath = true } = options;
  
  // Sort media by capture time for flight path
  const gpsMedia = media
    .filter(m => m.latitude && m.longitude)
    .sort((a, b) => {
      const dateA = a.capturedAt ? new Date(a.capturedAt).getTime() : 0;
      const dateB = b.capturedAt ? new Date(b.capturedAt).getTime() : 0;
      return dateA - dateB;
    });
  
  if (gpsMedia.length === 0) {
    return null;
  }

  const baseUrl = ENV.forgeApiUrl;
  const apiKey = ENV.forgeApiKey;
  
  if (!baseUrl || !apiKey) {
    console.warn("[Report] Maps proxy credentials not configured");
    return null;
  }

  // Calculate center point and zoom level based on bounds
  const lats = gpsMedia.map(m => parseFloat(m.latitude!));
  const lngs = gpsMedia.map(m => parseFloat(m.longitude!));
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  const centerLat = (minLat + maxLat) / 2;
  const centerLng = (minLng + maxLng) / 2;
  
  // Calculate appropriate zoom level based on bounds
  const latDiff = maxLat - minLat;
  const lngDiff = maxLng - minLng;
  const maxDiff = Math.max(latDiff, lngDiff);
  let zoom = 14;
  if (maxDiff > 0.5) zoom = 10;
  else if (maxDiff > 0.2) zoom = 11;
  else if (maxDiff > 0.1) zoom = 12;
  else if (maxDiff > 0.05) zoom = 13;
  else if (maxDiff > 0.01) zoom = 14;
  else zoom = 15;

  // Build markers string - limit to 100 markers for URL length
  const markersToShow = gpsMedia.slice(0, 100);
  const markers = markersToShow
    .map(m => `${m.latitude},${m.longitude}`)
    .join("|");

  // Generate static map URL via Manus proxy
  const proxyUrl = baseUrl.replace(/\/+$/, "");
  const params = new URLSearchParams({
    center: `${centerLat},${centerLng}`,
    zoom: String(zoom),
    size: "800x500",
    maptype: mapStyle,
    markers: `color:red|size:small|${markers}`,
    key: apiKey,
  });

  // Add flight path polyline if enabled and we have multiple points
  if (showFlightPath && gpsMedia.length >= 2) {
    // Build path string - Google Static Maps uses path parameter for polylines
    // Format: path=color:0xff0000ff|weight:3|lat1,lng1|lat2,lng2|...
    const pathPoints = markersToShow
      .map(m => `${m.latitude},${m.longitude}`)
      .join("|");
    params.append("path", `color:0x10B981FF|weight:3|${pathPoints}`);
  }

  return `${proxyUrl}/v1/maps/proxy/maps/api/staticmap?${params.toString()}`;
}

/**
 * Fetch static map image and convert to base64 data URL
 */
export async function fetchStaticMapAsDataUrl(
  media: Media[],
  options: StaticMapOptions = {}
): Promise<string | null> {
  const mapUrl = generateStaticMapUrl(media, options);
  if (!mapUrl) return null;
  
  try {
    const response = await fetch(mapUrl);
    if (!response.ok) {
      console.error(`[Report] Failed to fetch static map: ${response.status}`);
      return null;
    }
    
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "image/png";
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch (error) {
    console.error("[Report] Error fetching static map:", error);
    return null;
  }
}

/**
 * Resize an image to the specified resolution
 */
export async function resizeImage(
  imageBuffer: Buffer,
  resolution: ResolutionPreset
): Promise<Buffer> {
  const preset = RESOLUTION_PRESETS[resolution];
  
  return sharp(imageBuffer)
    .resize(preset.width, null, { 
      withoutEnlargement: true,
      fit: "inside"
    })
    .jpeg({ quality: preset.quality })
    .toBuffer();
}

/**
 * Apply watermark to an image if requested
 */
export async function processImageForReport(
  imageBuffer: Buffer,
  resolution: ResolutionPreset,
  watermarkOptions?: {
    watermarkBuffer: Buffer;
    position: "top-left" | "top-right" | "center" | "bottom-left" | "bottom-right";
    opacity: number;
    scale: number;
  }
): Promise<Buffer> {
  // First resize the image
  let processedBuffer = await resizeImage(imageBuffer, resolution);
  
  // Apply watermark if provided
  if (watermarkOptions) {
    const { watermarkBuffer, position, opacity, scale } = watermarkOptions;
    
    // Get image dimensions
    const metadata = await sharp(processedBuffer).metadata();
    const imageWidth = metadata.width || 800;
    const imageHeight = metadata.height || 600;
    
    // Calculate watermark size
    const watermarkSize = Math.round(Math.min(imageWidth, imageHeight) * (scale / 100));
    
    // Resize watermark
    const resizedWatermark = await sharp(watermarkBuffer)
      .resize(watermarkSize, watermarkSize, { fit: "inside" })
      .png()
      .toBuffer();
    
    // Calculate position
    const wmMeta = await sharp(resizedWatermark).metadata();
    const wmWidth = wmMeta.width || watermarkSize;
    const wmHeight = wmMeta.height || watermarkSize;
    
    let left = 0;
    let top = 0;
    const padding = 20;
    
    switch (position) {
      case "top-left":
        left = padding;
        top = padding;
        break;
      case "top-right":
        left = imageWidth - wmWidth - padding;
        top = padding;
        break;
      case "center":
        left = Math.round((imageWidth - wmWidth) / 2);
        top = Math.round((imageHeight - wmHeight) / 2);
        break;
      case "bottom-left":
        left = padding;
        top = imageHeight - wmHeight - padding;
        break;
      case "bottom-right":
        left = imageWidth - wmWidth - padding;
        top = imageHeight - wmHeight - padding;
        break;
    }
    
    // Apply watermark with opacity
    const watermarkWithOpacity = await sharp(resizedWatermark)
      .composite([{
        input: Buffer.from([255, 255, 255, Math.round(255 * (opacity / 100))]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: "dest-in"
      }])
      .png()
      .toBuffer();
    
    processedBuffer = await sharp(processedBuffer)
      .composite([{
        input: watermarkWithOpacity,
        left: Math.max(0, left),
        top: Math.max(0, top),
        blend: "over"
      }])
      .jpeg({ quality: RESOLUTION_PRESETS[resolution].quality })
      .toBuffer();
  }
  
  return processedBuffer;
}

/**
 * Generate HTML content for the report
 * Redesigned: Compact layout, 8 photos per page (4x2 grid), dual logos, professional design
 */
export function generateReportHtml(
  project: Project,
  mediaImages: { filename: string; dataUrl: string; media: Media }[],
  mapImageDataUrl: string | null,
  generatedAt: Date,
  userLogoUrl?: string,
  skyVeeLogoDataUrl?: string
): string {
  const formatDate = (date: Date | null) => {
    if (!date) return "N/A";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });
  };

  // MAPIT logo - use the actual logo image passed from server
  const skyVeeLogo = skyVeeLogoDataUrl 
    ? `<img src="${skyVeeLogoDataUrl}" alt="MAPIT" class="mapit-logo-img" />`
    : `<div style="color: #333; font-weight: bold; font-size: 24px;">MAPIT</div>`;

  // Generate priority items section with thumbnails and notes
  const generatePrioritySection = () => {
    const priorityItems = mediaImages.filter(img => 
      img.media.priority === "low" || img.media.priority === "high"
    );
    
    if (priorityItems.length === 0) return "";
    
    const priorityHtml = priorityItems.map(img => {
      const priorityColor = img.media.priority === "high" ? "#dc2626" : "#eab308";
      const priorityLabel = img.media.priority === "high" ? "High Priority" : "Low Priority";
      
      return `
        <div class="priority-item">
          <div class="priority-thumbnail">
            <img src="${img.dataUrl}" alt="${img.filename}" />
            <div class="priority-indicator" style="background-color: ${priorityColor};">
              <span style="color: white; font-weight: bold; font-size: 16px;">!</span>
            </div>
          </div>
          <div class="priority-details">
            <div class="priority-header">
              <span class="priority-filename">${img.filename}</span>
              <span class="priority-badge" style="background-color: ${priorityColor};">${priorityLabel}</span>
            </div>
            ${img.media.notes ? `
              <div class="priority-notes">${img.media.notes}</div>
            ` : ""}
          </div>
        </div>
      `;
    }).join("");
    
    return `
      <div class="priority-section">
        <div class="section-header">Items Requiring Attention</div>
        <div class="priority-container">
          ${priorityHtml}
        </div>
      </div>
    `;
  };

  // Generate photo grid HTML - 6 photos per page (3 rows x 2 columns)
  const generatePhotoPages = () => {
    if (mediaImages.length === 0) return "";
    
    const photosPerPage = 6;
    const pages: string[] = [];
    
    for (let i = 0; i < mediaImages.length; i += photosPerPage) {
      const pagePhotos = mediaImages.slice(i, i + photosPerPage);
      const pageNumber = Math.floor(i / photosPerPage) + 1;
      const totalPages = Math.ceil(mediaImages.length / photosPerPage);
      
      const photoGrid = pagePhotos.map((img, idx) => {
        const priorityColor = img.media.priority === "high" ? "#dc2626" : img.media.priority === "low" ? "#eab308" : null;
        const priorityIcon = priorityColor ? `<div class="priority-badge-small" style="background-color: ${priorityColor};">!</div>` : "";
        
        return `
        <div class="photo-cell">
          <div class="photo-image-wrapper">
            <img src="${img.dataUrl}" alt="${img.filename}" />
            ${priorityIcon}
          </div>
          <span class="photo-label">${img.filename}</span>
        </div>
      `;
      }).join("");
      
      pages.push(`
        <div class="page-break"></div>
        <div class="photo-page">
          <div class="photo-page-header">
            <span class="section-title">Project Media</span>
            <span class="page-indicator">Page ${pageNumber} of ${totalPages}</span>
          </div>
          <div class="photo-grid">
            ${photoGrid}
          </div>
        </div>
      `);
    }
    
    return pages.join("");
  };

  // SVG icons for inline use
  const icons = {
    location: `<svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>`,
    user: `<svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    calendar: `<svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
    image: `<svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    plane: `<svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`,
    shield: `<svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    status: `<svg class="info-icon" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`,
  };

  // Build project info items - horizontal layout with icons
  const infoItems: string[] = [];
  
  if (project.location) {
    infoItems.push(`<div class="info-item">${icons.location}<span class="info-label">Location:</span><span class="info-value">${project.location}</span></div>`);
  }
  if (project.clientName) {
    infoItems.push(`<div class="info-item">${icons.user}<span class="info-label">Client:</span><span class="info-value">${project.clientName}</span></div>`);
  }
  if (project.flightDate) {
    infoItems.push(`<div class="info-item">${icons.calendar}<span class="info-label">Flight:</span><span class="info-value">${formatDate(project.flightDate)}</span></div>`);
  }
  if (project.status) {
    infoItems.push(`<div class="info-item">${icons.status}<span class="info-label">Status:</span><span class="info-value">${project.status}</span></div>`);
  }
  infoItems.push(`<div class="info-item">${icons.image}<span class="info-label">Media:</span><span class="info-value">${mediaImages.length} items</span></div>`);
  
  // Pilot info items
  if (project.dronePilot) {
    infoItems.push(`<div class="info-item">${icons.plane}<span class="info-label">Pilot:</span><span class="info-value">${project.dronePilot}</span></div>`);
  }
  if (project.faaLicenseNumber) {
    infoItems.push(`<div class="info-item">${icons.shield}<span class="info-label">FAA License:</span><span class="info-value">${project.faaLicenseNumber}</span></div>`);
  }
  if (project.laancAuthNumber) {
    infoItems.push(`<div class="info-item">${icons.shield}<span class="info-label">LAANC Auth:</span><span class="info-value">${project.laancAuthNumber}</span></div>`);
  }
  
  // Warranty info
  if (project.warrantyStartDate || project.warrantyEndDate) {
    const warrantyText = project.warrantyStartDate && project.warrantyEndDate 
      ? `${formatDate(project.warrantyStartDate)} - ${formatDate(project.warrantyEndDate)}`
      : project.warrantyStartDate ? `From ${formatDate(project.warrantyStartDate)}` : `Until ${formatDate(project.warrantyEndDate)}`;
    infoItems.push(`<div class="info-item">${icons.shield}<span class="info-label">Warranty:</span><span class="info-value">${warrantyText}</span></div>`);
  }

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page {
      margin: 0.3in 0.4in;
      size: letter;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 11px;
      line-height: 1.4;
      color: #1a1a1a;
      background: #fff;
    }
    
    /* Header with dual logos */
    .report-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: #ffffff;
      padding: 20px;
      border-bottom: 3px solid #22c55e;
      margin-bottom: 20px;
    }
    .logo-left {
      display: flex;
      align-items: center;
      padding-left: 15px;
      flex: 1;
    }
    .logo-left .mapit-logo-img {
      height: 30px;
      width: auto;
      max-width: 120px;
    }
    .logo-right {
      padding-right: 15px;
      
      text-align: right;
    }
    .logo-right img {
      max-height: 120px;
      max-width: 350px;
      object-fit: contain;
    }
    
    /* Title section */
    .report-title {
      text-align: center;
      margin-bottom: 20px;
    }
    .report-title h1 {
      font-size: 24px;
      font-weight: 700;
      color: #1a1a1a;
      margin-bottom: 4px;
    }
    .report-title .subtitle {
      font-size: 14px;
      color: #666;
    }
    
    /* Info sections - horizontal layout like project page */
    .info-section {
      margin-bottom: 15px;
    }
    .section-header {
      font-size: 13px;
      font-weight: 600;
      color: #000000;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 10px;
      padding-bottom: 4px;
      border-bottom: 1px solid #e5e5e5;
    }
    
    /* Horizontal info items with icons */
    .info-row {
      display: flex;
      flex-wrap: wrap;
      gap: 20px 30px;
      padding: 12px 15px;
      background: #f8f9fa;
      border-radius: 8px;
      border: 1px solid #e5e5e5;
    }
    .info-item {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .info-icon {
      width: 16px;
      height: 16px;
      color: #10B981;
    }
    .info-label {
      font-size: 11px;
      color: #666;
    }
    .info-value {
      font-size: 11px;
      font-weight: 600;
      color: #1a1a1a;
    }
    
    /* Map section */
    .map-section {
      margin: 15px 0;
    }
    .map-container {
      border: 1px solid #ddd;
      border-radius: 6px;
      overflow: hidden;
      max-width: 100%;
    }
    .map-container img {
      width: 100%;
      max-height: 420px;
      object-fit: contain;
      display: block;
    }
    .map-caption {
      text-align: center;
      font-size: 10px;
      color: #888;
      padding: 6px;
      background: #f9f9f9;
    }
    
    /* Priority section */
    .priority-section {
      margin: 15px 0;
      page-break-inside: avoid;
    }
    .priority-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .priority-item {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: #fff;
      border: 1px solid #e5e5e5;
      border-radius: 8px;
      align-items: flex-start;
    }
    .priority-thumbnail {
      position: relative;
      flex-shrink: 0;
      width: 120px;
      height: 90px;
      border-radius: 6px;
      overflow: hidden;
      border: 1px solid #ddd;
    }
    .priority-thumbnail img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .priority-indicator {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 24px;
      height: 24px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    .priority-details {
      flex: 1;
      min-width: 0;
    }
    .priority-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
      gap: 8px;
    }
    .priority-filename {
      font-size: 15px;
      font-weight: 600;
      color: #1a1a1a;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .priority-badge {
      font-size: 11px;
      font-weight: 600;
      color: white;
      padding: 4px 10px;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      flex-shrink: 0;
    }
    .priority-notes {
      font-size: 14px;
      color: #333;
      line-height: 1.7;
      padding: 12px;
      background: #f8f9fa;
      border-radius: 4px;
      border-left: 4px solid #e5e5e5;
    }
    
    /* Photo grid - 4 rows x 2 columns = 8 per page */
    .photo-page {
      page-break-inside: avoid;
    }
    .photo-page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
      padding-bottom: 6px;
      border-bottom: 1px solid #e5e5e5;
    }
    .section-title {
      font-size: 15px;
      font-weight: 700;
      color: #000000;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .page-indicator {
      font-size: 10px;
      color: #888;
    }
    .photo-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      grid-template-rows: repeat(3, 1fr);
      gap: 12px;
      height: calc(100vh - 80px);
      padding: 0 20px;
    }
    .photo-cell {
      display: flex;
      flex-direction: column;
      border: 2px solid #333333;
      border-radius: 4px;
      overflow: hidden;
      background: #fafafa;
    }
    .photo-image-wrapper {
      position: relative;
      width: 100%;
      height: calc(100% - 22px);
      overflow: hidden;
    }
    .photo-cell img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .priority-badge-small {
      position: absolute;
      top: 4px;
      right: 4px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.4);
      z-index: 10;
    }
    .photo-label {
      font-size: 14px;
      color: #666;
      text-align: center;
      padding: 5px;
      background: #f5f5f5;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      height: 24px;
      line-height: 16px;
    }
    
    /* Page break utility */
    .page-break {
      page-break-before: always;
    }
    
    /* Footer */
    .report-footer {
      position: fixed;
      bottom: 0.3in;
      left: 0.5in;
      right: 0.5in;
      text-align: center;
      font-size: 9px;
      color: #999;
      border-top: 1px solid #eee;
      padding-top: 8px;
    }
  </style>
</head>
<body>
  <!-- Header with SkyVee logo -->
  <div class="report-header">
    <div class="logo-left">
      ${skyVeeLogo}
    </div>
    ${userLogoUrl ? `<div class="logo-right"><img src="${userLogoUrl}" alt="Company Logo" /></div>` : ""}
  </div>
  
  <!-- Report Title -->
  <div class="report-title">
    <h1>${project.name}</h1>
    <div class="subtitle">Project Report • Generated ${formatDate(generatedAt)}</div>
  </div>
  
  <!-- Project Information - Horizontal Layout -->
  <div class="info-section">
    <div class="section-header">Project Information</div>
    <div class="info-row">
      ${infoItems.join("")}
    </div>
  </div>
  
  ${project.description ? `
  <div class="info-section">
    <div class="section-header">Description</div>
    <p style="font-size: 11px; color: #333; line-height: 1.5; margin: 0; padding: 10px 15px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e5e5e5;">${project.description}</p>
  </div>
  ` : ""}
  
  <!-- Project Map -->
  ${mapImageDataUrl ? `
  <div class="map-section">
    <div class="section-header">Project Map</div>
    <div class="map-container">
      <img src="${mapImageDataUrl}" alt="Project Map" />
      <div class="map-caption">${mediaImages.length} GPS locations mapped</div>
    </div>
  </div>
  ` : ""}
  
  <!-- Priority Items Section -->
  ${generatePrioritySection()}
  
  <!-- Photo Gallery Pages -->
  ${generatePhotoPages()}
  
  <!-- Footer -->
  <div class="report-footer">
  </div>
</body>
</html>
  `;
}
