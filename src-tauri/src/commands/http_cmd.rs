use crate::commands::structures::CommandResult;
use crate::commands::utils::get_string_val_from_params;
use crate::errors::BoxedError;
use crate::thelib;
use serde_json::json;
use serde_json::Value as JsonValue;
use std::collections::HashMap;
use std::path::Path;

pub async fn download_file(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let url = match params["url"].as_str() {
        Some(v) => v,
        None => return Err("`url` is required".into()),
    };
    let output_file: String =
        get_string_val_from_params(vec!["output_file", "output_path"], params)?;

    let resume = match params["resume"].as_bool() {
        Some(v) => v,
        None => false,
    };

    // Parse headers from params
    let headers: Option<HashMap<String, String>> = params["headers"].as_object().map(|obj| {
        obj.iter()
            .map(|(k, v)| (k.clone(), v.as_str().unwrap_or("").to_string()))
            .collect()
    });

    let file_path = Path::new(output_file.as_str());
    match thelib::download::download_file(
        url,
        &file_path.to_path_buf(),
        &headers,
        resume,
        &reqwest::Client::new(),
    )
    .await
    {
        Ok(_) => {
            let mut result = CommandResult::default();
            result.content = json!(output_file);
            result.status = "ok".to_string();
            result.message = "File downloaded successfully".to_string();
            result.output_paths.push(output_file.to_string());
            Ok(result)
        }
        Err(e) => Err(e),
    }
}
