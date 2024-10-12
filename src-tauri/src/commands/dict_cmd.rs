use crate::commands::structures::CommandResult;
use crate::errors::BoxedError;
use serde_json::Value as JsonValue;

#[allow(dead_code)]
pub fn get_value(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let dict = match &params.get("dict") {
        Some(v) => v.as_object().ok_or("`dict` must be an object")?,
        None => return Err("`dict` is required".into()),
    };
    let key_path: &str = match &params.get("key_path") {
        Some(v) => v.as_str().ok_or("`key_path` must be a string")?,
        None => return Err("`key_path` is required".into()),
    };
    // key_path example: `key` or  `key.sub_key.sub_sub_key`

    let mut result = CommandResult::default();

    let keys: Vec<&str> = key_path.split('.').collect();
    let mut value: &JsonValue = &JsonValue::Object(dict.clone());
    for key in keys {
        value = value.get(key).ok_or(format!("Key not found: {}", key))?;
    }

    result.content = value.clone();

    Ok(result)
}
