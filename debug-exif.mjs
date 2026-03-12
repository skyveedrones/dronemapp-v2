import fs from 'fs';
import ExifParser from 'exif-parser';

const photoPath = '/home/ubuntu/upload/DJI_20260302134726_0277_D_SKYVEE.JPG';

try {
  const buffer = fs.readFileSync(photoPath);
  console.log(`[Debug] Photo size: ${buffer.length} bytes`);
  
  const parser = ExifParser.create(buffer);
  const result = parser.parse();
  
  console.log(`[Debug] EXIF parsing successful`);
  console.log(`[Debug] All EXIF tags:`);
  console.log(JSON.stringify(result.tags, null, 2));
  
  console.log(`\n[Debug] GPS-related tags:`);
  const gpsKeys = Object.keys(result.tags).filter(k => k.includes('GPS'));
  gpsKeys.forEach(key => {
    console.log(`  ${key}: ${JSON.stringify(result.tags[key])}`);
  });
  
  console.log(`\n[Debug] DateTime-related tags:`);
  const dateKeys = Object.keys(result.tags).filter(k => k.toLowerCase().includes('date') || k.toLowerCase().includes('time'));
  dateKeys.forEach(key => {
    console.log(`  ${key}: ${JSON.stringify(result.tags[key])}`);
  });
  
} catch (error) {
  console.error(`[Debug] Error:`, error.message);
  console.error(error);
}
