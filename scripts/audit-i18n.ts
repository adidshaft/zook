import { readFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";

const root = process.cwd();
const i18nPath = join(root, "apps/mobile/src/lib/i18n.tsx");
const sourceText = readFileSync(i18nPath, "utf8");
const source = ts.createSourceFile(i18nPath, sourceText, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const minimumHindiCoverage = 0.95;

function stringLiteralText(node: ts.Node) {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
    return node.text;
  }
  return null;
}

function propertyNameText(name: ts.PropertyName) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text;
  }
  return null;
}

function findTranslationKeyUnion() {
  const keys = new Set<string>();

  function visit(node: ts.Node) {
    if (ts.isTypeAliasDeclaration(node) && node.name.text === "TranslationKey") {
      const queue: ts.TypeNode[] = [node.type];
      while (queue.length) {
        const current = queue.shift()!;
        if (ts.isUnionTypeNode(current)) {
          queue.push(...current.types);
          continue;
        }
        if (ts.isLiteralTypeNode(current)) {
          const text = stringLiteralText(current.literal);
          if (text) {
            keys.add(text);
          }
        }
      }
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  return keys;
}

function findTranslationsObject() {
  let translations: ts.ObjectLiteralExpression | null = null;

  function visit(node: ts.Node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.name.text === "translations" &&
      node.initializer &&
      ts.isObjectLiteralExpression(node.initializer)
    ) {
      translations = node.initializer;
      return;
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  return translations;
}

function collectLocaleKeys(translations: ts.ObjectLiteralExpression, locale: string) {
  const localeProperty = translations.properties.find((property): property is ts.PropertyAssignment => {
    if (!ts.isPropertyAssignment(property)) {
      return false;
    }
    return propertyNameText(property.name) === locale;
  });
  const keys = new Set<string>();
  if (!localeProperty || !ts.isObjectLiteralExpression(localeProperty.initializer)) {
    return keys;
  }

  for (const property of localeProperty.initializer.properties) {
    if (!ts.isPropertyAssignment(property)) {
      continue;
    }
    const key = propertyNameText(property.name);
    if (key) {
      keys.add(key);
    }
  }
  return keys;
}

function difference(left: Set<string>, right: Set<string>) {
  return [...left].filter((key) => !right.has(key)).sort();
}

const declaredKeys = findTranslationKeyUnion();
const translations = findTranslationsObject();

if (!translations) {
  console.error("Could not find the translations object in apps/mobile/src/lib/i18n.tsx.");
  process.exit(1);
}

const englishKeys = collectLocaleKeys(translations, "en");
const hindiKeys = collectLocaleKeys(translations, "hi");
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

if (failures.length) {
  console.error(failures.join("\n\n"));
  process.exit(1);
}

console.log(
  `Mobile i18n audit passed: ${declaredKeys.size} keys, Hindi coverage ${(hindiCoverage * 100).toFixed(1)}%.`,
);
