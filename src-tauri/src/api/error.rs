use serde::Serialize;

#[derive(Debug, Serialize)]
pub struct ApiError {
    pub code: String,
    pub message: String,
    pub status: Option<u16>,
    pub url: Option<String>,
}

impl From<String> for ApiError {
    fn from(value: String) -> Self {
        ApiError::new("internal_error", value)
    }
}

impl ApiError {
    pub fn new(code: impl Into<String>, message: impl Into<String>) -> Self {
        Self {
            code: code.into(),
            message: message.into(),
            status: None,
            url: None,
        }
    }

    pub fn with_status(mut self, status: u16) -> Self {
        self.status = Some(status);
        self
    }

    pub fn with_url(mut self, url: impl Into<String>) -> Self {
        self.url = Some(url.into());
        self
    }
}

pub fn sanitize_body(text: &str) -> String {
    let trimmed = text.trim();
    if trimmed.is_empty() {
        return "Empty response body".to_string();
    }
    if trimmed.len() > 500 {
        return format!("{}…", trimmed.chars().take(500).collect::<String>());
    }
    trimmed.to_string()
}
