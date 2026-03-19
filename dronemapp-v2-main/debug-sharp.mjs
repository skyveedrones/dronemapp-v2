import sharp from 'sharp';
import fs from 'fs';

const photoPath = '/home/ubuntu/upload/DJI_20260302134726_0277_D_SKYVEE.JPG';

try {
  const buffer = fs.readFileSync(photoPath);
  const image = sharp(buffer);
  
  const metadata = await image.metadata();
  console.log('[Debug] Sharp metadata:');
  console.log(JSON.stringify(metadata, null, 2));
  
} catch (error) {
  console.error('[Debug] Error:', error.message);
  console.error(error);
}
