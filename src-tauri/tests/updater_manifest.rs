//! Exercises the real tauri-plugin-updater against a local static manifest, so the
//! "up to date" (None) path and manifest platform selection are proven offline.
use std::io::{Read, Write};
use std::net::TcpListener;
use tauri_plugin_updater::UpdaterExt;

fn serve_once(body: String) -> String {
    let listener = TcpListener::bind("127.0.0.1:0").unwrap();
    let addr = listener.local_addr().unwrap();
    std::thread::spawn(move || {
        for stream in listener.incoming() {
            let mut stream = stream.unwrap();
            let mut buf = [0u8; 2048];
            let _ = stream.read(&mut buf);
            let resp = format!(
                "HTTP/1.1 200 OK\r\nContent-Type: application/octet-stream\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{}",
                body.len(),
                body
            );
            let _ = stream.write_all(resp.as_bytes());
        }
    });
    format!("http://{addr}/latest.json")
}

fn manifest(version: &str, keys: &[&str]) -> String {
    let platforms: Vec<String> = keys
        .iter()
        .map(|k| {
            format!(
                r#""{k}": {{"signature": "c2ln", "url": "https://example.invalid/Metrio.app.tar.gz"}}"#
            )
        })
        .collect();
    format!(
        r#"{{"version":"{version}","notes":"n","pub_date":"2026-10-13T10:47:26.210Z","platforms":{{{}}}}}"#,
        platforms.join(",")
    )
}

async fn check(version: &str, keys: &[&str]) -> Result<bool, String> {
    let url = serve_once(manifest(version, keys));
    let mut context = tauri::test::mock_context(tauri::test::noop_assets());
    context.config_mut().plugins.0.insert(
        "updater".into(),
        serde_json::json!({
            "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDcxNDU2RjgxQTRENjQ3MkEKUldRcVI5YWtnVzlGY2JNenBLd3ErQ2YyL1BzM3d3dEJyZk5xWnNUaGczK1BPcHRydW8yMzlhVzEK",
            "endpoints": [url],
            "dangerousInsecureTransportProtocol": true
        }),
    );
    let app = tauri::test::mock_builder()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .build(context)
        .unwrap();
    let updater = app.handle().updater().map_err(|e| e.to_string())?;
    updater
        .check()
        .await
        .map(|u| u.is_some())
        .map_err(|e| e.to_string())
}

#[tokio::test]
async fn same_version_manifest_is_up_to_date_not_an_error() {
    // The mock context reports package version 0.1.0.
    assert_eq!(check("0.1.0", &["darwin-aarch64"]).await, Ok(false));
}

#[tokio::test]
async fn newer_manifest_reports_an_update() {
    assert_eq!(check("99.0.0", &["darwin-aarch64"]).await, Ok(true));
}

#[tokio::test]
async fn manifest_without_this_platform_is_a_real_error() {
    let err = check("99.0.0", &["linux-x86_64"]).await.unwrap_err();
    assert!(err.contains("platform") || err.contains("target"), "{err}");
}

/// Manual diagnostic against a real published manifest (never runs in normal suites):
/// `METRIO_LIVE_MANIFEST_URL=<url> cargo test --test updater_manifest -- --ignored --nocapture`
#[tokio::test]
#[ignore]
async fn live_manifest_diagnostic() {
    let Ok(url) = std::env::var("METRIO_LIVE_MANIFEST_URL") else {
        return;
    };
    let mut context = tauri::test::mock_context(tauri::test::noop_assets());
    context.config_mut().plugins.0.insert(
        "updater".into(),
        serde_json::json!({
            "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXk6IDcxNDU2RjgxQTRENjQ3MkEKUldRcVI5YWtnVzlGY2JNenBLd3ErQ2YyL1BzM3d3dEJyZk5xWnNUaGczK1BPcHRydW8yMzlhVzEK",
            "endpoints": [url],
        }),
    );
    let app = tauri::test::mock_builder()
        .plugin(tauri_plugin_updater::Builder::new().build())
        .build(context)
        .unwrap();
    let result = app.handle().updater().unwrap().check().await;
    println!("live check -> {:?}", result.as_ref().map(|u| u.as_ref().map(|u| u.version.clone())));
    println!("live check error -> {:?}", result.as_ref().err().map(|e| e.to_string()));
}
