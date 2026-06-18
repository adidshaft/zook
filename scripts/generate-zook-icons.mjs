import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { deflateSync } from "node:zlib";
import { execSync } from "node:child_process";

const ROOT = new URL("..", import.meta.url).pathname;

const COLORS = {
  background: [7, 9, 8, 255],
  accent: [185, 244, 85, 255],
  white: [255, 255, 255, 255],
  cyan: [125, 211, 252, 255]
};

const Z_SEGMENTS = [
  {
    alpha: 1,
    points: [
      [270, 308],
      [850, 308],
      [770, 430],
      [190, 430]
    ]
  },
  {
    alpha: 0.82,
    points: [
      [580, 446],
      [720, 446],
      [492, 706],
      [350, 706]
    ]
  },
  {
    alpha: 0.74,
    points: [
      [270, 720],
      [830, 720],
      [745, 838],
      [185, 838]
    ]
  }
];

const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (let i = 0; i < buffer.length; i += 1) {
    crc = CRC_TABLE[(crc ^ buffer[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const name = Buffer.from(type);
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  crc.writeUInt32BE(crc32(Buffer.concat([name, data])));
  return Buffer.concat([length, name, data, crc]);
}

function pngEncode(width, height, pixels) {
  const header = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);

  for (let y = 0; y < height; y += 1) {
    raw[y * (stride + 1)] = 0;
    pixels.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
  }

  return Buffer.concat([
    header,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

function blendPixel(pixels, width, x, y, color, alpha = 1) {
  if (x < 0 || y < 0 || x >= width || y >= pixels.length / (width * 4)) {
    return;
  }

  const index = (y * width + x) * 4;
  const sourceAlpha = (color[3] / 255) * alpha;
  const destAlpha = pixels[index + 3] / 255;
  const outAlpha = sourceAlpha + destAlpha * (1 - sourceAlpha);

  if (outAlpha <= 0) {
    return;
  }

  pixels[index] = Math.round((color[0] * sourceAlpha + pixels[index] * destAlpha * (1 - sourceAlpha)) / outAlpha);
  pixels[index + 1] = Math.round((color[1] * sourceAlpha + pixels[index + 1] * destAlpha * (1 - sourceAlpha)) / outAlpha);
  pixels[index + 2] = Math.round((color[2] * sourceAlpha + pixels[index + 2] * destAlpha * (1 - sourceAlpha)) / outAlpha);
  pixels[index + 3] = Math.round(outAlpha * 255);
}

function fill(pixels, color) {
  for (let i = 0; i < pixels.length; i += 4) {
    pixels[i] = color[0];
    pixels[i + 1] = color[1];
    pixels[i + 2] = color[2];
    pixels[i + 3] = color[3];
  }
}

function inPolygon(x, y, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i, i += 1) {
    const xi = points[i][0];
    const yi = points[i][1];
    const xj = points[j][0];
    const yj = points[j][1];
    const intersects = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersects) {
      inside = !inside;
    }
  }
  return inside;
}

function inRoundedRect(x, y, left, top, width, height, radius) {
  const right = left + width;
  const bottom = top + height;
  const nearestX = Math.max(left + radius, Math.min(x, right - radius));
  const nearestY = Math.max(top + radius, Math.min(y, bottom - radius));

  if (x >= left + radius && x <= right - radius && y >= top && y <= bottom) return true;
  if (x >= left && x <= right && y >= top + radius && y <= bottom - radius) return true;

  const dx = x - nearestX;
  const dy = y - nearestY;
  return dx * dx + dy * dy <= radius * radius;
}

function drawGlow(pixels, width, height, cx, cy, rx, ry, color, alpha) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const dx = (x - cx) / rx;
      const dy = (y - cy) / ry;
      const falloff = Math.max(0, 1 - (dx * dx + dy * dy));
      if (falloff > 0) {
        blendPixel(pixels, width, x, y, color, alpha * falloff * falloff);
      }
    }
  }
}

function drawRoundedRect(pixels, width, height, rect, color, alpha) {
  const samples = [
    [0.25, 0.25],
    [0.75, 0.25],
    [0.25, 0.75],
    [0.75, 0.75]
  ];

  for (let y = Math.max(0, Math.floor(rect.y)); y < Math.min(height, Math.ceil(rect.y + rect.h)); y += 1) {
    for (let x = Math.max(0, Math.floor(rect.x)); x < Math.min(width, Math.ceil(rect.x + rect.w)); x += 1) {
      let coverage = 0;
      for (const [sx, sy] of samples) {
        if (inRoundedRect(x + sx, y + sy, rect.x, rect.y, rect.w, rect.h, rect.r)) coverage += 0.25;
      }
      if (coverage > 0) {
        blendPixel(pixels, width, x, y, color, alpha * coverage);
      }
    }
  }
}

