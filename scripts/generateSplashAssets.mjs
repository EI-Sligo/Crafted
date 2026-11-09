import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const sourceImage = path.resolve('src/assets/images/clean_splash_1793998580783.jpg');

const targets = [
  { dir: 'android/app/src/main/res/drawable', width: 480, height: 800, fit: 'cover' },
  { dir: 'android/app/src/main/res/drawable-port-mdpi', width: 320, height: 480, fit: 'cover' },
  { dir: 'android/app/src/main/res/drawable-port-hdpi', width: 480, height: 800, fit: 'cover' },
  { dir: 'android/app/src/main/res/drawable-port-xhdpi', width: 720, height: 1280, fit: 'cover' },
  { dir: 'android/app/src/main/res/drawable-port-xxhdpi', width: 960, height: 1600, fit: 'cover' },
  { dir: 'android/app/src/main/res/drawable-port-xxxhdpi', width: 1280, height: 1920, fit: 'cover' },
  { dir: 'android/app/src/main/res/drawable-land-mdpi', width: 480, height: 320, fit: 'contain' },
  { dir: 'android/app/src/main/res/drawable-land-hdpi', width: 800, height: 480, fit: 'contain' },
  { dir: 'android/app/src/main/res/drawable-land-xhdpi', width: 1280, height: 720, fit: 'contain' },
  { dir: 'android/app/src/main/res/drawable-land-xxhdpi', width: 1600, height: 960, fit: 'contain' },
  { dir: 'android/app/src/main/res/drawable-land-xxxhdpi', width: 1920, height: 1280, fit: 'contain' },
];

async function generate() {
  console.log('Generating Android splash screen drawables from:', sourceImage);

  for (const t of targets) {
    const targetDir = path.resolve(t.dir);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const outputPath = path.join(targetDir, 'splash.png');

    await sharp(sourceImage)
      .resize({
        width: t.width,
        height: t.height,
        fit: t.fit,
        position: 'center',
        background: { r: 15, g: 23, b: 42, alpha: 1 }, // #0f172a dark slate
      })
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(outputPath);

    console.log(`Generated: ${t.dir}/splash.png (${t.width}x${t.height})`);
  }

  console.log('All splash screen drawables generated successfully!');
}

generate().catch((err) => {
  console.error('Error generating splash drawables:', err);
  process.exit(1);
});
