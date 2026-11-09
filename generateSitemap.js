import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseUrl = 'https://crafted-tradenet.ie';

const pages = [
  { url: '/', changefreq: 'daily', priority: '1.0' },
  { url: '/feed', changefreq: 'always', priority: '0.9' },
  { url: '/jobs', changefreq: 'hourly', priority: '0.9' },
  { url: '/marketplace', changefreq: 'hourly', priority: '0.8' },
  { url: '/messages', changefreq: 'weekly', priority: '0.5' },
  { url: '/profile', changefreq: 'weekly', priority: '0.6' },
];

const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${pages
  .map(
    (page) => `  <url>
    <loc>${baseUrl}${page.url}</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>
`;

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

const outputPath = path.join(publicDir, 'sitemap.xml');
fs.writeFileSync(outputPath, sitemapContent, 'utf-8');
console.log('✅ sitemap.xml successfully generated at /public/sitemap.xml');
