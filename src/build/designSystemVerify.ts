import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { execSync } from "node:child_process";
import allowlist from "./design-system-allowlist.json";

export type DesignSystemRuleId =
  | "border-radius-literal"
  | "card-radius-semantics"
  | "control-height-literal"
  | "transition-duration-literal"
  | "scrollbar-local"
  | "focus-box-shadow-local"
  | "focus-outline-local"
  | "border-color-raw"
  | "background-color-raw"
  | "color-token-fallback"
  | "text-color-raw"
  | "button-group-gap-literal"
  | "legacy-token"
  | "legacy-ui-production-import";

export interface DesignSystemViolation {
  file: string;
  line: number;
  rule: DesignSystemRuleId;
  message: string;
  snippet: string;
}

const EXCLUDED_FILES = new Set([
  "src/pages/Playground.css",
  "src/pages/FoundationPage.css",
  "src/styles/global.css",
]);

const TOKEN_AUTHORITY_FILES = new Set(["src/styles/tokens.css"]);

const LEGACY_DEV_PREFIXES = ["src/components/ui/"];

const CANONICAL_PRIMITIVE_PREFIXES = [
  "src/styles/",
  "src/components/Button/",
  "src/components/IconButton/",
  "src/components/Input/",
  "src/components/Textarea/",
  "src/components/Select/",
  "src/components/Switch/",
  "src/components/Card/",
  "src/components/Drawer/",
  "src/components/Badge/",
  "src/components/Tooltip/",
  "src/components/Tabs/",
  "src/components/SegmentedControl/",
  "src/components/ScrollArea/",
  "src/components/EmptyState/",
  "src/components/Skeleton/",
  "src/components/DatePicker/",
  "src/components/PersonAvatar/",
  "src/components/Toast/",
];

const FEATURE_PREFIXES = [
  "src/pages/",
  "src/shell/",
  "src/components/DashboardCompactRow/",
  "src/components/ResourceRow/",
  "src/components/EntityLink/",
  "src/components/AppShell/",
  "src/components/HelpIcon/",
  "src/components/ContentLoadingOverlay/",
  "src/components/SectionTitle/",
];

const LEGACY_TOKEN_PATTERN = /var\(--radius-md/;

/** Foundation / dev gallery only — not production AuthenticatedApp. */
export const LEGACY_UI_IMPORT_ALLOWED_FILES = new Set([
  "src/app/FoundationDevApp.tsx",
  "src/pages/FoundationPage.tsx",
]);

const LEGACY_UI_IMPORT_PATTERN =
  /from\s+["'][^"']*\/components\/ui\/[^"']+["']/;

const COLOR_TOKEN_FALLBACK_PATTERN =
  /var\(--[a-zA-Z0-9-]+,\s*#[0-9a-fA-F]{3,8}\b/;

const CARD_LIKE_SELECTOR =
  /surface-card|empty-state__card|[\w-]*(?:card|panel)[\w-]*/i;

const CARD_RADIUS_CONTROL_EXEMPT =
  /trigger|button|input|select|badge|chip|tab-|icon-btn|popover|toast|skeleton|segment|nav-btn|metric-tag|banner|strip__|field|row-btn|credential|help-btn/i;

const BUTTON_GROUP_ACTIONS_SELECTOR = /__actions|button-group|btn-group/i;

export interface CssRuleBlock {
  selector: string;
  body: string;
  startLine: number;
}

export function extractCssRuleBlocks(content: string): CssRuleBlock[] {
  const blocks: CssRuleBlock[] = [];
  const lines = content.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const open = line.indexOf("{");
    if (open === -1) {
      i += 1;
      continue;
    }
    const selector = line.slice(0, open).trim();
    let body = line.slice(open + 1);
    let depth = 1;
    const startLine = i + 1;
    if (body.includes("}")) {
      const parts = body.split("}");
      body = parts[0];
      depth = 0;
      blocks.push({ selector, body, startLine });
      const remainder = parts.slice(1).join("}");
      if (remainder.trim()) {
        lines[i] = remainder;
        continue;
      }
      i += 1;
      continue;
    }
    i += 1;
    while (i < lines.length && depth > 0) {
      const next = lines[i];
      for (const char of next) {
        if (char === "{") depth += 1;
        if (char === "}") depth -= 1;
      }
      if (depth > 0) {
        body += `\n${next}`;
        i += 1;
      } else {
        const close = next.lastIndexOf("}");
        body += `\n${next.slice(0, close)}`;
        blocks.push({ selector, body, startLine });
        i += 1;
        break;
      }
    }
  }
  return blocks;
}

function isLegacyDev(rel: string): boolean {
  return LEGACY_DEV_PREFIXES.some((p) => rel.startsWith(p));
}

function isCanonicalPrimitive(rel: string): boolean {
  return CANONICAL_PRIMITIVE_PREFIXES.some((p) => rel.startsWith(p));
}

function shouldScanFile(rel: string): boolean {
  if (!rel.endsWith(".css")) return false;
  if (EXCLUDED_FILES.has(rel)) return false;
  if (isLegacyDev(rel)) return false;
  if (isCanonicalPrimitive(rel)) return true;
  return FEATURE_PREFIXES.some((p) => rel.startsWith(p));
}

function walkCssFiles(dir: string, root: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (full.includes(`${join("src", "components", "ui")}`)) continue;
      walkCssFiles(full, root, out);
      continue;
    }
    if (!entry.endsWith(".css")) continue;
    const rel = relative(root, full).replace(/\\/g, "/");
    if (shouldScanFile(rel)) out.push(rel);
  }
}

