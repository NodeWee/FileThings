use serde_json::Value as JsonValue;

#[derive(Debug, Default, Clone)]
pub struct CommandResult {
    pub content: JsonValue,
    pub status: String,
    pub message: String,
    pub output_paths: Vec<String>,
}

impl CommandResult {
    pub fn default() -> Self {
        Self {
            content: JsonValue::Null,
            status: "ok".to_string(),
            message: "".to_string(),
            output_paths: vec![],
        }
    }

    pub fn add_output_path(&mut self, path: &str) {
        self.output_paths.push(path.to_string());
    }

    pub fn to_json(&self) -> JsonValue {
        serde_json::json!({
            "content": self.content,
            "status": self.status,
            "message": self.message,
            "output_paths": self.output_paths,
        })
    }
}
