//! Regression coverage for build provenance: the commit baked into the app must
//! follow the checked-out HEAD, never a stale Cargo build-script cache.
#[path = "../build_support.rs"]
mod build_support;

use std::path::{Path, PathBuf};
use std::process::Command;

use build_support::{rerun_inputs, resolve_commit};

#[test]
fn commit_follows_head_not_a_cached_value() {
    assert_eq!(resolve_commit(Some("c5b0b470ab82".into()), false, Some("d0a951c".into())), "c5b0b47");
}

#[test]
fn dirty_tree_is_suffixed() {
    assert_eq!(resolve_commit(Some("c5b0b470ab82".into()), true, None), "c5b0b47-dirty");
}

#[test]
fn env_fallback_only_without_git() {
    assert_eq!(resolve_commit(None, false, Some(" abc1234 ".into())), "abc1234");
    assert_eq!(resolve_commit(None, false, Some(String::new())), "dev");
    assert_eq!(resolve_commit(None, false, None), "dev");
}

#[test]
fn symbolic_head_tracks_branch_ref_and_detached_head_only_head() {
    let inputs = rerun_inputs(Path::new("/repo/.git"), Some("refs/heads/main"));
    assert!(inputs.contains(&PathBuf::from("/repo/.git/HEAD")));
    assert!(inputs.contains(&PathBuf::from("/repo/.git/refs/heads/main")));
    assert!(inputs.contains(&PathBuf::from("/repo/.git/packed-refs")));
    assert_eq!(rerun_inputs(Path::new("/repo/.git"), None), vec![PathBuf::from("/repo/.git/HEAD")]);
}

fn run(dir: &Path, program: &str, args: &[&str]) -> String {
    let out = Command::new(program)
        .args(args)
        .current_dir(dir)
        .env_remove("GIT_COMMIT")
        .output()
        .unwrap_or_else(|e| panic!("{program}: {e}"));
    assert!(out.status.success(), "{program} {args:?}: {}", String::from_utf8_lossy(&out.stderr));
    String::from_utf8(out.stdout).unwrap().trim().to_string()
}

fn git(dir: &Path, args: &[&str]) -> String {
    let mut full = vec!["-c", "user.name=t", "-c", "user.email=t@example.com", "-c", "commit.gpgsign=false"];
    full.extend_from_slice(args);
    run(dir, "git", &full)
}

/// Builds a throwaway crate that reuses the real build-script logic, then commits
/// again WITHOUT touching any Rust source and rebuilds into the SAME target dir.
#[test]
fn new_commit_with_unchanged_source_is_not_served_from_cargo_cache() {
    let root = std::env::temp_dir().join(format!("metrio-provenance-{}", std::process::id()));
    let _ = std::fs::remove_dir_all(&root);
    std::fs::create_dir_all(root.join("src")).unwrap();
    std::fs::copy(
        Path::new(env!("CARGO_MANIFEST_DIR")).join("build_support.rs"),
        root.join("build_support.rs"),
    )
    .unwrap();
    std::fs::write(
        root.join("Cargo.toml"),
        "[package]\nname = \"probe\"\nversion = \"0.0.0\"\nedition = \"2021\"\nbuild = \"build.rs\"\n",
    )
    .unwrap();
    std::fs::write(
        root.join("build.rs"),
        "mod build_support;\nfn main() { let c = build_support::emit_git_provenance(); println!(\"cargo:rustc-env=GIT_COMMIT={c}\"); }\n",
    )
    .unwrap();
    std::fs::write(
        root.join("src/main.rs"),
        "fn main() { println!(\"{}\", env!(\"GIT_COMMIT\")); }\n",
    )
    .unwrap();
    std::fs::write(root.join(".gitignore"), "target\n").unwrap();

    git(&root, &["init", "-q", "-b", "main"]);
    git(&root, &["add", "-A"]);
    git(&root, &["commit", "-q", "-m", "one"]);
    let first_head = git(&root, &["rev-parse", "--short=7", "HEAD"]);

    let cargo = std::env::var("CARGO").unwrap_or_else(|_| "cargo".into());
    let probe = |dir: &Path| {
        run(dir, &cargo, &["run", "-q", "--offline"])
    };
    assert_eq!(probe(&root), first_head);

    git(&root, &["commit", "-q", "--allow-empty", "-m", "two"]);
    let second_head = git(&root, &["rev-parse", "--short=7", "HEAD"]);
    assert_ne!(first_head, second_head);
    assert_eq!(probe(&root), second_head, "stale Cargo cache preserved the previous SHA");

    // Dirty tracked file => suffix.
    std::fs::write(root.join("src/main.rs"), "fn main() { println!(\"{}\", env!(\"GIT_COMMIT\")); } \n").unwrap();
    assert_eq!(probe(&root), format!("{second_head}-dirty"));

    let _ = std::fs::remove_dir_all(&root);
}
