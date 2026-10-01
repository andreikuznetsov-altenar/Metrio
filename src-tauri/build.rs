fn main() {
    let commit = std::process::Command::new("git")
        .args(["rev-parse", "--short", "HEAD"])
        .output()
        .ok()
        .and_then(|output| {
            if output.status.success() {
                String::from_utf8(output.stdout)
                    .ok()
                    .map(|s| s.trim().to_string())
            } else {
                None
            }
        })
        .filter(|s| !s.is_empty())
        .unwrap_or_else(|| "dev".to_string());

    let channel = std::env::var("BUILD_CHANNEL").unwrap_or_else(|_| "development".to_string());

    println!("cargo:rustc-env=GIT_COMMIT={}", commit);
    println!("cargo:rustc-env=BUILD_CHANNEL={}", channel);
    println!("cargo:rerun-if-changed=../package.json");
    tauri_build::build();
}
