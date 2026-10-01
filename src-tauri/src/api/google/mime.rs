use base64::Engine;

pub fn build_raw_message(to: &str, subject: &str, html_body: &str) -> String {
    let mime = format!(
        "To: {to}\r\nSubject: {subject}\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=UTF-8\r\n\r\n{html_body}",
        to = to,
        subject = subject,
        html_body = html_body
    );
    base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(mime.as_bytes())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn base64url_encodes_without_padding() {
        let raw = build_raw_message("a@b.com", "Hello", "<p>Test</p>");
        assert!(!raw.contains('='));
        assert!(!raw.is_empty());
    }
}
