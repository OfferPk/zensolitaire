/**
 * Generates valid PNG icons and SVG favicon for ZenSolitaire using Node built-in zlib & fs.
 * Zero external dependencies.
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function crc32(buf) {
  let table = new Int32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (-306674912 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

function makePng(width, height, getPixelRgba) {
  const bytesPerPixel = 4;
  const scanlineLength = width * bytesPerPixel;
  const rawData = Buffer.alloc((scanlineLength + 1) * height);

  for (let y = 0; y < height; y++) {
    const scanlineOffset = y * (scanlineLength + 1);
    rawData[scanlineOffset] = 0;
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = getPixelRgba(x, y, width, height);
      const pixelOffset = scanlineOffset + 1 + x * bytesPerPixel;
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const idatData = zlib.deflateSync(rawData);

  function makeChunk(type, data) {
    const typeBuf = Buffer.from(type, 'ascii');
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const body = Buffer.concat([typeBuf, data]);
    const crcVal = crc32(body);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([lenBuf, body, crcBuf]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = makeChunk('IHDR', ihdr);
  const idatChunk = makeChunk('IDAT', idatData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function renderIcon(x, y, w, h) {
  const nx = (x - w / 2) / (w / 2);
  const ny = (y - h / 2) / (h / 2);

  // Rounded outer rect
  if (Math.abs(nx) > 0.92 || Math.abs(ny) > 0.92) {
    return [0, 0, 0, 0];
  }

  // Base background: rich green felt (#064e3b to #022c22)
  const grad = (ny + 1) * 0.5;
  let bgR = Math.round(6 - grad * 4);
  let bgG = Math.round(78 - grad * 34);
  let bgB = Math.round(59 - grad * 25);

  // Playing card shape tilted in center
  // Center Ace of Spades card
  const inCardX = Math.abs(nx) < 0.55;
  const inCardY = Math.abs(ny) < 0.72;

  if (inCardX && inCardY) {
    // Card border
    if (Math.abs(nx) > 0.52 || Math.abs(ny) > 0.69) {
      return [203, 213, 225, 255]; // card border silver
    }
    // Card face white
    const distFromCenter = Math.sqrt(nx * nx + ny * ny);
    if (distFromCenter < 0.28) {
      // Spade symbol approximation in black
      return [15, 23, 42, 255]; // black spade core
    }
    return [255, 255, 255, 255]; // white card face
  }

  // Border gold trim
  const borderDist = Math.max(Math.abs(nx), Math.abs(ny));
  if (borderDist >= 0.85 && borderDist <= 0.91) {
    return [245, 158, 11, 200];
  }

  return [bgR, bgG, bgB, 255];
}

const targetDir = path.join(__dirname, '..', 'src');
if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

// Write PNGs
const png192 = makePng(192, 192, renderIcon);
fs.writeFileSync(path.join(targetDir, 'icon-192.png'), png192);

const png512 = makePng(512, 512, renderIcon);
fs.writeFileSync(path.join(targetDir, 'icon-512.png'), png512);

console.log('ZenSolitaire icons generated successfully: icon-192.png, icon-512.png');
