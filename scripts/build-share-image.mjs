import sharp from 'sharp';

const photo = await sharp('client/public/hero-meat.webp').resize(540, 630, { fit: 'cover' }).toBuffer();
const logo = await sharp('client/public/icons/icon-512.png').resize(160, 160, { fit: 'inside' }).toBuffer();
const type = Buffer.from(`<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg">
  <rect width="16" height="630" fill="#e4002b"/>
  <text x="62" y="308" fill="#161616" font-family="Arial,sans-serif" font-size="66" font-weight="900">MEAT MALL</text>
  <text x="64" y="382" fill="#e4002b" font-family="Arial,sans-serif" font-size="43" font-weight="700">БНСУ махны дэлгүүр</text>
  <text x="64" y="454" fill="#555" font-family="Arial,sans-serif" font-size="26">Шинэхэн мах · Онлайн захиалга</text>
  <text x="64" y="558" fill="#777" font-family="Arial,sans-serif" font-size="24">meatmall.pages.dev</text>
</svg>`);
await sharp({ create: { width: 1200, height: 630, channels: 3, background: '#fff8f4' } })
  .composite([{ input: photo, left: 660, top: 0 }, { input: logo, left: 62, top: 40 }, { input: type }])
  .jpeg({ quality: 88, mozjpeg: true }).toFile('client/public/share-meatmall.jpg');
console.log('Created 1200×630 share-meatmall.jpg');
