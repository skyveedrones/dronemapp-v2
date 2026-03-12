/**
 * Metadata Extraction Utility
 * Extracts EXIF, GPS, and other metadata from image files while preserving data integrity
 * Used for drone mapping accuracy and GIS reporting
 */

import exifr from 'exifr';

export interface ImageMetadata {
  // EXIF Data
  make?: string; // Camera manufacturer (e.g., "DJI")
  model?: string; // Camera model (e.g., "Phantom 4 Pro")
  dateTime?: Date; // Photo capture timestamp
  orientation?: number; // Image orientation (1-8)
  
  // GPS Data (critical for mapping accuracy)
  gpsLatitude?: number; // Latitude in decimal degrees
  gpsLongitude?: number; // Longitude in decimal degrees
  gpsAltitude?: number; // Altitude in meters
  gpsAccuracy?: number; // GPS accuracy/precision in meters
  
  // Image Dimensions
  width?: number;
  height?: number;
  
  // Camera Settings
  focalLength?: number; // Focal length in mm
  fNumber?: number; // F-number (aperture)
  exposureTime?: number; // Shutter speed in seconds
  iso?: number; // ISO sensitivity
  
  // Drone-specific metadata
  droneModel?: string; // Extracted from make/model
  flightHeight?: number; // Altitude above ground (if available)
  gimbalRoll?: number; // Gimbal orientation
  gimbalPitch?: number;
  gimbalYaw?: number;
}

/**
 * Extract metadata from image buffer
 * Preserves all EXIF data without modification
 * Uses exifr library for consistent GPS coordinate extraction
 */
export async function extractImageMetadata(
  imageBuffer: Buffer
): Promise<ImageMetadata> {
  try {
    // Use exifr to parse EXIF data with explicit GPS handling
    // multiSegment: true enables parsing of multi-segment JPEG files (common in drone photos)
    // xmp: true enables XMP metadata parsing for drone-specific data
    // CRITICAL: Include GPSLatitudeRef and GPSLongitudeRef to correctly apply hemisphere signs
    const data = await exifr.parse(imageBuffer, {
      gps: true,
      xmp: true,
      multiSegment: true,
      pick: ['latitude', 'longitude', 'GPSLatitude', 'GPSLongitude', 'GPSLatitudeRef', 'GPSLongitudeRef', 'GPSAltitude', 'RelativeAltitude', 'CreateDate', 'Make', 'Model', 'Orientation', 'PixelXDimension', 'PixelYDimension', 'FocalLength', 'FNumber', 'ExposureTime', 'ISOSpeedRatings']
    });

    if (!data) {
      console.warn("[Metadata] No EXIF data found in image");
      return {};
    }

    const metadata: ImageMetadata = {};

    // Extract EXIF data
    if (data.Make) metadata.make = String(data.Make);
    if (data.Model) metadata.model = String(data.Model);
    if (data.CreateDate) {
      try {
        metadata.dateTime = new Date(data.CreateDate);
      } catch (e) {
        console.warn("[Metadata] Failed to parse CreateDate:", data.CreateDate);
      }
    }
    if (data.Orientation) metadata.orientation = Number(data.Orientation);

    // Extract GPS data with validation and XMP fallback
    // 1. Try exifr's automatically formatted signed decimals first
    let finalLat = data.latitude ? parseFloat(data.latitude.toString()) : null;
    let finalLng = data.longitude ? parseFloat(data.longitude.toString()) : null;
    
    // 2. If falling back to raw GPS tags, manually apply the negative sign for South/West
    if (finalLat === null && data?.GPSLatitude !== undefined) {
      finalLat = parseFloat(data.GPSLatitude.toString());
      // South is negative
      if (data?.GPSLatitudeRef === 'S') finalLat = finalLat * -1;
    }
    
    if (finalLng === null && data?.GPSLongitude !== undefined) {
      finalLng = parseFloat(data.GPSLongitude.toString());
      // West is negative
      if (data?.GPSLongitudeRef === 'W') finalLng = finalLng * -1;
    }
    
    // Validate coordinate ranges and reject zero/invalid values
    const isValidLat = finalLat !== null && finalLat !== 0 && Math.abs(finalLat) <= 90;
    const isValidLng = finalLng !== null && finalLng !== 0 && Math.abs(finalLng) <= 180;
    
    if (isValidLat && finalLat !== null) {
      metadata.gpsLatitude = finalLat;
    } else if (finalLat !== null) {
      console.warn(`[Metadata] Invalid latitude value: ${finalLat} (outside valid range)`);
    }
    
    if (isValidLng && finalLng !== null) {
      metadata.gpsLongitude = finalLng;
    } else if (finalLng !== null) {
      console.warn(`[Metadata] Invalid longitude value: ${finalLng} (outside valid range)`);
    }
    
    // Log hemisphere information for debugging
    if (data?.GPSLatitudeRef || data?.GPSLongitudeRef) {
      console.log(`[Metadata] GPS Hemisphere: Lat=${data?.GPSLatitudeRef || 'N'}, Lng=${data?.GPSLongitudeRef || 'E'}`);
    }

    // Extract altitude with fallback to RelativeAltitude
    if (data.GPSAltitude) {
      metadata.gpsAltitude = Number(data.GPSAltitude);
    } else if (data.RelativeAltitude) {
      metadata.gpsAltitude = Number(data.RelativeAltitude);
    }

    // Extract image dimensions
    if (data.PixelXDimension) metadata.width = Number(data.PixelXDimension);
    if (data.PixelYDimension) metadata.height = Number(data.PixelYDimension);

    // Extract camera settings
    if (data.FocalLength) metadata.focalLength = Number(data.FocalLength);
    if (data.FNumber) metadata.fNumber = Number(data.FNumber);
    if (data.ExposureTime) metadata.exposureTime = Number(data.ExposureTime);
    if (data.ISOSpeedRatings) metadata.iso = Number(data.ISOSpeedRatings);

    // Detect drone model from make/model
    if (metadata.make && metadata.make.toLowerCase().includes("dji")) {
      metadata.droneModel = `${metadata.make} ${metadata.model || ""}`.trim();
    }

    console.log("[Metadata] Successfully extracted metadata:", {
      make: metadata.make,
      model: metadata.model,
      gps: metadata.gpsLatitude && metadata.gpsLongitude 
        ? `${metadata.gpsLatitude.toFixed(6)}, ${metadata.gpsLongitude.toFixed(6)}` 
        : "Not available",
      altitude: metadata.gpsAltitude,
      dateTime: metadata.dateTime,
    });

    return metadata;
  } catch (error) {
    console.error("[Metadata] Error extracting metadata:", error);
    // Return empty metadata object instead of throwing
    // This ensures upload continues even if metadata extraction fails
    return {};
  }
}

