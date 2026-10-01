use hmac::{Hmac, Mac};
use rand::RngCore;
use serde_json::Value;
use sha2::Sha256;
use std::time::{SystemTime, UNIX_EPOCH};
use url::Url;

type HmacSha256 = Hmac<Sha256>;

pub fn now_millis() -> u64 {
    SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_millis() as u64
}

pub fn random_nonce() -> String {
    let mut bytes = [0u8; 16];
    rand::thread_rng().fill_bytes(&mut bytes);
    hex_encode(&bytes)
}

fn hex_encode(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{:02x}", b)).collect()
}

pub fn canonical_json(value: &Value) -> String {
    match value {
        Value::Null => "null".to_string(),
        Value::Bool(v) => v.to_string(),
        Value::Number(v) => v.to_string(),
        Value::String(v) => serde_json::to_string(v).unwrap_or_else(|_| "\"\"".to_string()),
        Value::Array(items) => {
            let parts = items.iter().map(canonical_json).collect::<Vec<_>>();
            format!("[{}]", parts.join(","))
        }
        Value::Object(map) => {
            let mut keys = map.keys().collect::<Vec<_>>();
            keys.sort();
            let parts = keys
                .iter()
                .map(|key| {
                    format!(
                        "{}:{}",
                        serde_json::to_string(key).unwrap_or_else(|_| "\"\"".to_string()),
                        canonical_json(&map[*key])
                    )
                })
                .collect::<Vec<_>>();
            format!("{{{}}}", parts.join(","))
        }
    }
}

pub fn sign_request(
    secret: &str,
    timestamp: u64,
    nonce: &str,
    action: &str,
    payload: &Value,
) -> String {
    let payload_text = canonical_json(payload);
    let message = format!("{}\n{}\n{}\n{}", timestamp, nonce, action, payload_text);
    let mut mac =
        HmacSha256::new_from_slice(secret.as_bytes()).expect("HMAC accepts any key length");
    mac.update(message.as_bytes());
    hex_encode(&mac.finalize().into_bytes())
}

pub fn is_allowed_web_app_host(host: &str) -> bool {
    host == "script.google.com" || host.ends_with(".script.googleusercontent.com")
}

pub fn validate_web_app_url(url: &str) -> Result<String, String> {
    let parsed = Url::parse(url.trim()).map_err(|_| "Web App URL is invalid.")?;
    if parsed.scheme() != "https" {
        return Err("Web App URL must use HTTPS.".to_string());
    }
    let host = parsed.host_str().unwrap_or("");
    if !is_allowed_web_app_host(host) {
        return Err("Web App URL must point to Google Apps Script.".to_string());
    }
    Ok(parsed.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn canonical_json_sorts_object_keys() {
        let value = json!({"b": 2, "a": 1});
        assert_eq!(canonical_json(&value), r#"{"a":1,"b":2}"#);
    }

    #[test]
    fn signature_is_stable_for_same_input() {
        let payload = json!({"title": "Smoke"});
        let sig_a = sign_request("secret", 1_700_000_000_000, "nonce-1", "ping", &payload);
        let sig_b = sign_request("secret", 1_700_000_000_000, "nonce-1", "ping", &payload);
        assert_eq!(sig_a, sig_b);
        assert_ne!(
            sign_request("secret", 1_700_000_000_000, "nonce-2", "ping", &payload),
            sig_a
        );
    }

    #[test]
    fn validates_google_script_hosts() {
        assert!(validate_web_app_url("https://script.google.com/macros/s/abc/exec").is_ok());
        assert!(validate_web_app_url("https://example.com/exec").is_err());
        assert!(validate_web_app_url("http://script.google.com/macros/s/abc/exec").is_err());
    }
}
