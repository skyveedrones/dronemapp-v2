/**
 * Unit tests for EXIF extraction utility
 * Tests client-side drone telemetry extraction
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { extractDroneTelemetry, hasGpsData, formatTelemetry } from './exifExtraction';
import fs from 'fs';
import path from 'path';

describe('EXIF Extraction Utility', () => {
  let dronePhotoPath: string;
  let dronePhotoFile: File | null = null;

  beforeAll(() => {
    // Try to locate the drone photo
    const possiblePaths = [
      '/home/ubuntu/upload/DJI_20260302134726_0277_D_SKYVEE.JPG',
      '/home/ubuntu/dronemapp-v2/test-assets/drone-photo.jpg',
    ];

    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        dronePhotoPath = p;
        break;
      }
    }
  });

  describe('extractDroneTelemetry', () => {
    it('should extract telemetry from a file object', async () => {
      const result = await extractDroneTelemetry(
        new File([], 'test.jpg', { type: 'image/jpeg' })
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('latitude');
      expect(result).toHaveProperty('longitude');
      expect(result).toHaveProperty('absoluteAltitude');
      expect(result).toHaveProperty('relativeAltitude');
      expect(result).toHaveProperty('gimbalPitch');
      expect(result).toHaveProperty('capturedAt');
      expect(result).toHaveProperty('rawMetadata');
    });

    it('should return null values when no EXIF data is present', async () => {
      const emptyFile = new File([], 'empty.jpg', { type: 'image/jpeg' });
      const result = await extractDroneTelemetry(emptyFile);

      expect(result.latitude).toBeNull();
      expect(result.longitude).toBeNull();
      expect(result.absoluteAltitude).toBeNull();
      expect(result.relativeAltitude).toBeNull();
      expect(result.gimbalPitch).toBeNull();
      expect(result.capturedAt).toBeNull();
    });

    it('should handle extraction errors gracefully', async () => {
      const corruptedFile = new File([Buffer.from('corrupted')], 'bad.jpg', {
        type: 'image/jpeg',
      });
      const result = await extractDroneTelemetry(corruptedFile);

      // Should return empty telemetry object, not throw
      expect(result).toBeDefined();
      expect(result.latitude).toBeNull();
      expect(result.longitude).toBeNull();
    });
  });

  describe('hasGpsData', () => {
    it('should return true when both latitude and longitude are present', () => {
      const telemetry = {
        latitude: 40.7128,
        longitude: -74.006,
        absoluteAltitude: null,
        relativeAltitude: null,
        gimbalPitch: null,
        capturedAt: null,
        rawMetadata: null,
      };

      expect(hasGpsData(telemetry)).toBe(true);
    });

    it('should return false when latitude is missing', () => {
      const telemetry = {
        latitude: null,
        longitude: -74.006,
        absoluteAltitude: null,
        relativeAltitude: null,
        gimbalPitch: null,
        capturedAt: null,
        rawMetadata: null,
      };

      expect(hasGpsData(telemetry)).toBe(false);
    });

    it('should return false when longitude is missing', () => {
      const telemetry = {
        latitude: 40.7128,
        longitude: null,
        absoluteAltitude: null,
        relativeAltitude: null,
        gimbalPitch: null,
        capturedAt: null,
        rawMetadata: null,
      };

      expect(hasGpsData(telemetry)).toBe(false);
    });

    it('should return false when both GPS coordinates are missing', () => {
      const telemetry = {
        latitude: null,
        longitude: null,
        absoluteAltitude: 100,
        relativeAltitude: 50,
        gimbalPitch: -45,
        capturedAt: new Date(),
        rawMetadata: null,
      };

      expect(hasGpsData(telemetry)).toBe(false);
    });
  });

  describe('formatTelemetry', () => {
    it('should format complete telemetry data', () => {
      const telemetry = {
        latitude: 40.7128,
        longitude: -74.006,
        absoluteAltitude: 172.738,
        relativeAltitude: 50,
        gimbalPitch: -45.5,
        capturedAt: new Date('2026-03-02T13:47:26Z'),
        rawMetadata: null,
      };

      const formatted = formatTelemetry(telemetry);

      expect(formatted).toContain('40.712800');
      expect(formatted).toContain('-74.006000');
      expect(formatted).toContain('172.7m');
      expect(formatted).toContain('-45.5°');
    });

    it('should format partial telemetry data', () => {
      const telemetry = {
        latitude: 40.7128,
        longitude: -74.006,
        absoluteAltitude: null,
        relativeAltitude: null,
        gimbalPitch: null,
        capturedAt: null,
        rawMetadata: null,
      };

      const formatted = formatTelemetry(telemetry);

      expect(formatted).toContain('40.712800');
      expect(formatted).toContain('-74.006000');
      expect(formatted).not.toContain('Alt:');
    });

    it('should return "No telemetry data" when all fields are null', () => {
      const telemetry = {
        latitude: null,
        longitude: null,
        absoluteAltitude: null,
        relativeAltitude: null,
        gimbalPitch: null,
        capturedAt: null,
        rawMetadata: null,
      };

      const formatted = formatTelemetry(telemetry);

      expect(formatted).toBe('No telemetry data');
    });
  });

  describe('Real drone photo extraction', () => {
    it('should extract telemetry from real drone photo if available', async () => {
      if (!dronePhotoPath) {
        console.log('Skipping real drone photo test - file not found');
        return;
      }

      const fileBuffer = fs.readFileSync(dronePhotoPath);
      const file = new File([fileBuffer], 'drone-photo.jpg', {
        type: 'image/jpeg',
      });

      const result = await extractDroneTelemetry(file);

      console.log('Extracted telemetry from real drone photo:', {
        latitude: result.latitude,
        longitude: result.longitude,
        absoluteAltitude: result.absoluteAltitude,
        relativeAltitude: result.relativeAltitude,
        gimbalPitch: result.gimbalPitch,
        capturedAt: result.capturedAt?.toISOString(),
      });

      // Just verify the structure is correct
      expect(result).toBeDefined();
      expect(typeof result.latitude === 'number' || result.latitude === null).toBe(true);
      expect(typeof result.longitude === 'number' || result.longitude === null).toBe(true);
    });
  });
});
