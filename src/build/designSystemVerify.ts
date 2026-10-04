import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { execSync } from "node:child_process";
import allowlist from "./design-system-allowlist.json";

export type DesignSystemRuleId =
  | "border-radius-literal"
  | "control-height-literal"
  | "transition-duration-literal"
  | "scrollbar-local"
  | "focus-box-shadow-local";

export interface DesignSystemViolation {
  file: string;
  line: number;
  rule: DesignSystemRuleId;
  message: string;
  snippet: string;
}

const FEATURE_PREFIXES = ["src/pages/", "src/shell/"];
const EXCLUDED_FILES = new Set(["src/pages/Playground.css"]);

const RULE_PATTERNS: {
  id: DesignSystemRuleId;
  regex: RegExp;
  message: string;
}[] = [
  {
    id: "border-radius-literal",
    regex: /border-radius:\s*\d+(\.\d+)?(px|%)/,
    message:
      "Local border-radius literal is not allowed. Use a documented design-system radius token (e.g. var(--radius-control)).",
  },
  {
    id: "control-height-literal",
    regex: /\b(height|min-height|max-height|line-height):\s*(34|35|37)px\b/,
    message:
      "Non-standard control height. Use var(--control-height-default) or var(--control-height-compact).",
  },
  {
    id: "control-height-literal",
    regex: /\b(height|min-height):\s*36px\b/,
    message:
      "Literal 36px control height. Use var(--control-height-default) or var(--control-height).",
  },
  {
    id: "transition-duration-literal",
    regex: /transition:[^;]*\b\d+ms\b/,
    message:
      "Local transition duration is not allowed. Use --motion-* tokens with --ease-standard.",
  },
  {
    id: "scrollbar-local",
    regex: /::-webkit-scrollbar|scrollbar-color:|scrollbar-width:/,
    message:
      "Scrollbar styling belongs in design-system scroll primitives (.metrio-scroll, ScrollArea, Drawer).",
  },
  {
    id: "focus-box-shadow-local",
    regex: /:focus[^{]*\{[^}]*box-shadow:\s*(?!var\()/,
    message:
      "Local focus box-shadow is not allowed on feature styles. Use shared focus tokens or form-control rules.",
  },
];

function isFeatureCss(relativePath: string): boolean {
  if (!relativePath.endsWith(".css")) return false;
  if (EXCLUDED_FILES.has(relativePath)) return false;
  return FEATURE_PREFIXES.some((prefix) => relativePath.startsWith(prefix));
}

function walkCssFiles(dir: string, root: string, out: string[]): void {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walkCssFiles(full, root, out);
      continue;
    }
    if (!entry.endsWith(".css")) continue;
    const rel = relative(root, full).replace(/\\/g, "/");
    if (isFeatureCss(rel)) out.push(rel);
  }
}

function isAllowlisted(
  file: string,
  rule: DesignSystemRuleId,
  lineText: string,
): boolean {
  return allowlist.suppressions.some(
    (item) =>
      item.file === file &&
      item.rule === rule &&
      (!item.match || lineText.includes(item.match)),
  );
}

export function scanFileContent(file: string, content: string): DesignSystemViolation[] {
  const violations: DesignSystemViolation[] = [];
  const lines = content.split("\n");

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("/*")) return;

    for (const rule of RULE_PATTERNS) {
      if (!rule.regex.test(line)) continue;
      if (rule.id === "transition-duration-literal" && line.includes("var(--motion")) {
        continue;
      }
      if (isAllowlisted(file, rule.id, line)) continue;
      violations.push({
        file,
        line: index + 1,
        rule: rule.id,
        message: rule.message,
        snippet: trimmed,
      });
    }
  });

  return violations;
}

export function verifyDesignSystem(repoRoot: string): DesignSystemViolation[] {
  const files: string[] = [];
  for (const prefix of FEATURE_PREFIXES) {
    walkCssFiles(join(repoRoot, prefix), repoRoot, files);
  }

  let targetFiles = files;
  if (process.env.DESIGN_SYSTEM_DIFF === "1") {
    try {
      const diff = execSync("git diff --name-only HEAD", {
        cwd: repoRoot,
        encoding: "utf8",
      });
      const changed = new Set(
        diff
          .split("\n")
          .map((f: string) => f.trim())
          .filter(Boolean),
      );
      targetFiles = files.filter((f) => changed.has(f));
    } catch {
      targetFiles = files;
    }
  }

  const all: DesignSystemViolation[] = [];
  for (const file of targetFiles) {
    const content = readFileSync(join(repoRoot, file), "utf8");
    all.push(...scanFileContent(file, content));
  }
  return all;
}

export function formatViolations(violations: DesignSystemViolation[]): string {
  return violations
    .map(
      (v) =>
        `${v.file}:${v.line}\n${v.message}\n  ${v.snippet}\n`,
    )
    .join("\n");
}
