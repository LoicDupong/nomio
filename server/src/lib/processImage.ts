import sharp from 'sharp';

const MAX_DIMENSION = 1920;
const WEBP_QUALITY = 82;

export interface ProcessedImage {
  buffer: Buffer;
  size: number;
  contentType: 'image/webp';
}

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const buffer = await sharp(input)
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY })
    .toBuffer();

  return {
    buffer,
    size: buffer.length,
    contentType: 'image/webp',
  };
}
