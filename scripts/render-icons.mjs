/**
 * Render PWA icons from icon.svg using pure Node (no sharp dependency).
 * Draws a simplified suitcase mark onto PNG buffers.
 */
import { writeFileSync, mkdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { deflateSync } from 'zlib';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '..', 'assets', 'icons');
mkdirSync(outDir, { recursive: true });

// Minimal PNG encoder (RGBA)
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type);
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function setPx(data, w, x, y, r, g, b, a = 255) {
  if (x < 0 || y < 0 || x >= w || y >= w) return;
  const i = (y * w + x) * 4;
  // alpha composite over existing
  const ea = data[i + 3] / 255;
  const na = a / 255;
  const outA = na + ea * (1 - na);
  if (outA <= 0) return;
  data[i] = Math.round((r * na + data[i] * ea * (1 - na)) / outA);
  data[i + 1] = Math.round((g * na + data[i + 1] * ea * (1 - na)) / outA);
  data[i + 2] = Math.round((b * na + data[i + 2] * ea * (1 - na)) / outA);
  data[i + 3] = Math.round(outA * 255);
}

function fillRect(data, w, x0, y0, x1, y1, color, radius = 0) {
  const [r, g, b] = hexToRgb(color);
  const minX = Math.floor(x0);
  const maxX = Math.ceil(x1);
  const minY = Math.floor(y0);
  const maxY = Math.ceil(y1);
  for (let y = minY; y < maxY; y++) {
    for (let x = minX; x < maxX; x++) {
      let inside = true;
      if (radius > 0) {
        const cx = x + 0.5;
        const cy = y + 0.5;
        const left = x0 + radius;
        const right = x1 - radius;
        const top = y0 + radius;
        const bottom = y1 - radius;
        let dx = 0;
        let dy = 0;
        if (cx < left) dx = left - cx;
        else if (cx > right) dx = cx - right;
        if (cy < top) dy = top - cy;
        else if (cy > bottom) dy = cy - bottom;
        if (dx * dx + dy * dy > radius * radius) inside = false;
      }
      if (inside) setPx(data, w, x, y, r, g, b, 255);
    }
  }
}

function strokeArc(data, w, cx, cy, rad, color, thickness, startAng, endAng) {
  const [r, g, b] = hexToRgb(color);
  const steps = Math.ceil(rad * 8);
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const ang = lerp(startAng, endAng, t);
    const x = cx + Math.cos(ang) * rad;
    const y = cy + Math.sin(ang) * rad;
    const half = thickness / 2;
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        if (dx * dx + dy * dy <= half * half) {
          setPx(data, w, Math.round(x + dx), Math.round(y + dy), r, g, b, 255);
        }
      }
    }
  }
}

function fillCircle(data, w, cx, cy, rad, color) {
  const [r, g, b] = hexToRgb(color);
  const minX = Math.floor(cx - rad);
  const maxX = Math.ceil(cx + rad);
  const minY = Math.floor(cy - rad);
  const maxY = Math.ceil(cy + rad);
  for (let y = minY; y < maxY; y++) {
    for (let x = minX; x < maxX; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cy;
      if (dx * dx + dy * dy <= rad * rad) setPx(data, w, x, y, r, g, b, 255);
    }
  }
}

function render(size) {
  const data = Buffer.alloc(size * size * 4);
  // full-bleed background (maskable-safe)
  fillRect(data, size, 0, 0, size, size, '#F4EFE6', 0);

  const s = size / 512;
  // suitcase body
  fillRect(data, size, 96 * s, 148 * s, 416 * s, 396 * s, '#C45C3E', 36 * s);
  // inner panel
  fillRect(data, size, 128 * s, 180 * s, 384 * s, 364 * s, '#FBF8F2', 24 * s);
  // handle (arc)
  strokeArc(data, size, 256 * s, 148 * s, 80 * s, '#1C1915', 28 * s, Math.PI, 0);
  // latch
  fillCircle(data, size, 256 * s, 272 * s, 28 * s, '#4F6354');
  fillRect(data, size, 248 * s, 292 * s, 264 * s, 328 * s, '#4F6354', 8 * s);

  return encodePNG(size, size, data);
}

for (const size of [192, 512, 180]) {
  const png = render(size);
  const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
  writeFileSync(join(outDir, name), png);
  console.log('Wrote', name, png.length, 'bytes');
}
