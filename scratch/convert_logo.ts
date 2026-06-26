import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

async function convert() {
  const inputPath = path.join(process.cwd(), 'public', 'aset', 'logo-amazing-tegal.png');
  const outputPath = path.join(process.cwd(), 'public', 'aset', 'amazing-tegal.svg');

  if (!fs.existsSync(inputPath)) {
    console.error('File not found:', inputPath);
    return;
  }

  const metadata = await sharp(inputPath).metadata();
  const width = metadata.width || 120;
  const height = metadata.height || 40;

  const fileBuffer = fs.readFileSync(inputPath);
  const base64Data = fileBuffer.toString('base64');

  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">
  <image href="data:image/png;base64,${base64Data}" width="${width}" height="${height}" />
</svg>`;

  fs.writeFileSync(outputPath, svgContent);
  console.log(`Successfully converted ${width}x${height} PNG to SVG at ${outputPath}`);
}

convert().catch(console.error);
