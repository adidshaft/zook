import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { enTranslations } from "../apps/mobile/src/lib/i18n/en";
import { hiTranslations } from "../apps/mobile/src/lib/i18n/hi";

const root = process.cwd();
const hardcodedAllowlistPath = join(root, "scripts/audit-i18n-allowlist.json");
const minimumHindiCoverage = 0.95;
const jsxLiteralRoots = [
  join(root, "apps/mobile/app"),
  join(root, "apps/mobile/src/features"),
];
const formattingLiteralFiles = [join(root, "apps/mobile/src/lib/formatting.ts")];
const jsxLiteralPropNames = new Set(["title", "label", "placeholder"]);

function difference(left: Set<string>, right: Set<string>) {
  return [...left].filter((key) => !right.has(key)).sort();
}

function listSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) {
        return [];
      }
      return listSourceFiles(path);
    }
    return entry.isFile() && /\.(tsx?)$/.test(entry.name) ? [path] : [];
  });
}

function normalizeLiteralText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function meaningfulWordCount(text: string) {
  const words = normalizeLiteralText(text).match(/[A-Za-z][A-Za-z'’-]*/g) ?? [];
  return words.length;
}

function isMachineCodeLiteral(text: string) {
  return /^[A-Z][A-Z0-9_/-]+$/.test(normalizeLiteralText(text));
}

function allowlistKey(file: string, text: string) {
  return `${relative(root, file)}::${normalizeLiteralText(text)}`;
}

function readHardcodedAllowlist() {
  if (!existsSync(hardcodedAllowlistPath)) {
    return new Set<string>();
  }
  const raw = JSON.parse(readFileSync(hardcodedAllowlistPath, "utf8")) as Array<{
    file: string;
    text: string;
  }>;
  return new Set(raw.map((entry) => `${entry.file}::${normalizeLiteralText(entry.text)}`));
}

function jsxTextFromExpression(expression: ts.Expression) {
  if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
    return expression.text;
  }
  return null;
}

function collectHardcodedJsxLiterals() {
  const allowlist = readHardcodedAllowlist();
  const findings: Array<{ file: string; line: number; text: string; kind: string }> = [];

  for (const file of jsxLiteralRoots.flatMap(listSourceFiles)) {
    const text = readFileSync(file, "utf8");
    const fileSource = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

    function addFinding(node: ts.Node, rawText: string, kind: string) {
      const normalized = normalizeLiteralText(rawText);
      if (meaningfulWordCount(normalized) <= 2) {
        return;
      }
      if (isMachineCodeLiteral(normalized)) {
        return;
      }
      if (allowlist.has(allowlistKey(file, normalized))) {
        return;
      }
      const position = fileSource.getLineAndCharacterOfPosition(node.getStart(fileSource));
      findings.push({
        file: relative(root, file),
        line: position.line + 1,
        text: normalized,
        kind,
      });
    }

    function visit(node: ts.Node) {
      if (ts.isJsxText(node)) {
        addFinding(node, node.getText(fileSource), "jsx-text");
      } else if (ts.isJsxExpression(node) && node.expression) {
        const expressionText = jsxTextFromExpression(node.expression);
        if (expressionText) {
          addFinding(node, expressionText, "jsx-expression");
        }
      } else if (ts.isJsxAttribute(node) && jsxLiteralPropNames.has(node.name.text)) {
        const initializer = node.initializer;
        if (initializer && ts.isStringLiteral(initializer)) {
          addFinding(node, initializer.text, `prop:${node.name.text}`);
        } else if (initializer && ts.isJsxExpression(initializer) && initializer.expression) {
          const expressionText = jsxTextFromExpression(initializer.expression);
          if (expressionText) {
            addFinding(node, expressionText, `prop:${node.name.text}`);
          }
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(fileSource);
  }

  return findings.sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line);
}

function collectFormattingLiterals() {
  const allowlist = readHardcodedAllowlist();
  const findings: Array<{ file: string; line: number; text: string; kind: string }> = [];

  for (const file of formattingLiteralFiles) {
    const text = readFileSync(file, "utf8");
    const fileSource = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

    function addFinding(node: ts.Node, rawText: string) {
      const normalized = normalizeLiteralText(rawText);
      if (meaningfulWordCount(normalized) <= 2) {
        return;
      }
      if (isMachineCodeLiteral(normalized)) {
        return;
      }
      if (allowlist.has(allowlistKey(file, normalized))) {
        return;
      }
      const position = fileSource.getLineAndCharacterOfPosition(node.getStart(fileSource));
      findings.push({
        file: relative(root, file),
        line: position.line + 1,
        text: normalized,
        kind: "formatting-literal",
      });
    }

    function visit(node: ts.Node) {
      if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
        addFinding(node, node.text);
      }
      ts.forEachChild(node, visit);
    }

    visit(fileSource);
  }

  return findings.sort((left, right) => left.file.localeCompare(right.file) || left.line - right.line);
}

const englishKeys = new Set(Object.keys(enTranslations));
const hindiKeys = new Set(Object.keys(hiTranslations));
const declaredKeys = englishKeys;
const missingEnglish = difference(declaredKeys, englishKeys);
const missingHindi = difference(declaredKeys, hindiKeys);
const extraEnglish = difference(englishKeys, declaredKeys);
const extraHindi = difference(hindiKeys, declaredKeys);
const hindiCoverage = declaredKeys.size ? (declaredKeys.size - missingHindi.length) / declaredKeys.size : 1;

const failures: string[] = [];
if (missingEnglish.length) {
  failures.push(`English catalog is missing ${missingEnglish.length} keys:\n${missingEnglish.join("\n")}`);
}
if (missingHindi.length) {
  failures.push(`Hindi catalog is missing ${missingHindi.length} keys:\n${missingHindi.join("\n")}`);
}
if (extraEnglish.length) {
  failures.push(`English catalog has ${extraEnglish.length} keys not declared in TranslationKey:\n${extraEnglish.join("\n")}`);
}
if (extraHindi.length) {
  failures.push(`Hindi catalog has ${extraHindi.length} keys not declared in TranslationKey:\n${extraHindi.join("\n")}`);
}
if (hindiCoverage < minimumHindiCoverage) {
  failures.push(
    `Hindi coverage is ${(hindiCoverage * 100).toFixed(1)}%; required ${(minimumHindiCoverage * 100).toFixed(0)}%.`,
  );
}

const hardcodedJsxLiterals = collectHardcodedJsxLiterals();
const formattingLiterals = collectFormattingLiterals();
if (hardcodedJsxLiterals.length) {
  failures.push(
    [
      `Mobile JSX has ${hardcodedJsxLiterals.length} hardcoded English literal(s) with more than two words. Add i18n keys or allow intentional literals in scripts/audit-i18n-allowlist.json:`,
      ...hardcodedJsxLiterals.map(
        (finding) => `${finding.file}:${finding.line} [${finding.kind}] ${finding.text}`,
      ),
    ].join("\n"),
  );
}
if (formattingLiterals.length) {
  failures.push(
    [
      `Mobile formatting helpers have ${formattingLiterals.length} hardcoded English literal(s) with more than two words. Add i18n labels at call sites or allow intentional compatibility defaults in scripts/audit-i18n-allowlist.json:`,
      ...formattingLiterals.map(
        (finding) => `${finding.file}:${finding.line} [${finding.kind}] ${finding.text}`,
      ),
    ].join("\n"),
  );
}

if (failures.length) {
  console.error(failures.join("\n\n"));
  process.exit(1);
}

console.log(
  `Mobile i18n audit passed: ${declaredKeys.size} keys, Hindi coverage ${(hindiCoverage * 100).toFixed(1)}%.`,
);
