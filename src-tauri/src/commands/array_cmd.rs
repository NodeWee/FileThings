use crate::commands::structures::CommandResult;
use crate::errors::BoxedError;
use serde_json::{json, Value as JsonValue};

pub fn get_item(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let mut result = CommandResult::default();

    let arr = match &params.get("array") {
        Some(v) => v.as_array().ok_or("`array` must be an array")?,
        None => return Err("`array` is required".into()),
    };
    let input_idx = match &params.get("index") {
        Some(v) => v.as_i64().ok_or("`index` must be an integer")?,
        None => return Err("`index` is required".into()),
    };

    let idx = if input_idx < 0 {
        let abs_idx = input_idx.abs() as usize;
        if abs_idx > arr.len() {
            return Err("Index out of range".into());
        }
        arr.len() as i64 + input_idx
    } else {
        input_idx
    };

    let item = arr.get(idx as usize).ok_or("Index out of range")?;

    result.content = json!(item);

    Ok(result)
}
