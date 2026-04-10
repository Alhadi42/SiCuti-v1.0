// Script to generate PWA icons
// Run: node generate-icons.js
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const iconsDir = path.join(__dirname, 'public', 'icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Background
  const bgGrad = ctx.createLinearGradient(0, 0, size, size);
  bgGrad.addColorStop(0, '#1e293b');
  bgGrad.addColorStop(1, '#0f172a');
  
  const radius = size * 0.18;
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  ctx.fillStyle = bgGrad;
  ctx.fill();

  // Icon gradient
  const iconGrad = ctx.createLinearGradient(0, 0, size, size);
  iconGrad.addColorStop(0, '#3b82f6');
  iconGrad.addColorStop(1, '#8b5cf6');

  const pad = size * 0.2;
  const w = size - pad * 2;
  const h = size * 0.5;
  const top = size * 0.3;

  // Calendar body
  ctx.strokeStyle = iconGrad;
  ctx.lineWidth = size * 0.04;
  ctx.lineJoin = 'round';
  ctx.strokeRect(pad, top, w, h);

  // Calendar header fill
  ctx.fillStyle = iconGrad;
  ctx.fillRect(pad, top, w, size * 0.12);

  // Checkmark
  ctx.beginPath();
  ctx.moveTo(pad + w * 0.25, top + h * 0.5);
  ctx.lineTo(pad + w * 0.45, top + h * 0.75);
  ctx.lineTo(pad + w * 0.75, top + h * 0.25);
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = size * 0.05;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(iconsDir, `icon-${size}x${size}.png`), buffer);
  console.log(`Generated icon-${size}x${size}.png`);
});

console.log('All icons generated!');