function drawPolygon(pixels, width, height, points, color, alpha) {
  const minX = Math.max(0, Math.floor(Math.min(...points.map(([x]) => x))));
  const maxX = Math.min(width, Math.ceil(Math.max(...points.map(([x]) => x))));
  const minY = Math.max(0, Math.floor(Math.min(...points.map(([, y]) => y))));
  const maxY = Math.min(height, Math.ceil(Math.max(...points.map(([, y]) => y))));
  const samples = [
    [0.2, 0.2],
    [0.8, 0.2],
    [0.2, 0.8],
    [0.8, 0.8]
  ];

  for (let y = minY; y < maxY; y += 1) {
    for (let x = minX; x < maxX; x += 1) {
      let coverage = 0;
      for (const [sx, sy] of samples) {
        if (inPolygon(x + sx, y + sy, points)) coverage += 0.25;
      }
      if (coverage > 0) {
        blendPixel(pixels, width, x, y, color, alpha * coverage);
      }
    }
  }
}

function drawZMark(pixels, width, height, options = {}) {
  const maxDim = options.maxDimension ?? width * 0.65;
  const scale = maxDim / 665;
  const sourceBounds = { x: 185, y: 308, w: 665, h: 530 };
  const offsetX = width / 2 - (sourceBounds.x + sourceBounds.w / 2) * scale;
  const offsetY = height / 2 - (sourceBounds.y + sourceBounds.h / 2) * scale;
  const color = options.monochrome ? COLORS.white : COLORS.accent;

  for (const segment of Z_SEGMENTS) {
    const points = segment.points.map(([x, y]) => [x * scale + offsetX, y * scale + offsetY]);
    drawPolygon(pixels, width, height, points, color, options.monochrome ? 1 : segment.alpha);
  }
}

function iconPixels(size, mode) {
  const pixels = Buffer.alloc(size * size * 4);

  if (mode === "foreground" || mode === "monochrome") {
    drawZMark(pixels, size, size, { maxDimension: size * (2 / 3), monochrome: mode === "monochrome" });
    return pixels;
  }

  fill(pixels, COLORS.background);
  drawGlow(pixels, size, size, size * 0.28, size * 0.25, size * 0.52, size * 0.43, COLORS.accent, 0.12);
  drawGlow(pixels, size, size, size * 0.62, size * 0.48, size * 0.56, size * 0.5, COLORS.white, 0.055);
  drawGlow(pixels, size, size, size * 0.33, size * 0.76, size * 0.34, size * 0.26, COLORS.cyan, 0.04);

  if (mode === "background") {
    return pixels;
  }

  drawZMark(pixels, size, size, { maxDimension: size * 0.65 });
  return pixels;
}

function writePng(relativePath, size, mode = "full") {
  const absolutePath = join(ROOT, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, pngEncode(size, size, iconPixels(size, mode)));
  console.log(`wrote ${relativePath}`);
}

function resizeFromSource(relativePath, size) {
  const absolutePath = join(ROOT, relativePath);
  mkdirSync(dirname(absolutePath), { recursive: true });
  const sourcePath = join(ROOT, "apps/mobile/assets/icons/app-icon-512.png");
  try {
    execSync(`sips -z ${size} ${size} "${sourcePath}" --out "${absolutePath}"`, { stdio: "ignore" });
    console.log(`resized from source to ${relativePath}`);
  } catch (err) {
    console.error(`Failed to resize ${relativePath} using sips:`, err.message);
  }
}

// Android launcher icons are generated programmatically for adaptive/monochrome layout layers
writePng("apps/mobile/assets/icons/ic_launcher_background.png", 432, "background");
writePng("apps/mobile/assets/icons/ic_launcher_foreground.png", 432, "foreground");
writePng("apps/mobile/assets/icons/ic_launcher_monochrome.png", 432, "monochrome");

// All standard app and store branding icons are resized cleanly from the source file using macOS sips
resizeFromSource("apps/mobile/assets/icons/AppIcon-1024.png", 1024);
resizeFromSource("apps/mobile/assets/icons/app-icon-512-fixed.png", 512);
resizeFromSource("apps/mobile/assets/icons/icon-mac-512x512.png", 512);
resizeFromSource("apps/web/public/icons/AppIcon-1024.png", 1024);
resizeFromSource("apps/web/public/icons/icon-512.png", 512);
resizeFromSource("apps/web/public/icons/icon-192.png", 192);
resizeFromSource("apps/web/public/icons/apple-touch-icon.png", 180);
resizeFromSource("apps/web/public/icons/favicon.png", 32);
resizeFromSource("artifacts/play-store-assets-20260522/play-icon-512.png", 512);
resizeFromSource("artifacts/store-assets-play-20260522/app-icon-512.png", 512);
resizeFromSource("artifacts/store-assets-play-20260522/app-icon-512-fixed.png", 512);
