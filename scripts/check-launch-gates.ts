import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { rootDir } from "./shared";

type GateFailure = {
  file: string;
  line: number;
  message: string;
};

const skippedDirs = new Set([".git", ".turbo", "node_modules", "coverage", "dist", "build", "ios"]);
const textFilePattern = /\.(cjs|cts|js|jsx|mjs|mts|ts|tsx)$/;
const jsxFilePattern = /\.(jsx|tsx)$/;
const bannedMarkerWords = [
  ["T", "O", "D", "O"].join(""),
  ["F", "I", "X", "M", "E"].join(""),
  ["C", "O", "D", "E", "X"].join(""),
  ["X", "X", "X"].join("")
];
const bannedMarkerPattern = new RegExp(`\\b(${bannedMarkerWords.join("|")})\\b`);
const loadingEllipsisPattern = /\bLoading(?:\.\.\.|\u2026)/;

function walk(dir: string, files: string[] = []) {
  for (const entry of readdirSync(dir)) {
    if (skippedDirs.has(entry) || entry.startsWith(".next")) {
      continue;
    }

    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      walk(path, files);
    } else if (textFilePattern.test(entry)) {
      files.push(path);
    }
  }

  return files;
}

function checkLaunchScreenshotRoutes(files: string[]): GateFailure[] {
  return files.flatMap((file) => {
    const rel = relativeFile(file);
    if (!rel.endsWith("walkthrough.spec.ts") && !rel.includes(".maestro/flows/")) {
      return [];
    }

    const source = readFileSync(file, "utf8");
    const failures: GateFailure[] = [];
    const routePatterns = [
      { pattern: /path:\s*["'`]\/checkout\/mock\//g, message: "Do not include mock checkout in default launch/public screenshot routes." },
      { pattern: /["'`]\/checkout\/mock\//g, message: "Mock checkout routes require an explicit debug-only flow, not launch screenshots." },
      { pattern: /\b000000\b/g, message: "Do not expose fixed dev OTP values in screenshot automation." },
      { pattern: /TEST MODE|No real payment|Open debugbar|Downloading 100%|React has detected/g, message: "Remove debug/runtime text from launch screenshot automation." },
    ];

    for (const { pattern, message } of routePatterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(source))) {
        failures.push({
          file: rel,
          line: lineNumber(source, match.index),
          message,
        });
      }
    }

    return failures;
  });
}

function checkPublicLaunchLeakage(files: string[]): GateFailure[] {
  return files.flatMap((file) => {
    const rel = relativeFile(file);
    const isPublicAuthSurface =
      rel === "apps/web/src/components/login-panel.tsx" ||
      rel === "apps/mobile/src/features/route-surfaces/login-route.tsx" ||
      rel.startsWith("apps/web/app/login/") ||
      rel.startsWith("apps/web/app/join/");
    if (!isPublicAuthSurface) {
      return [];
    }

    const source = readFileSync(file, "utf8");
    const failures: GateFailure[] = [];
    const blockedPatterns = [
      { pattern: /\b000000\b/g, message: "Fixed OTP values must not be visible from public auth surfaces." },
      { pattern: /TEST MODE|No real payment|testCode|devBannerCode|Open debugbar|React has detected/g, message: "Debug/test copy must not be visible from public launch auth surfaces." },
      { pattern: /href=\{?`?["']?\/checkout\/mock\//g, message: "Public launch paths must not link directly to mock checkout." },
    ];

    for (const { pattern, message } of blockedPatterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.exec(source))) {
        failures.push({
          file: rel,
          line: lineNumber(source, match.index),
          message,
        });
      }
    }

    return failures;
  });
}

function relativeFile(file: string) {
  return relative(rootDir, file);
}

function lineNumber(source: string, index: number) {
  return source.slice(0, index).split("\n").length;
}

function checkBannedMarkers(files: string[]): GateFailure[] {
  return files.flatMap((file) => {
    if (relativeFile(file) === "scripts/check-launch-gates.ts") {
      return [];
    }

    const source = readFileSync(file, "utf8");
    return source.split("\n").flatMap((line, index) =>
      bannedMarkerPattern.test(line)
        ? [
            {
              file: relativeFile(file),
              line: index + 1,
              message: "Remove deferred-work markers from committed app/package/script code."
            }
          ]
        : []
    );
  });
}

function checkMutationToasts(files: string[]): GateFailure[] {
  return files.flatMap((file) => {
    const source = readFileSync(file, "utf8");
    if (!source.includes("mutateAsync(")) {
      return [];
    }

    const chunks = source.split(/(?=async function |const [A-Za-z0-9_]+ = async|\n  async [A-Za-z0-9_]+\()/g);
    let offset = 0;
    const failures: GateFailure[] = [];

    for (const chunk of chunks) {
      const chunkStart = offset;
      offset += chunk.length;

      if (!chunk.includes("mutateAsync(")) {
        continue;
      }

      const hasToast = /\b(showToast|toast)\s*\(/.test(chunk);
      const hasErrorHandling = /\bcatch\b/.test(chunk) || /\bonError\b/.test(chunk);

      if (hasToast && hasErrorHandling) {
        continue;
      }

      const mutateIndex = chunkStart + chunk.indexOf("mutateAsync(");
      failures.push({
        file: relativeFile(file),
        line: lineNumber(source, mutateIndex),
        message: "Pair every mutateAsync call with success/error toast handling."
      });
    }

    return failures;
  });
}

function checkLoadingText(files: string[]): GateFailure[] {
  return files.flatMap((file) => {
    const rel = relativeFile(file);
    if (!jsxFilePattern.test(file) || (!rel.startsWith("apps/web/app/") && !rel.startsWith("apps/mobile/app/"))) {
      return [];
    }

    return readFileSync(file, "utf8")
      .split("\n")
      .flatMap((line, index) =>
        loadingEllipsisPattern.test(line)
          ? [
              {
                file: rel,
                line: index + 1,
                message: "Use a skeleton or contextual loading state instead of literal Loading... text."
              }
            ]
          : []
      );
  });
}

function checkBusyButtons(files: string[]): GateFailure[] {
  return files.flatMap((file) => {
    const rel = relativeFile(file);
    if (!jsxFilePattern.test(file) || !rel.startsWith("apps/web/src/components/")) {
      return [];
    }
    const source = readFileSync(file, "utf8");
    const failures: GateFailure[] = [];
    const buttonPattern = /<button\b[\s\S]*?<\/button>/g;
    let match: RegExpExecArray | null;
    while ((match = buttonPattern.exec(source))) {
      const block = match[0];
      if (!block.includes("formBusy")) {
        continue;
      }
      if (/\bdisabled=/.test(block)) {
        continue;
      }
      failures.push({
        file: rel,
        line: lineNumber(source, match.index),
        message: "Buttons tied to formBusy must expose disabled state while the mutation is in flight."
      });
    }
    return failures;
  });
}

const scopedFiles = ["apps", "packages", "scripts"].flatMap((dir) => walk(join(rootDir, dir)));
const mutationFiles = ["apps/mobile", "apps/web"].flatMap((dir) => walk(join(rootDir, dir)));
const loadingFiles = ["apps/mobile/app", "apps/web/app"].flatMap((dir) => walk(join(rootDir, dir)));

const failures = [
  ...checkBannedMarkers(scopedFiles),
  ...checkMutationToasts(mutationFiles),
  ...checkLoadingText(loadingFiles),
  ...checkBusyButtons(mutationFiles),
  ...checkLaunchScreenshotRoutes(scopedFiles),
  ...checkPublicLaunchLeakage(scopedFiles)
];

if (failures.length) {
  console.error("Launch gates failed:");
  for (const failure of failures) {
    console.error(`${failure.file}:${failure.line} - ${failure.message}`);
  }
  process.exit(1);
}

console.log("Launch gates passed.");
