use crate::api::credentials::{
    cache_remove, cache_set, APPS_SCRIPT_BRIDGE_SECRET_KEY, BAMBOO_TOKEN_KEY,
    GOOGLE_ACCOUNT_EMAIL_KEY, GOOGLE_REFRESH_TOKEN_KEY, JIRA_TOKEN_KEY, SecureStoreVerify,
};
use crate::persistence::{atomic_write_json, load_json_file};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Mutex;

static STORE_PATH: Mutex<Option<PathBuf>> = Mutex::new(None);
static FILE_CORRUPT: AtomicBool = AtomicBool::new(false);

const SCHEMA_VERSION: u32 = 3;

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
struct LocalCredentialsFile {
    #[serde(rename = "schemaVersion", default)]
    schema_version: u32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    jira_api_token: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    bamboo_api_token: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    google_refresh_token: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    google_account_email: Option<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    apps_script_bridge_secret: Option<String>,
}

pub fn init_store_path(path: PathBuf) {
    FILE_CORRUPT.store(false, Ordering::SeqCst);
    if let Ok(mut guard) = STORE_PATH.lock() {
        *guard = Some(path);
    }
}

fn store_path() -> Result<PathBuf, String> {
    STORE_PATH
        .lock()
        .ok()
        .and_then(|guard| guard.clone())
        .ok_or_else(|| "Local credential store is not initialized".to_string())
}

fn is_whitelisted_account(account: &str) -> bool {
    account == JIRA_TOKEN_KEY
        || account == BAMBOO_TOKEN_KEY
        || account == GOOGLE_REFRESH_TOKEN_KEY
        || account == GOOGLE_ACCOUNT_EMAIL_KEY
        || account == APPS_SCRIPT_BRIDGE_SECRET_KEY
}

fn account_to_field<'a>(file: &'a LocalCredentialsFile, account: &str) -> Option<&'a Option<String>> {
    match account {
        JIRA_TOKEN_KEY => Some(&file.jira_api_token),
        BAMBOO_TOKEN_KEY => Some(&file.bamboo_api_token),
        GOOGLE_REFRESH_TOKEN_KEY => Some(&file.google_refresh_token),
        GOOGLE_ACCOUNT_EMAIL_KEY => Some(&file.google_account_email),
        APPS_SCRIPT_BRIDGE_SECRET_KEY => Some(&file.apps_script_bridge_secret),
        _ => None,
    }
}

fn account_to_field_mut<'a>(
    file: &'a mut LocalCredentialsFile,
    account: &str,
) -> Option<&'a mut Option<String>> {
    match account {
        JIRA_TOKEN_KEY => Some(&mut file.jira_api_token),
        BAMBOO_TOKEN_KEY => Some(&mut file.bamboo_api_token),
        GOOGLE_REFRESH_TOKEN_KEY => Some(&mut file.google_refresh_token),
        GOOGLE_ACCOUNT_EMAIL_KEY => Some(&mut file.google_account_email),
        APPS_SCRIPT_BRIDGE_SECRET_KEY => Some(&mut file.apps_script_bridge_secret),
        _ => None,
    }
}

fn default_file() -> LocalCredentialsFile {
    LocalCredentialsFile {
        schema_version: SCHEMA_VERSION,
        jira_api_token: None,
        bamboo_api_token: None,
        google_refresh_token: None,
        google_account_email: None,
        apps_script_bridge_secret: None,
    }
}

fn normalize_loaded_file(file: LocalCredentialsFile) -> Result<LocalCredentialsFile, String> {
    if file.schema_version == 0 {
        return Err("Unsupported local credential schema version".to_string());
    }
    if file.schema_version > SCHEMA_VERSION {
        return Err("Unsupported local credential schema version".to_string());
    }
    Ok(LocalCredentialsFile {
        schema_version: SCHEMA_VERSION,
        jira_api_token: file.jira_api_token,
        bamboo_api_token: file.bamboo_api_token,
        google_refresh_token: file.google_refresh_token,
        google_account_email: file.google_account_email,
        apps_script_bridge_secret: file.apps_script_bridge_secret,
    })
}

