import { inflateSync } from "node:zlib";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const minStddev = Number(process.env.SCREENSHOT_MIN_STDDEV ?? 6);
const target = resolve(process.cwd(), process.argv[2] ?? "artifacts/app-store-screenshots-20260522");

type PngInfo = {
  bitDepth: number;
  colorType: number;
  data: Buffer;
  height: number;
  width: number;
};

function listPngs(path: string): string[] {
  const stats = statSync(path);
  if (stats.isFile()) return path.endsWith(".png") ? [path] : [];
  return readdirSync(path)
    .flatMap((entry) => {
      const child = join(path, entry);
      const childStats = statSync(child);
      if (childStats.isDirectory()) return listPngs(child);
      return child.endsWith(".png") ? [child] : [];
    })
    .sort();
}

function parsePng(path: string): PngInfo {
  const file = readFileSync(path);
  if (!file.subarray(0, 8).equals(signature)) {
    throw new Error(`${path} is not a PNG file.`);
  }
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idat: Buffer[] = [];
  while (offset < file.length) {
    const length = file.readUInt32BE(offset);
    const type = file.subarray(offset + 4, offset + 8).toString("ascii");
    const data = file.subarray(offset + 8, offset + 8 + length);
    offset += 12 + length;
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
  }
  return { bitDepth, colorType, data: inflateSync(Buffer.concat(idat)), height, width };
}

function bytesPerPixel(colorType: number) {
  if (colorType === 2) return 3;
  if (colorType === 6) return 4;
  throw new Error(`Unsupported PNG color type ${colorType}; expected RGB or RGBA.`);
}

function unfilter(info: PngInfo) {
  if (info.bitDepth !== 8) {
    throw new Error(`Unsupported PNG bit depth ${info.bitDepth}; expected 8.`);
  }
  const bpp = bytesPerPixel(info.colorType);
  const stride = info.width * bpp;
  const output = Buffer.alloc(stride * info.height);
  let inputOffset = 0;
  for (let y = 0; y < info.height; y += 1) {
    const filter = info.data[inputOffset];
    inputOffset += 1;
    const rowOffset = y * stride;
    for (let x = 0; x < stride; x += 1) {
      const raw = info.data[inputOffset + x];
      const left = x >= bpp ? output[rowOffset + x - bpp] : 0;
      const up = y > 0 ? output[rowOffset - stride + x] : 0;
      const upLeft = y > 0 && x >= bpp ? output[rowOffset - stride + x - bpp] : 0;
      let value = raw;
      if (filter === 1) value = raw + left;
      else if (filter === 2) value = raw + up;
      else if (filter === 3) value = raw + Math.floor((left + up) / 2);
      else if (filter === 4) {
        const p = left + up - upLeft;
        const pa = Math.abs(p - left);
        const pb = Math.abs(p - up);
        const pc = Math.abs(p - upLeft);
        value = raw + (pa <= pb && pa <= pc ? left : pb <= pc ? up : upLeft);
      } else if (filter !== 0) {
        throw new Error(`Unsupported PNG filter ${filter}.`);
      }
      output[rowOffset + x] = value & 0xff;
    }
    inputOffset += stride;
  }
  return output;
}

function rgbStddev(path: string) {
  const info = parsePng(path);
  const pixels = unfilter(info);
  const bpp = bytesPerPixel(info.colorType);
  let count = 0;
  let sum = 0;
  let sumSquares = 0;
  for (let index = 0; index < pixels.length; index += bpp) {
    for (let channel = 0; channel < 3; channel += 1) {
      const value = pixels[index + channel];
      count += 1;
      sum += value;
      sumSquares += value * value;
    }
  }
  const mean = sum / count;
  return Math.sqrt(sumSquares / count - mean * mean);
}

const files = listPngs(target);
if (!files.length) {
  throw new Error(`No PNG screenshots found under ${target}.`);
}

const failures: string[] = [];
for (const file of files) {
  const stddev = rgbStddev(file);
  const label = file.replace(`${process.cwd()}/`, "");
  console.log(`${stddev.toFixed(2)}\t${label}`);
  if (stddev < minStddev) {
    failures.push(`${label} (${stddev.toFixed(2)})`);
  }
}

if (failures.length) {
  throw new Error(
    `Screenshot variance below ${minStddev}; likely blank frames:\n${failures.join("\n")}`,
  );
}
