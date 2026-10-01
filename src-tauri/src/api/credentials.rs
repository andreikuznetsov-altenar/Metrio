use keyring::Entry;
use serde::Serialize;
use std::collections::HashMap;
use std::sync::{LazyLock, Mutex};

pub const SERVICE: &str = "com.altenar.metrio";
pub const LEGACY_SERVICE: &str = "aiva-jira-app";
pub const JIRA_TOKEN_KEY: &str = "jira_api_token";
pub const BAMBOO_TOKEN_KEY: &str = "bamboo_api_token";
pub const GOOGLE_REFRESH_TOKEN_KEY: &str = "google_refresh_token";
pub const GOOGLE_ACCOUNT_EMAIL_KEY: &str = "google_account_email";
pub const APPS_SCRIPT_BRIDGE_SECRET_KEY: &str = "apps_script_bridge_secret";

pub fn is_local_account(account: &str) -> bool {
    account == JIRA_TOKEN_KEY
        || account == BAMBOO_TOKEN_KEY
        || account == GOOGLE_REFRESH_TOKEN_KEY
        || account == GOOGLE_ACCOUNT_EMAIL_KEY
        || account == APPS_SCRIPT_BRIDGE_SECRET_KEY
}

static CREDENTIAL_CACHE: LazyLock<Mutex<HashMap<String, String>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

#[derive(Debug, Serialize)]
pub struct SecureStoreVerify {
    pub exists: bool,
    pub readable: bool,
    pub length: Option<u32>,
}

#[derive(Debug)]
pub struct CredentialReadError {
    pub code: &'static str,
    pub message: String,
}

impl CredentialReadError {
    fn missing(account: &str) -> Self {
        Self {
            code: "credential_missing",
            message: format!("Missing credential: {}", account),
        }
    }

    fn keychain(account: &str, detail: String) -> Self {
        Self {
            code: "keychain_error",
            message: format!("Keychain error for {}: {}", account, detail),
        }
    }
}

pub fn cache_set(account: &str, secret: &str) {
    if let Ok(mut cache) = CREDENTIAL_CACHE.lock() {
        cache.insert(account.to_string(), secret.to_string());
    }
}

pub fn cache_remove(account: &str) {
    if let Ok(mut cache) = CREDENTIAL_CACHE.lock() {
        cache.remove(account);
    }
}

pub fn cache_contains(account: &str) -> bool {
    CREDENTIAL_CACHE
        .lock()
        .map(|cache| cache.contains_key(account))
        .unwrap_or(false)
}

pub fn cache_get(account: &str) -> Option<String> {
    CREDENTIAL_CACHE
        .lock()
        .ok()
        .and_then(|cache| cache.get(account).cloned())
}

fn read_keychain_secret(account: &str) -> Result<String, CredentialReadError> {
    if let Some(secret) = cache_get(account) {
        return Ok(secret);
    }

    match Entry::new(SERVICE, account) {
        Err(e) => Err(CredentialReadError::keychain(account, e.to_string())),
        Ok(entry) => match entry.get_password() {
            Ok(secret) => {
                cache_set(account, &secret);
                Ok(secret)
            }
            Err(keyring::Error::NoEntry) => Err(CredentialReadError::missing(account)),
            Err(e) => Err(CredentialReadError::keychain(account, e.to_string())),
        },
    }
}

pub fn verify_secret_storage(account: &str) -> SecureStoreVerify {
    if is_local_account(account) {
        return super::local_credentials::verify_account(account);
    }

    SecureStoreVerify {
        exists: false,
        readable: false,
        length: None,
    }
}

pub fn read_secret(account: &str) -> Result<String, CredentialReadError> {
    if is_local_account(account) {
        return super::local_credentials::read_secret(account).map_err(|message| {
            if message.contains("corrupt") {
                CredentialReadError::keychain(account, message)
            } else if message.contains("Missing credential") {
                CredentialReadError::missing(account)
            } else {
                CredentialReadError::keychain(account, message)
            }
        });
    }

    read_keychain_secret(account)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn local_account_detection() {
        assert!(is_local_account(JIRA_TOKEN_KEY));
        assert!(is_local_account(BAMBOO_TOKEN_KEY));
        assert!(is_local_account(GOOGLE_REFRESH_TOKEN_KEY));
        assert!(is_local_account(GOOGLE_ACCOUNT_EMAIL_KEY));
        assert!(is_local_account(APPS_SCRIPT_BRIDGE_SECRET_KEY));
    }

    #[test]
    fn credential_cache_roundtrip() {
        cache_set("test_account", "secret-value");
        assert!(cache_contains("test_account"));
        cache_remove("test_account");
        assert!(!cache_contains("test_account"));
    }
}
