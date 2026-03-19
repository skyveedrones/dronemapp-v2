declare module "piexifjs" {
  interface ExifDict {
    [key: string]: any;
    "0th"?: Record<number, any>;
    "1st"?: Record<number, any>;
    Exif?: Record<number, any>;
    GPS?: Record<number, any>;
    Interop?: Record<number, any>;
  }

  export function load(data: string | Buffer): ExifDict;
  export function dump(exifDict: ExifDict): string;
  export function remove(jpeg: string | Buffer): string;
}
