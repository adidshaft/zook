import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const scanTargets = [
  "apps/web/app/dashboard",
  "apps/web/app/desk",
  "apps/web/src/components/dashboard",
  "apps/web/src/components/dashboard-shell.tsx",
  "apps/web/src/components/desk-panel.tsx",
  "apps/web/src/components/notification-composer-panel.tsx",
  "apps/web/messages/dashboard",
];

const bannedCopy = [
  /\bmvp\b/i,
  /\bdefault branch\b/i,
  /\bsample view\b/i,
  /\btest mode\b/i,
  /\bmock\b/i,
  /\bfixture\b/i,
  /\bstub\b/i,
  /\bposture\b/i,
  /\blane\b/i,
  /\bguardrail\b/i,
  /\bsurface\b/i,
  /\bdrilling(?: into)?\b/i,
  /\bread-first\b/i,
  /\brollup\b/i,
  /\bseed this\b/i,
  /\bpersisted\b/i,
  /\bplatform team\b/i,
  /\binternal dashboard\b/i,
];

const checkedAttributes = [
  "aria-label",
  "description",
  "empty",
  "eyebrow",
  "header",
  "label",
  "placeholder",
  "title",
];
const enforceHardcodedEnglish = process.env.CHECK_DASHBOARD_I18N_STRICT === "1";

type CopyHit = {
  file: string;
  line: number;
  text: string;
};

function cleanText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function hasThreeEnglishWords(text: string) {
  const words = text.match(/[A-Za-z][A-Za-z'-]*/g) ?? [];
  return words.length > 2;
}

function isLikelyCssOrImport(text: string) {
  const compact = text.replace(/\s+/g, "");
  return compact.length > 0 && /^[a-z0-9_:/.[\]#%()-]+$/i.test(compact) && /[-:[\]/]/.test(compact);
}

function collectJsonStrings(value: unknown, file: string, hits: CopyHit[], path: string[] = []) {
  if (typeof value === "string") {
    hits.push({ file, line: 1, text: value });
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectJsonStrings(item, file, hits, [...path, String(index)]));
    return;
  }
  if (value && typeof value === "object") {
    Object.entries(value).forEach(([key, item]) =>
      collectJsonStrings(item, file, hits, [...path, key]),
    );
  }
}

function flattenKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }
  return Object.entries(value).flatMap(([key, item]) =>
    flattenKeys(item, prefix ? `${prefix}.${key}` : key),
  );
}

function collectTsxCopy(content: string, file: string) {
  const hits: CopyHit[] = [];

  content.split("\n").forEach((line, index) => {
    const currentLine = index + 1;
    const pieces = line.split(">");
    for (const piece of pieces.slice(1)) {
      const end = piece.indexOf("<");
      if (end >= 0) {
        const text = cleanText(piece.slice(0, end));
        if (text && !/[{}]/.test(text) && /[A-Za-z]/.test(text) && !isLikelyCssOrImport(text)) {
          hits.push({ file, line: currentLine, text });
        }
      }
    }

    for (const attribute of checkedAttributes) {
      for (const prefix of [
        `${attribute}="`,
        `${attribute}={'`,
        `${attribute}={"`,
        `${attribute}={\``,
      ]) {
        let cursor = line.indexOf(prefix);
        while (cursor >= 0) {
          const quote = prefix.at(-1);
          const start = cursor + prefix.length;
          const end = quote ? line.indexOf(quote, start) : -1;
          if (end > start) {
            const text = cleanText(line.slice(start, end));
            if (text && /[A-Za-z]/.test(text) && !isLikelyCssOrImport(text)) {
              hits.push({ file, line: currentLine, text });
            }
          }
          cursor = line.indexOf(prefix, start);
        }
      }
    }
  });

  return hits;
}

const files = execFileSync("rg", ["--files", ...scanTargets], { cwd: root, encoding: "utf8" })
  .split("\n")
  .filter((file) => /\.(tsx|ts|json)$/.test(file));

const bannedFailures: string[] = [];
const hardcodedFailures: string[] = [];
const parityFailures: string[] = [];

const dashboardMessagesDir = join(root, "apps/web/messages/dashboard");
const englishMessages = JSON.parse(readFileSync(join(dashboardMessagesDir, "en.json"), "utf8"));
const hindiMessages = JSON.parse(readFileSync(join(dashboardMessagesDir, "hi.json"), "utf8"));
const englishKeys = new Set(flattenKeys(englishMessages));
const hindiKeys = new Set(flattenKeys(hindiMessages));
for (const key of englishKeys) {
  if (!hindiKeys.has(key)) {
    parityFailures.push(`hi.json missing ${key}`);
  }
}
for (const key of hindiKeys) {
  if (!englishKeys.has(key)) {
    parityFailures.push(`en.json missing ${key}`);
  }
}

for (const file of files) {
  const content = readFileSync(join(root, file), "utf8");
  const copyHits: CopyHit[] = [];

  if (file.endsWith(".json")) {
    collectJsonStrings(JSON.parse(content), file, copyHits);
  } else if (file.endsWith(".tsx")) {
    copyHits.push(...collectTsxCopy(content, file));
  }

  for (const hit of copyHits) {
    if (bannedCopy.some((pattern) => pattern.test(hit.text))) {
      bannedFailures.push(`${hit.file}:${hit.line}: ${hit.text}`);
    }
    if (enforceHardcodedEnglish && file.endsWith(".tsx") && hasThreeEnglishWords(hit.text)) {
      hardcodedFailures.push(`${hit.file}:${hit.line}: ${hit.text}`);
    }
  }
}

if (bannedFailures.length || hardcodedFailures.length || parityFailures.length) {
  if (bannedFailures.length) {
    console.error("User-facing dashboard copy contains internal wording:");
    console.error(bannedFailures.join("\n"));
  }
  if (hardcodedFailures.length) {
    console.error("Dashboard JSX contains hardcoded English copy longer than two words:");
    console.error(hardcodedFailures.join("\n"));
  }
  if (parityFailures.length) {
    console.error("Dashboard i18n catalogues are missing matching keys:");
    console.error(parityFailures.join("\n"));
  }
  process.exit(1);
}

console.log("Dashboard copy guard passed.");