function isAllowlisted(
  file: string,
  rule: DesignSystemRuleId,
  snippet: string,
): boolean {
  return allowlist.suppressions.some(
    (item) =>
      item.file === file &&
      item.rule === rule &&
      (!item.match || snippet.includes(item.match)),
  );
}

function scanLine(
  file: string,
  lineNumber: number,
  line: string,
  strict: boolean,
  violations: DesignSystemViolation[],
): void {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("/*")) return;

  const checks: { id: DesignSystemRuleId; regex: RegExp; message: string; strictOnly?: boolean }[] = [
    {
      id: "border-radius-literal",
      regex: /border-radius:\s*\d+(\.\d+)?px/,
      message:
        "Local border-radius literal is not allowed. Use a documented design-system radius token.",
    },
    {
      id: "transition-duration-literal",
      regex: /\b\d+ms\b/,
      message:
        "Local transition/animation duration literal. Use --motion-* tokens with --ease-standard.",
    },
    {
      id: "scrollbar-local",
      regex: /::-webkit-scrollbar|scrollbar-color:|scrollbar-width:/,
      message:
        "Scrollbar styling belongs in .metrio-scroll (ui-interaction-system.css) only.",
      strictOnly: true,
    },
    {
      id: "border-color-raw",
      regex: /border(-[a-z-]+)?-color:\s*(#[0-9a-fA-F]{3,8}\b|rgb\(|rgba\(|hsl\()/,
      message: "Use semantic border tokens (e.g. var(--border-default), var(--color-border)).",
      strictOnly: true,
    },
    {
      id: "background-color-raw",
      regex: /background(-color)?:\s*#[0-9a-fA-F]{3,8}\b/,
      message:
        "Hard-coded background colors are not allowed in feature CSS. Use semantic surface/status tokens.",
      strictOnly: true,
    },
    {
      id: "text-color-raw",
      regex: /(?<!-)color:\s*(#[0-9a-fA-F]{3,8}\b|rgb\(|rgba\(|hsl\()/,
      message:
        "Hard-coded text/UI colors are not allowed in feature CSS. Use semantic color tokens.",
      strictOnly: true,
    },
    {
      id: "color-token-fallback",
      regex: COLOR_TOKEN_FALLBACK_PATTERN,
      message:
        "Do not use hex fallbacks in var() — tokens are defined globally (e.g. var(--color-danger)).",
      strictOnly: true,
    },
    {
      id: "focus-outline-local",
      regex: /outline:\s*\d/,
      message: "Local focus outline. Fields use single-border focus; use shared focus primitives.",
      strictOnly: true,
    },
  ];

  for (const check of checks) {
    if (check.strictOnly && !strict) continue;
    if (!check.regex.test(trimmed)) continue;
    if (check.id === "transition-duration-literal") {
      if (TOKEN_AUTHORITY_FILES.has(file)) continue;
      if (/^--[\w-]+:\s*\d+ms/.test(trimmed)) continue;
      if (trimmed.includes("var(--motion")) continue;
      if (/animation:\s*[\w-]+\s+[\d.]+s/.test(trimmed)) continue;
      if (/\b0(\.\d+)?ms\b/.test(trimmed) && !/\b[1-9]\d*ms\b/.test(trimmed)) continue;
    }
    if (isAllowlisted(file, check.id, trimmed)) continue;
    violations.push({
      file,
      line: lineNumber,
      rule: check.id,
      message: check.message,
      snippet: trimmed,
    });
  }

  if (strict && LEGACY_TOKEN_PATTERN.test(trimmed)) {
    violations.push({
      file,
      line: lineNumber,
      rule: "legacy-token",
      message: "Legacy token --radius-md. Use --radius-card or --radius-control.",
      snippet: trimmed,
    });
  }

  if (
    strict &&
    /\b(height|min-height|max-height|line-height):\s*(3[0-9]|4[0-4])px\b/.test(trimmed)
  ) {
    if (!isAllowlisted(file, "control-height-literal", trimmed)) {
      violations.push({
        file,
        line: lineNumber,
        rule: "control-height-literal",
        message:
          "Unexpected literal control-like height (30–44px). Use var(--control-height-default) or var(--control-height-compact).",
        snippet: trimmed,
      });
    }
  }
}

function isCardLikeContentSelector(selector: string): boolean {
  if (CARD_RADIUS_CONTROL_EXEMPT.test(selector)) return false;
  return CARD_LIKE_SELECTOR.test(selector);
}

function scanRuleBlock(
  file: string,
  block: CssRuleBlock,
  strict: boolean,
  violations: DesignSystemViolation[],
): void {
  const bodyLines = block.body.split("\n");
  const combined = block.body.replace(/\s+/g, " ");
  const isFocusBlock = /:focus(-visible|-within)?/.test(block.selector);

  if (
    strict &&
    isCardLikeContentSelector(block.selector) &&
    /border-radius:\s*var\(--radius-control\)/.test(combined)
  ) {
    if (!isAllowlisted(file, "card-radius-semantics", combined)) {
      violations.push({
        file,
        line: block.startLine,
        rule: "card-radius-semantics",
        message:
          "Content cards/panels must use --radius-card, not --radius-control.",
        snippet: combined.trim().slice(0, 120),
      });
    }
  }

  if (
    strict &&
    BUTTON_GROUP_ACTIONS_SELECTOR.test(block.selector) &&
    /gap:\s*(8|16)px/.test(combined)
  ) {
    if (!isAllowlisted(file, "button-group-gap-literal", combined)) {
      violations.push({
        file,
        line: block.startLine,
        rule: "button-group-gap-literal",
        message: "Button groups must use gap: var(--button-group-gap).",
        snippet: combined.trim().slice(0, 120),
      });
    }
  }

  if (
    strict &&
    isFocusBlock &&
    /box-shadow:[^;]*(\d+px|#[0-9a-fA-F]{3,8})/.test(combined)
  ) {
    if (!isAllowlisted(file, "focus-box-shadow-local", combined)) {
      violations.push({
        file,
        line: block.startLine,
        rule: "focus-box-shadow-local",
        message:
          "Local focus box-shadow is not allowed. Fields use a single accent border; icon controls use var(--focus-ring).",
        snippet: combined.trim().slice(0, 120),
      });
    }
  }

  if (
    /\b[1-9]\d*ms\b/.test(combined) &&
    !combined.includes("var(--motion")
  ) {
    if (!isAllowlisted(file, "transition-duration-literal", combined)) {
      violations.push({
        file,
        line: block.startLine,
        rule: "transition-duration-literal",
        message:
          "Multiline transition uses literal ms durations. Use --motion-* tokens.",
        snippet: combined.slice(0, 120),
      });
    }
  }

  bodyLines.forEach((line, offset) => {
    scanLine(file, block.startLine + offset, line, strict, violations);
  });
}

export function scanFileContent(file: string, content: string): DesignSystemViolation[] {
  const strict = !isCanonicalPrimitive(file);
  const violations: DesignSystemViolation[] = [];
  const blocks = extractCssRuleBlocks(content);
  for (const block of blocks) {
    scanRuleBlock(file, block, strict, violations);
  }
  const lines = content.split("\n");
  lines.forEach((line, index) => {
    scanLine(file, index + 1, line, strict, violations);
  });
  return dedupeViolations(violations);
}

function dedupeViolations(violations: DesignSystemViolation[]): DesignSystemViolation[] {
  const seen = new Set<string>();
  return violations.filter((v) => {
    const key = `${v.file}:${v.line}:${v.rule}:${v.snippet}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function listApplicableCssFiles(repoRoot: string): string[] {
  const files: string[] = [];
  walkCssFiles(join(repoRoot, "src"), repoRoot, files);
  return [...new Set(files)].sort();
}

export function resolveDiffBaseSha(): string {
  return (
    process.env.DESIGN_SYSTEM_BASE_SHA?.trim() ||
    process.env.DESIGN_SYSTEM_DIFF_BASE?.trim() ||
    "origin/main"
  );
}

export function filterChangedPaths(
  allFiles: string[],
  diffOutput: string,
): string[] {
  const changed = new Set(
    diffOutput
      .split("\n")
      .map((f) => f.trim())
      .filter(Boolean),
  );
  return allFiles.filter((f) => changed.has(f));
}

export type GitExec = (
  command: string,
  options: { cwd: string; encoding: "utf8" },
) => string;

export function resolveDiffFiles(
  repoRoot: string,
  allFiles: string[],
  runGit: GitExec = execSync as GitExec,
): string[] {
  const base = resolveDiffBaseSha();
  try {
    const diff = runGit(`git diff --name-only ${base}...HEAD`, {
      cwd: repoRoot,
      encoding: "utf8",
    });
    return filterChangedPaths(allFiles, diff);
  } catch {
    try {
      const diff = runGit("git diff --name-only HEAD", {
        cwd: repoRoot,
        encoding: "utf8",
      });
      return filterChangedPaths(allFiles, diff);
    } catch {
      return allFiles;
    }
  }
}

function shouldScanTsFile(rel: string): boolean {
  if (!rel.endsWith(".ts") && !rel.endsWith(".tsx")) return false;
  if (rel.startsWith("src/components/ui/")) return false;
  if (/\.(test|spec)\.(ts|tsx)$/.test(rel)) return false;
  if (rel.startsWith("src/pages/")) return true;
  if (rel.startsWith("src/shell/")) return true;
  if (rel.startsWith("src/app/")) return true;
  if (rel.startsWith("src/components/")) return true;
  return false;
}

function walkTsFiles(dir: string, root: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (full.includes(`${join("src", "components", "ui")}`)) continue;
      walkTsFiles(full, root, out);
      continue;
    }
    if (!entry.endsWith(".ts") && !entry.endsWith(".tsx")) continue;
    const rel = relative(root, full).replace(/\\/g, "/");
    if (shouldScanTsFile(rel)) out.push(rel);
  }
}

function listApplicableTsFiles(repoRoot: string): string[] {
  const files: string[] = [];
  walkTsFiles(join(repoRoot, "src"), repoRoot, files);
  return [...new Set(files)].sort();
}

export function scanTsImportContent(
  file: string,
  content: string,
): DesignSystemViolation[] {
  if (LEGACY_UI_IMPORT_ALLOWED_FILES.has(file)) return [];
  const violations: DesignSystemViolation[] = [];
  const lines = content.split("\n");
  lines.forEach((line, index) => {
    if (!LEGACY_UI_IMPORT_PATTERN.test(line)) return;
    const snippet = line.trim();
    if (isAllowlisted(file, "legacy-ui-production-import", snippet)) return;
    violations.push({
      file,
      line: index + 1,
      rule: "legacy-ui-production-import",
      message:
        "Production code must not import src/components/ui/** (Foundation dev gallery only).",
      snippet,
    });
  });
  return violations;
}

export function verifyDesignSystem(repoRoot: string): DesignSystemViolation[] {
  const cssFiles = listApplicableCssFiles(repoRoot);
  const tsFiles = listApplicableTsFiles(repoRoot);
  const allFiles = [...cssFiles, ...tsFiles];
  const targetFiles =
    process.env.DESIGN_SYSTEM_DIFF === "1"
      ? resolveDiffFiles(repoRoot, allFiles)
      : allFiles;

  const all: DesignSystemViolation[] = [];
  for (const file of targetFiles) {
    const content = readFileSync(join(repoRoot, file), "utf8");
    if (file.endsWith(".css")) {
      all.push(...scanFileContent(file, content));
    } else {
      all.push(...scanTsImportContent(file, content));
    }
  }
  return all;
}

export function formatViolations(violations: DesignSystemViolation[]): string {
  return violations
    .map((v) => `${v.file}:${v.line}\n${v.message}\n  ${v.snippet}\n`)
    .join("\n");
}
