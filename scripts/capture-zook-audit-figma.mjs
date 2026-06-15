import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

import { chromium } from "@playwright/test";

const execFile = promisify(execFileCallback);

const BUNDLE_URL =
  "https://api.anthropic.com/v1/design/h/qmziq9ufGIIvV56G_kTlRQ?open_file=Zook+Audit.html";
const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUTPUT_DIR = path.join(REPO_ROOT, "artifacts", "figma-audit");
const LOCAL_SOURCE_DIR = path.join(REPO_ROOT, "artifacts", "figma-audit-source");

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&lt;/g, "less")
    .replace(/&gt;/g, "more")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function parseAuditStructure(html) {
  const sections = [];
  const sectionRe =
    /<DCSection id="([^"]+)" title="([^"]+)" subtitle="([^"]*)">([\s\S]*?)<\/DCSection>/g;
  let sectionMatch;
  while ((sectionMatch = sectionRe.exec(html))) {
    const [, id, title, subtitle, body] = sectionMatch;
    const artboards = [];
    const artboardRe =
      /<DCArtboard id="([^"]+)" label="([^"]+)" width={(\d+)} height={(\d+)}>/g;
    let artboardMatch;
    while ((artboardMatch = artboardRe.exec(body))) {
      const [, artboardId, label, width, height] = artboardMatch;
      artboards.push({
        id: artboardId,
        label,
        width: Number(width),
        height: Number(height),
        image: `${slugify(artboardId)}.png`,
      });
    }
    sections.push({ id, title, subtitle, artboards });
  }
  return sections;
}

async function downloadBundle(tempRoot) {
  const bundlePath = path.join(tempRoot, "bundle.bin");
  const tarPath = path.join(tempRoot, "bundle.tar");
  await execFile("curl", ["-L", BUNDLE_URL, "-o", bundlePath]);
  await execFile("python3", [
    "-c",
    [
      "import gzip, pathlib",
      `src = pathlib.Path(${JSON.stringify(bundlePath)})`,
      `dst = pathlib.Path(${JSON.stringify(tarPath)})`,
      "dst.write_bytes(gzip.decompress(src.read_bytes()))",
    ].join("; "),
  ]);
  await execFile("tar", ["-xf", tarPath, "-C", tempRoot]);
  return path.join(tempRoot, "zook", "project");
}

async function captureArtboards(projectDir, sections) {
  const standalonePath = path.join(projectDir, "Zook Audit (standalone).html");
  const url = `file://${standalonePath.replace(/ /g, "%20")}`;
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1800, height: 1400 },
    deviceScaleFactor: 2,
  });

  await page.goto(url, { waitUntil: "domcontentloaded" });
  await page.waitForSelector('[data-dc-slot="exec-header"] .dc-card', { timeout: 20000 });

  for (const section of sections) {
    for (const artboard of section.artboards) {
      const locator = page.locator(`[data-dc-slot="${artboard.id}"] .dc-card`);
      await locator.screenshot({
        path: path.join(OUTPUT_DIR, artboard.image),
        type: "png",
      });
    }
  }

  await browser.close();
}

async function main() {
  const tempRoot = await mkdtemp(path.join(tmpdir(), "zook-audit-figma-"));
  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(OUTPUT_DIR, { recursive: true });

  try {
    const projectDir = await readFile(path.join(LOCAL_SOURCE_DIR, "Zook Audit.html"), "utf8")
      .then(() => LOCAL_SOURCE_DIR)
      .catch(() => downloadBundle(tempRoot));
    const auditHtml = await readFile(path.join(projectDir, "Zook Audit.html"), "utf8");
    const sections = parseAuditStructure(auditHtml);
    await captureArtboards(projectDir, sections);

    const manifest = {
      generatedAt: new Date().toISOString(),
      title: "Zook Audit",
      source: "Anthropic design handoff bundle",
      sections,
    };
    await writeFile(
      path.join(OUTPUT_DIR, "manifest.json"),
      `${JSON.stringify(manifest, null, 2)}\n`,
      "utf8",
    );
    process.stdout.write(`${path.join(OUTPUT_DIR, "manifest.json")}\n`);
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
