import fs from 'fs';
import path from 'path';
import JSZip from 'jszip';
import { generateHostingerFiles } from '../src/services/hostingerPackage';

async function main() {
  console.log('Generating Hostinger deployment package...');
  const files = generateHostingerFiles();
  console.log(`Loaded ${files.length} package files from generateHostingerFiles().`);

  const zip = new JSZip();

  for (const file of files) {
    zip.file(file.path, file.content);
  }

  const content = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  const distDir = path.resolve(process.cwd(), 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  const targetPaths = [
    path.resolve(distDir, 'weonboard_hostinger_deployment.zip'),
    path.resolve(process.cwd(), 'weonboard_hostinger_deployment.zip')
  ];

  for (const p of targetPaths) {
    fs.writeFileSync(p, content);
    const stat = fs.statSync(p);
    console.log(`Saved: ${p} (${(stat.size / 1024).toFixed(2)} KB)`);
  }

  console.log('Hostinger ZIP package generation complete!');
}

main().catch((err) => {
  console.error('Failed to generate Hostinger deployment ZIP:', err);
  process.exit(1);
});