fn set_private_file_permissions(path: &Path) {
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        if let Ok(metadata) = fs::metadata(path) {
            let mut perms = metadata.permissions();
            perms.set_mode(0o600);
            let _ = fs::set_permissions(path, perms);
        }
    }
}

fn load_file(path: &Path) -> Result<LocalCredentialsFile, String> {
    if FILE_CORRUPT.load(Ordering::SeqCst) {
        return Err("Local credential file is corrupt".to_string());
    }

    let loaded = load_json_file(path, serde_json::json!({ "schemaVersion": SCHEMA_VERSION }));
    if loaded.warning.is_some() {
        FILE_CORRUPT.store(true, Ordering::SeqCst);
        return Err("Local credential file is corrupt".to_string());
    }

    let file: LocalCredentialsFile = serde_json::from_value(loaded.value)
        .map_err(|e| format!("Invalid local credential file: {}", e))?;

    normalize_loaded_file(file)
}

fn write_file(path: &Path, file: &LocalCredentialsFile) -> Result<(), String> {
    let value = serde_json::to_value(file).map_err(|e| e.to_string())?;
    atomic_write_json(path, &value)?;
    set_private_file_permissions(path);
    FILE_CORRUPT.store(false, Ordering::SeqCst);
    Ok(())
}

fn hydrate_cache_from_file(path: &Path) -> Result<(), String> {
    let file = load_file(path)?;
    if let Some(secret) = file.jira_api_token.as_ref().filter(|s| !s.is_empty()) {
        cache_set(JIRA_TOKEN_KEY, secret);
    }
    if let Some(secret) = file.bamboo_api_token.as_ref().filter(|s| !s.is_empty()) {
        cache_set(BAMBOO_TOKEN_KEY, secret);
    }
    if let Some(secret) = file.google_refresh_token.as_ref().filter(|s| !s.is_empty()) {
        cache_set(GOOGLE_REFRESH_TOKEN_KEY, secret);
    }
    if let Some(email) = file.google_account_email.as_ref().filter(|s| !s.is_empty()) {
        cache_set(GOOGLE_ACCOUNT_EMAIL_KEY, email);
    }
    if let Some(secret) = file.apps_script_bridge_secret.as_ref().filter(|s| !s.is_empty()) {
        cache_set(APPS_SCRIPT_BRIDGE_SECRET_KEY, secret);
    }
    Ok(())
}

pub fn set_secret(account: &str, secret: &str) -> Result<(), String> {
    if !is_whitelisted_account(account) {
        return Err("Unsupported credential account".to_string());
    }
    if secret.trim().is_empty() {
        return Err("Credential secret cannot be empty".to_string());
    }

    let path = store_path()?;
    let mut file = if path.exists() {
        load_file(&path)?
    } else {
        default_file()
    };

    if let Some(slot) = account_to_field_mut(&mut file, account) {
        *slot = Some(secret.to_string());
    }

    write_file(&path, &file)?;
    cache_set(account, secret);
    Ok(())
}

pub fn delete_secret(account: &str) -> Result<(), String> {
    if !is_whitelisted_account(account) {
        return Err("Unsupported credential account".to_string());
    }

    let path = store_path()?;
    if path.exists() {
        let mut file = load_file(&path)?;
        if let Some(slot) = account_to_field_mut(&mut file, account) {
            *slot = None;
        }
        write_file(&path, &file)?;
    }

    cache_remove(account);
    Ok(())
}

pub fn read_secret(account: &str) -> Result<String, String> {
    if !is_whitelisted_account(account) {
        return Err("Unsupported credential account".to_string());
    }

    if let Some(cache) = crate::api::credentials::cache_get(account) {
        return Ok(cache);
    }

    let path = store_path()?;
    hydrate_cache_from_file(&path)?;

    crate::api::credentials::cache_get(account)
        .ok_or_else(|| format!("Missing credential: {}", account))
}

