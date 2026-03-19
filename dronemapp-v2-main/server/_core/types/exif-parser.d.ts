declare module "exif-parser" {
  interface ExifTags {
    GPSLatitude?: number;
    GPSLongitude?: number;
    GPSAltitude?: number;
    DateTimeOriginal?: number;
    Make?: string;
    Model?: string;
    [key: string]: unknown;
  }

  interface ExifResult {
    tags: ExifTags;
    imageSize?: {
      width: number;
      height: number;
    };
    thumbnailOffset?: number;
    thumbnailLength?: number;
    thumbnailType?: number;
    app1Offset?: number;
  }

  interface ExifParser {
    parse(): ExifResult;
  }

  function create(buffer: Buffer): ExifParser;

  export = { create };
}
