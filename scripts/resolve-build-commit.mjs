import { execFileSync } from "node:child_process";

/**
 * Build provenance: the commit shown in the app is always derived from the Git
 * checkout being built. An explicit env value is only a fallback for builds
 * without a .git directory, so a stale shell variable can never mislabel a build.
 */
export function resolveBuildCommit({ cwd = process.cwd(), env = process.env, git = runGit } = {}) {
  const head = git(["rev-parse", "HEAD"], cwd);
  if (head) {
    const dirty = git(["status", "--porcelain", "--untracked-files=no"], cwd);
    return dirty ? `${head}-dirty` : head;
  }
  return (env.VITE_GIT_COMMIT || env.GITHUB_SHA || "dev").trim() || "dev";
}

function runGit(args, cwd) {
  try {
    return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
}