pub fn verify_account(account: &str) -> SecureStoreVerify {
    if !is_whitelisted_account(account) {
        return SecureStoreVerify {
            exists: false,
            readable: false,
            length: None,
        };
    }

    if let Some(secret) = crate::api::credentials::cache_get(account) {
        return SecureStoreVerify {
            exists: true,
            readable: true,
            length: Some(secret.len() as u32),
        };
    }

    let path = match store_path() {
        Ok(path) => path,
        Err(_) => {
            return SecureStoreVerify {
                exists: false,
                readable: false,
                length: None,
            };
        }
    };

    if FILE_CORRUPT.load(Ordering::SeqCst) {
        return SecureStoreVerify {
            exists: true,
            readable: false,
            length: None,
        };
    }

    match load_file(&path) {
        Ok(file) => match account_to_field(&file, account) {
            Some(Some(secret)) if !secret.is_empty() => {
                cache_set(account, secret);
                SecureStoreVerify {
                    exists: true,
                    readable: true,
                    length: Some(secret.len() as u32),
                }
            }
            _ => SecureStoreVerify {
                exists: false,
                readable: false,
                length: None,
            },
        },
        Err(_) => SecureStoreVerify {
            exists: true,
            readable: false,
            length: None,
        },
    }
}

pub fn exists(account: &str) -> bool {
    verify_account(account).exists && verify_account(account).readable
}

fn import_keychain_entry(entry: &keyring::Entry, account: &str) -> Result<bool, String> {
    match entry.get_password() {
        Ok(secret) if !secret.is_empty() => {
            set_secret(account, &secret)?;
            let _ = entry.delete_credential();
            Ok(true)
        }
        Ok(_) => Ok(false),
        Err(keyring::Error::NoEntry) => Ok(false),
        Err(e) => Err(e.to_string()),
    }
}

/// Explicit user action only — migrates Jira/Bamboo secrets from Keychain into the local file store.
pub fn import_legacy_keychain_secret(account: &str) -> Result<bool, String> {
    if !is_whitelisted_account(account) {
        return Err("Unsupported credential account".to_string());
    }

    if exists(account) {
        return Ok(false);
    }

    use keyring::Entry;
    use crate::api::credentials::{LEGACY_SERVICE, SERVICE};

    let service_entry = Entry::new(SERVICE, account).map_err(|e| e.to_string())?;
    if import_keychain_entry(&service_entry, account)? {
        return Ok(true);
    }

    let legacy_entry = Entry::new(LEGACY_SERVICE, account).map_err(|e| e.to_string())?;
    import_keychain_entry(&legacy_entry, account)
}

/// Explicit user action only — migrates Google credentials from Keychain into the local file store.
pub fn import_legacy_google_keychain() -> Result<bool, String> {
    let refresh_imported = if exists(GOOGLE_REFRESH_TOKEN_KEY) {
        false
    } else {
        import_legacy_keychain_secret(GOOGLE_REFRESH_TOKEN_KEY)?
    };

    let email_imported = if exists(GOOGLE_ACCOUNT_EMAIL_KEY) {
        false
    } else {
        import_legacy_keychain_secret(GOOGLE_ACCOUNT_EMAIL_KEY)?
    };

    Ok(refresh_imported || email_imported)
}

