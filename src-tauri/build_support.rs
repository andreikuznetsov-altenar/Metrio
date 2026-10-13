// Shared by build.rs and tests/build_provenance.rs.
#![allow(dead_code)]
use std::path::{Path, PathBuf};
use std::process::Command;

/// Runs git in this checkout and returns trimmed stdout on success.
pub fn git(args: &[&str]) -> Option<String> {
    let output = Command::new("git").args(args).output().ok()?;
    if !output.status.success() {
        return None;
    }
    let text = String::from_utf8(output.stdout).ok()?.trim().to_string();
    if text.is_empty() {
        None
    } else {
        Some(text)
    }
}

/// The real git directory (handles worktrees where `.git` is a file).
pub fn git_dir() -> Option<PathBuf> {
    git(&["rev-parse", "--git-dir"]).map(PathBuf::from)
}

/// Paths whose change means HEAD moved: `HEAD` itself, and (when HEAD is
/// symbolic) the branch ref file plus `packed-refs`, so a new commit on the
/// same branch invalidates a cached build-script result.
pub fn rerun_inputs(git_dir: &Path, symbolic_ref: Option<&str>) -> Vec<PathBuf> {
    let mut inputs = vec![git_dir.join("HEAD")];
    if let Some(reference) = symbolic_ref {
        inputs.push(git_dir.join(reference));
        inputs.push(git_dir.join("packed-refs"));
    }
    inputs
}

/// Short commit label: exact HEAD, with `-dirty` when tracked files differ.
pub fn resolve_commit(head: Option<String>, dirty: bool, env_fallback: Option<String>) -> String {
    match head {
        Some(sha) => {
            let short: String = sha.chars().take(7).collect();
            if dirty {
                format!("{short}-dirty")
            } else {
                short
            }
        }
        None => env_fallback
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty())
            .unwrap_or_else(|| "dev".to_string()),
    }
}

/// Emits cargo directives so the build script re-runs whenever the checked-out
/// commit changes, and returns the commit label (exact HEAD, never a cached value).
pub fn emit_git_provenance() -> String {
    if let Some(dir) = git_dir() {
        let symbolic = git(&["symbolic-ref", "-q", "HEAD"]);
        for input in rerun_inputs(&dir, symbolic.as_deref()) {
            println!("cargo:rerun-if-changed={}", input.display());
        }
    }
    println!("cargo:rerun-if-env-changed=GIT_COMMIT");
    let head = git(&["rev-parse", "--verify", "HEAD"]);
    let dirty = head.is_some() && git(&["status", "--porcelain", "--untracked-files=no"]).is_some();
    resolve_commit(head, dirty, std::env::var("GIT_COMMIT").ok())
}
