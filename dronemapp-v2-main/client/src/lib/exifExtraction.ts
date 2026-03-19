/**
 * Client-Side EXIF/XMP Extraction Utility
 * Extracts drone telemetry immediately upon file selection
 * Preserves GPS and altitude data independent of file format conversion
 */

import exifr from 'exifr';

export interface DroneTelementry {
  latitude: number | null;
  longitude: number | null;
  absoluteAltitude: number | null;
  relativeAltitude: number | null;
  gimbalPitch: number | null;
  capturedAt: Date | null;
  rawMetadata: Record<string, any> | null;
}

/**
 * Helper to safely convert values to numbers, filtering out NaN
 */
function toNumber(val: any): number | null {
  if (val === null || val === undefined) return null;
  const num = typeof val === 'number' ? val : Number(val);
  return isNaN(num) ? null : num;
}

/**
 * Extract drone telemetry from a file before any format conversion
 * Uses exifr to read EXIF, XMP, and IPTC data from images
 * 
 * DJI drones store critical mapping data in:
 * - EXIF GPS tags (latitude, longitude, altitude)
 * - XMP tags (gimbal pitch, relative altitude)
 */
export async function extractDroneTelemetry(file: File): Promise<DroneTelementry> {
  try {
    console.log(`[EXIF] Extracting telemetry from: ${file.name} (${file.type})`);
    
    // Parse EXIF, XMP, and IPTC data from the file
    // multiSegment: true enables parsing of multi-segment JPEG files (common in drone photos)
    // Aggressive DJI/Drone XMP data capture for maximum metadata preservation
    // CRITICAL: Include GPSLatitudeRef and GPSLongitudeRef to correctly apply hemisphere signs
    const data = await exifr.parse(file, {
      gps: true,
      xmp: true,
      iptc: true,
      multiSegment: true,
      // Specifically pick these for DJI/Drone support
      pick: [
        'latitude', 'longitude', 'GPSLatitude', 'GPSLongitude', 'GPSLatitudeRef', 'GPSLongitudeRef',
        'RelativeAltitude', 'GPSAltitude', 'GimbalPitchDegree'
      ],
    });

    console.log(`[EXIF] Raw extracted data:`, data);

    // Extract GPS coordinates with XMP fallback
    // 1. Try exifr's automatically formatted signed decimals first
    let latitude = data?.latitude ? parseFloat(data.latitude.toString()) : null;
    let longitude = data?.longitude ? parseFloat(data.longitude.toString()) : null;
    
    // 2. If falling back to raw GPS tags, manually apply the negative sign for South/West
    // This matches the server-side extraction logic for consistency
    if (latitude === null && data?.GPSLatitude !== undefined) {
      latitude = parseFloat(data.GPSLatitude.toString());
      // South is negative
      if (data?.GPSLatitudeRef === 'S') latitude = latitude * -1;
    }
    
    if (longitude === null && data?.GPSLongitude !== undefined) {
      longitude = parseFloat(data.GPSLongitude.toString());
      // West is negative
      if (data?.GPSLongitudeRef === 'W') longitude = longitude * -1;
    }

    // Validate coordinate ranges and reject zero/invalid values
    const isValidLat = latitude !== null && latitude !== 0 && Math.abs(latitude) <= 90;
    const isValidLng = longitude !== null && longitude !== 0 && Math.abs(longitude) <= 180;
    
    if (!isValidLat && latitude !== null) {
      console.warn(`[EXIF] Invalid latitude: ${latitude} (outside valid range)`);
      latitude = null;
    }
    
    if (!isValidLng && longitude !== null) {
      console.warn(`[EXIF] Invalid longitude: ${longitude} (outside valid range)`);
      longitude = null;
    }

    // Extract altitude (absolute from GPS, relative from XMP)
    const absoluteAltitude = toNumber(data?.GPSAltitude);
    const relativeAltitude = toNumber(data?.RelativeAltitude);

    // Extract gimbal pitch (DJI-specific XMP tag)
    const gimbalPitch = toNumber(data?.GimbalPitchDegree);

    // Extract capture timestamp
    let capturedAt: Date | null = null;
    if (data?.DateTimeOriginal) {
      capturedAt = new Date(data.DateTimeOriginal);
    } else if (data?.DateTime) {
      capturedAt = new Date(data.DateTime);
    }

    const result: DroneTelementry = {
      latitude,
      longitude,
      absoluteAltitude,
      relativeAltitude,
      gimbalPitch,
      capturedAt,
      rawMetadata: data || null,
    };

    console.log(`[EXIF] Extracted telemetry:`, {
      latitude: result.latitude,
      longitude: result.longitude,
      latitudeRef: data?.GPSLatitudeRef || 'N',
      longitudeRef: data?.GPSLongitudeRef || 'E',
      absoluteAltitude: result.absoluteAltitude,
      relativeAltitude: result.relativeAltitude,
      gimbalPitch: result.gimbalPitch,
      capturedAt: result.capturedAt?.toISOString(),
    });

    return result;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.warn(`[EXIF] Failed to extract telemetry from ${file.name}: ${msg}`);
    
    // Return empty telemetry on extraction failure
    return {
      latitude: null,
      longitude: null,
      absoluteAltitude: null,
      relativeAltitude: null,
      gimbalPitch: null,
      capturedAt: null,
      rawMetadata: null,
    };
  }
}

/**
 * Validate that extracted telemetry has meaningful GPS data
 */
export function hasGpsData(telemetry: DroneTelementry): boolean {
  return telemetry.latitude !== null && telemetry.longitude !== null;
}

/**
 * Format telemetry for display
 */
export function formatTelemetry(telemetry: DroneTelementry): string {
  const parts: string[] = [];
  
  if (telemetry.latitude && telemetry.longitude) {
    parts.push(`GPS: ${telemetry.latitude.toFixed(7)}, ${telemetry.longitude.toFixed(7)}`);
  }
  
  if (telemetry.absoluteAltitude) {
    parts.push(`Alt: ${telemetry.absoluteAltitude.toFixed(1)}m`);
  }
  
  if (telemetry.gimbalPitch) {
    parts.push(`Pitch: ${telemetry.gimbalPitch.toFixed(1)}°`);
  }
  
  if (telemetry.capturedAt) {
    parts.push(`Captured: ${telemetry.capturedAt.toLocaleString()}`);
  }
  
  return parts.join(' | ') || 'No telemetry data';
}

/**
 * Debug helper: Extract ALL EXIF tags from a file for inspection
 * Call this in browser console to see what tags are available
 */
export async function debugAllExifTags(file: File): Promise<any> {
  try {
    console.log('🔍 [DEBUG] Extracting ALL EXIF tags from:', file.name);
    const allData = await exifr.parse(file);
    console.log('🔍 [DEBUG] All EXIF tags found:', allData);
    console.table(allData);
    return allData;
  } catch (error) {
    console.error('❌ [DEBUG] Error extracting all EXIF tags:', error);
    return null;
  }
}