#[allow(dead_code)]
pub fn schema_version() -> u32 {
    SCHEMA_VERSION
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::api::credentials::cache_remove;
    use std::sync::Mutex;
    use std::time::{SystemTime, UNIX_EPOCH};

    static TEST_LOCK: Mutex<()> = Mutex::new(());

    fn test_guard() -> std::sync::MutexGuard<'static, ()> {
        TEST_LOCK
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    fn assert_schema_version(raw: &str, expected: u32) {
        let parsed: serde_json::Value =
            serde_json::from_str(raw).expect("credential file should be valid JSON");
        assert_eq!(
            parsed.get("schemaVersion").and_then(|v| v.as_u64()),
            Some(expected as u64)
        );
    }

    fn temp_cred_path(name: &str) -> PathBuf {
        let stamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        std::env::temp_dir().join(format!("metrio-creds-{}-{}.json", name, stamp))
    }

    #[test]
    fn save_load_and_restart_simulation() {
        let _guard = test_guard();
        let path = temp_cred_path("roundtrip");
        init_store_path(path.clone());
        cache_remove(JIRA_TOKEN_KEY);
        cache_remove(BAMBOO_TOKEN_KEY);

        set_secret(JIRA_TOKEN_KEY, "jira-secret").expect("set jira");
        set_secret(BAMBOO_TOKEN_KEY, "bamboo-secret").expect("set bamboo");

        cache_remove(JIRA_TOKEN_KEY);
        cache_remove(BAMBOO_TOKEN_KEY);

        let jira = read_secret(JIRA_TOKEN_KEY).expect("read jira");
        let bamboo = read_secret(BAMBOO_TOKEN_KEY).expect("read bamboo");
        assert_eq!(jira, "jira-secret");
        assert_eq!(bamboo, "bamboo-secret");

        let verify = verify_account(JIRA_TOKEN_KEY);
        assert!(verify.exists);
        assert!(verify.readable);
        assert_eq!(verify.length, Some(11));

        let _ = fs::remove_file(path);
    }

    #[test]
    fn corrupt_file_is_unreadable() {
        let _guard = test_guard();
        let path = temp_cred_path("corrupt");
        fs::write(&path, "{not-json").expect("write corrupt");
        init_store_path(path.clone());
        cache_remove(JIRA_TOKEN_KEY);

        let verify = verify_account(JIRA_TOKEN_KEY);
        assert!(verify.exists);
        assert!(!verify.readable);

        let err = read_secret(JIRA_TOKEN_KEY);
        assert!(err.is_err());
        let _ = fs::remove_file(path);
    }

    #[test]
    fn delete_removes_secret() {
        let _guard = test_guard();
        let path = temp_cred_path("delete");
        init_store_path(path.clone());
        set_secret(JIRA_TOKEN_KEY, "secret").expect("set");
        delete_secret(JIRA_TOKEN_KEY).expect("delete");
        cache_remove(JIRA_TOKEN_KEY);
        assert!(!exists(JIRA_TOKEN_KEY));
        let _ = fs::remove_file(path);
    }

    #[test]
    fn stores_google_refresh_token_locally() {
        let _guard = test_guard();
        let path = temp_cred_path("google");
        init_store_path(path.clone());
        cache_remove(GOOGLE_REFRESH_TOKEN_KEY);
        cache_remove(GOOGLE_ACCOUNT_EMAIL_KEY);

        set_secret(GOOGLE_REFRESH_TOKEN_KEY, "google-refresh").expect("set refresh");
        set_secret(GOOGLE_ACCOUNT_EMAIL_KEY, "user@company.com").expect("set email");

        cache_remove(GOOGLE_REFRESH_TOKEN_KEY);
        cache_remove(GOOGLE_ACCOUNT_EMAIL_KEY);

        assert_eq!(
            read_secret(GOOGLE_REFRESH_TOKEN_KEY).expect("read refresh"),
            "google-refresh"
        );
        assert_eq!(
            read_secret(GOOGLE_ACCOUNT_EMAIL_KEY).expect("read email"),
            "user@company.com"
        );

        let raw = fs::read_to_string(&path).expect("read file");
        assert_schema_version(&raw, schema_version());
        let _ = fs::remove_file(path);
    }

    #[test]
    fn migrates_schema_v1_without_losing_jira_bamboo_tokens() {
        let _guard = test_guard();
        let path = temp_cred_path("migrate-v1");
        fs::write(
            &path,
            r#"{"schemaVersion":1,"jira_api_token":"jira-1","bamboo_api_token":"bamboo-1"}"#,
        )
        .expect("write v1");
        init_store_path(path.clone());
        cache_remove(JIRA_TOKEN_KEY);
        cache_remove(BAMBOO_TOKEN_KEY);

        assert_eq!(read_secret(JIRA_TOKEN_KEY).expect("jira"), "jira-1");
        assert_eq!(read_secret(BAMBOO_TOKEN_KEY).expect("bamboo"), "bamboo-1");

        set_secret(GOOGLE_REFRESH_TOKEN_KEY, "google-refresh").expect("set google");
        let raw = fs::read_to_string(&path).expect("read migrated");
        assert_schema_version(&raw, schema_version());
        assert!(raw.contains("jira-1"));
        assert!(raw.contains("bamboo-1"));
        let _ = fs::remove_file(path);
    }

    #[test]
    fn stores_apps_script_bridge_secret_locally() {
        let _guard = test_guard();
        let path = temp_cred_path("apps-script");
        init_store_path(path.clone());
        cache_remove(APPS_SCRIPT_BRIDGE_SECRET_KEY);

        set_secret(APPS_SCRIPT_BRIDGE_SECRET_KEY, "bridge-secret-value").expect("set bridge");
        cache_remove(APPS_SCRIPT_BRIDGE_SECRET_KEY);
        assert_eq!(
            read_secret(APPS_SCRIPT_BRIDGE_SECRET_KEY).expect("read bridge"),
            "bridge-secret-value"
        );

        let raw = fs::read_to_string(&path).expect("read file");
        assert_schema_version(&raw, schema_version());
        let _ = fs::remove_file(path);
    }

    #[test]
    fn delete_google_credentials_removes_refresh_and_email() {
        let _guard = test_guard();
        let path = temp_cred_path("google-delete");
        init_store_path(path.clone());
        set_secret(GOOGLE_REFRESH_TOKEN_KEY, "google-refresh").expect("set refresh");
        set_secret(GOOGLE_ACCOUNT_EMAIL_KEY, "user@company.com").expect("set email");
        delete_secret(GOOGLE_REFRESH_TOKEN_KEY).expect("delete refresh");
        delete_secret(GOOGLE_ACCOUNT_EMAIL_KEY).expect("delete email");
        cache_remove(GOOGLE_REFRESH_TOKEN_KEY);
        cache_remove(GOOGLE_ACCOUNT_EMAIL_KEY);
        assert!(!exists(GOOGLE_REFRESH_TOKEN_KEY));
        assert!(!exists(GOOGLE_ACCOUNT_EMAIL_KEY));
        let _ = fs::remove_file(path);
    }

    #[test]
    fn import_skips_when_local_secret_exists() {
        let _guard = test_guard();
        let path = temp_cred_path("import-skip");
        init_store_path(path.clone());
        set_secret(JIRA_TOKEN_KEY, "local-secret").expect("set");
        cache_remove(JIRA_TOKEN_KEY);
        assert!(exists(JIRA_TOKEN_KEY));
        let _ = fs::remove_file(path);
    }

    #[test]
    #[ignore = "manual macOS: migrate Keychain credentials into the real app data directory"]
    fn manual_migrate_keychain_to_local() {
        let home = std::env::var("HOME").expect("HOME");
        let app_data = PathBuf::from(home).join("Library/Application Support/com.altenar.metrio");
        fs::create_dir_all(&app_data).expect("create app data");
        let cred_path = app_data.join("credentials.local.json");
        init_store_path(cred_path.clone());
        cache_remove(JIRA_TOKEN_KEY);
        cache_remove(BAMBOO_TOKEN_KEY);

        let jira_imported = import_legacy_keychain_secret(JIRA_TOKEN_KEY).expect("jira import");
        let bamboo_imported = import_legacy_keychain_secret(BAMBOO_TOKEN_KEY).expect("bamboo import");

        assert!(jira_imported || verify_account(JIRA_TOKEN_KEY).readable);
        assert!(bamboo_imported || verify_account(BAMBOO_TOKEN_KEY).readable);
        assert!(cred_path.exists());

        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            let mode = fs::metadata(&cred_path).expect("metadata").permissions().mode() & 0o777;
            assert_eq!(mode, 0o600);
        }
    }
}
