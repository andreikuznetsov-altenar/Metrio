//! Keeps the Metrio webview on Metrio: any top-level navigation to a foreign http(s) site is
//! cancelled and the URL is handed to the system default browser instead.

use tauri::plugin::{Builder, TauriPlugin};
use tauri::{Runtime, Url};

/// What to do with a navigation request.
#[derive(Debug, PartialEq, Eq)]
pub enum NavigationDecision {
    /// Let the webview load it (app assets, dev server, in-page schemes).
    Allow,
    /// Cancel it and open the URL in the system browser.
    OpenExternally,
    /// Cancel it silently (unsupported scheme).
    Block,
}

pub fn navigation_decision(url: &Url) -> NavigationDecision {
    match url.scheme() {
        // Packaged app assets and in-document content.
        "tauri" | "asset" | "about" | "blob" | "data" | "ipc" => NavigationDecision::Allow,
        "http" | "https" => {
            let host = url.host_str().unwrap_or("");
            if matches!(host, "localhost" | "127.0.0.1" | "[::1]" | "tauri.localhost" | "ipc.localhost" | "asset.localhost")
                || host.ends_with(".localhost")
            {
                NavigationDecision::Allow
            } else {
                NavigationDecision::OpenExternally
            }
        }
        "mailto" | "tel" => NavigationDecision::OpenExternally,
        _ => NavigationDecision::Block,
    }
}

pub fn plugin<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("metrio-external-navigation")
        .on_navigation(|_webview, url| match navigation_decision(url) {
            NavigationDecision::Allow => true,
            NavigationDecision::OpenExternally => {
                let _ = tauri_plugin_opener::open_url(url.as_str(), None::<&str>);
                false
            }
            NavigationDecision::Block => false,
        })
        .build()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn decide(url: &str) -> NavigationDecision {
        navigation_decision(&Url::parse(url).unwrap())
    }

    #[test]
    fn app_and_dev_server_urls_stay_in_the_webview() {
        assert_eq!(decide("tauri://localhost/index.html"), NavigationDecision::Allow);
        assert_eq!(decide("http://localhost:1420/#foundation"), NavigationDecision::Allow);
        assert_eq!(decide("http://tauri.localhost/"), NavigationDecision::Allow);
        assert_eq!(decide("about:blank"), NavigationDecision::Allow);
    }

    #[test]
    fn jira_and_other_sites_go_to_the_system_browser() {
        assert_eq!(decide("https://altenar.atlassian.net/browse/UX-1502"), NavigationDecision::OpenExternally);
        assert_eq!(decide("https://example.bamboohr.com/home"), NavigationDecision::OpenExternally);
        assert_eq!(decide("http://evil.example.com/"), NavigationDecision::OpenExternally);
        assert_eq!(decide("mailto:a@b.com"), NavigationDecision::OpenExternally);
        // look-alike hosts must not be mistaken for localhost
        assert_eq!(decide("https://localhost.evil.com/"), NavigationDecision::OpenExternally);
    }

    #[test]
    fn unsupported_schemes_are_blocked() {
        assert_eq!(decide("file:///etc/passwd"), NavigationDecision::Block);
        assert_eq!(decide("javascript:alert(1)"), NavigationDecision::Block);
    }
}
