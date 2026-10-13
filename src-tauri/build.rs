mod build_support;

fn main() {
    let commit = build_support::emit_git_provenance();
    let channel = std::env::var("BUILD_CHANNEL").unwrap_or_else(|_| "development".to_string());

    println!("cargo:rerun-if-env-changed=BUILD_CHANNEL");
    println!("cargo:rustc-env=GIT_COMMIT={}", commit);
    println!("cargo:rustc-env=BUILD_CHANNEL={}", channel);
    println!("cargo:rerun-if-changed=../package.json");
    tauri_build::build();
}
