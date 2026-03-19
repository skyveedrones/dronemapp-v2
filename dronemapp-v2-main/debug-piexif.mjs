import piexif from 'piexifjs';
import fs from 'fs';

const photoPath = '/home/ubuntu/upload/DJI_20260302134726_0277_D_SKYVEE.JPG';

try {
  const buffer = fs.readFileSync(photoPath);
  const binary = buffer.toString('binary');
  
  console.log('[Debug] Attempting piexif extraction...');
  const exifDict = piexif.load(binary);
  
  console.log('[Debug] piexif extraction successful');
  console.log('[Debug] EXIF data:');
  
  for (const ifd in exifDict) {
    console.log(`\n[${ifd}]:`);
    for (const tag in exifDict[ifd]) {
      const tagName = piexif.TAGS[ifd][tag]['name'];
      const value = exifDict[ifd][tag];
      console.log(`  ${tagName}: ${JSON.stringify(value)}`);
    }
  }
  
} catch (error) {
  console.error('[Debug] Error:', error.message);
  console.error(error);
}