/**
 * Format metadata for display
 */
export function formatMetadataForDisplay(metadata: ImageMetadata): string {
  const parts: string[] = [];

  if (metadata.droneModel) parts.push(`Drone: ${metadata.droneModel}`);
  if (metadata.dateTime) parts.push(`Captured: ${metadata.dateTime.toLocaleString()}`);
  if (metadata.gpsLatitude && metadata.gpsLongitude) {
    parts.push(`Location: ${metadata.gpsLatitude.toFixed(6)}, ${metadata.gpsLongitude.toFixed(6)}`);
  }
  if (metadata.gpsAltitude) parts.push(`Altitude: ${metadata.gpsAltitude.toFixed(1)}m`);
  if (metadata.width && metadata.height) {
    parts.push(`Resolution: ${metadata.width}x${metadata.height}`);
  }
  if (metadata.iso) parts.push(`ISO: ${metadata.iso}`);
  if (metadata.fNumber) parts.push(`F/${metadata.fNumber}`);
  if (metadata.focalLength) parts.push(`Focal Length: ${metadata.focalLength}mm`);

  return parts.join(" | ");
}

/**
 * Validate GPS accuracy for mapping-grade precision
 * Returns true if GPS data meets mapping-grade requirements (1.0m - 2.0m accuracy)
 */
export function isMapGradeAccuracy(metadata: ImageMetadata): boolean {
  if (!metadata.gpsAccuracy) return false;
  
  // DOP values: < 5 is excellent, 5-10 is good, > 10 is poor
  // For mapping-grade: DOP should be < 5 (which gives ~1-2m accuracy)
  return metadata.gpsAccuracy < 5;
}

/**
 * Create GeoJSON feature from image metadata for mapping
 */
export function createGeoJSONFeature(
  metadata: ImageMetadata,
  imageUrl: string,
  imageId: number
) {
  if (!metadata.gpsLatitude || !metadata.gpsLongitude) {
    return null;
  }

  return {
    type: "Feature",
    geometry: {
      type: "Point",
      coordinates: [metadata.gpsLongitude, metadata.gpsLatitude],
    },
    properties: {
      id: imageId,
      url: imageUrl,
      timestamp: metadata.dateTime?.toISOString(),
      altitude: metadata.gpsAltitude,
      accuracy: metadata.gpsAccuracy,
      camera: metadata.droneModel || `${metadata.make} ${metadata.model}`,
      isMapGrade: isMapGradeAccuracy(metadata),
    },
  };
}
