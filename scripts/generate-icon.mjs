#!/usr/bin/env node
import { writeFileSync, mkdirSync, statSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const outDir = resolve(repoRoot, "apps/vscode-extension/media");
const outFile = resolve(outDir, "icon.png");

// 128x128 RGBA icon generator - creates a clean geometric icon
// Design: dark background with a bright stylized abstract 'T' / circuit-like shape
const SIZE = 128;
const pixels = Buffer.alloc(SIZE * SIZE * 4, 0);

function setPixel(x, y, r, g, b, a = 255) {
  if (x < 0 || x >= SIZE || y < 0 || y >= SIZE) return;
  const i = (y * SIZE + x) * 4;
  pixels[i] = r;
  pixels[i + 1] = g;
  pixels[i + 2] = b;
  pixels[i + 3] = a;
}

function fillRect(x0, y0, x1, y1, r, g, b, a = 255, borderRadius = 0) {
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (borderRadius > 0) {
        const dx = Math.min(x - x0, x1 - x);
        const dy = Math.min(y - y0, y1 - y);
        if (dx < borderRadius && dy < borderRadius && dx * dx + dy * dy >= borderRadius * borderRadius) continue;
      }
      setPixel(x, y, r, g, b, a);
    }
  }
}

function fillCircle(cx, cy, radius, r, g, b, a = 255) {
  for (let y = cy - radius; y <= cy + radius; y++) {
    for (let x = cx - radius; x <= cx + radius; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        setPixel(x, y, r, g, b, a);
      }
    }
  }
}

// Background: dark rounded square
fillRect(4, 4, 123, 123, 30, 30, 35, 255, 8);

// Accent circle
fillCircle(64, 50, 36, 0, 180, 255, 255);

// Inner circle (negative space)
fillCircle(64, 50, 24, 30, 30, 35, 255);

// Stylized 'T' abstract shape - horizontal bar
fillRect(38, 38, 90, 44, 255, 255, 255, 255, 2);
// Vertical bar
fillRect(60, 44, 66, 80, 255, 255, 255, 255, 2);

// Small accent dots (nodes)
fillCircle(38, 41, 3, 0, 200, 255, 255);
fillCircle(90, 41, 3, 0, 200, 255, 255);
fillCircle(63, 80, 3, 0, 200, 255, 255);

// Connection dots
fillCircle(63, 38, 2, 200, 230, 255, 255);
fillCircle(63, 44, 2, 200, 230, 255, 255);

// Bottom accent bar
fillRect(54, 82, 72, 86, 0, 180, 255, 200, 1);

// === PNG encoding ===
function createChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const crcData = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = crc32(crcData);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([len, Buffer.from(type, "ascii"), data, crcBuf]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(SIZE, 0);  // width
ihdr.writeUInt32BE(SIZE, 4);  // height
ihdr[8] = 8;  // bit depth
ihdr[9] = 6;  // color type: RGBA
ihdr[10] = 0; // compression
ihdr[11] = 0; // filter
ihdr[12] = 0; // interlace

// Convert RGBA to raw scanlines
const raw = Buffer.alloc(SIZE * (1 + SIZE * 4));
for (let y = 0; y < SIZE; y++) {
  const offset = y * (1 + SIZE * 4);
  raw[offset] = 0; // filter byte: None
  for (let x = 0; x < SIZE; x++) {
    const src = (y * SIZE + x) * 4;
    const dst = offset + 1 + x * 4;
    raw[dst] = pixels[src];
    raw[dst + 1] = pixels[src + 1];
    raw[dst + 2] = pixels[src + 2];
    raw[dst + 3] = pixels[src + 3];
  }
}

const idat = deflateSync(raw);
const iend = Buffer.alloc(0);

mkdirSync(outDir, { recursive: true });
writeFileSync(outFile, Buffer.concat([
  signature,
  createChunk("IHDR", ihdr),
  createChunk("IDAT", idat),
  createChunk("IEND", iend),
]));

const stat = statSync(outFile);
console.log(`Icon generated: ${outFile} (${(128 * 128 * 4 / 1024).toFixed(1)} KB raw, ${stat.size} bytes on disk)`);
