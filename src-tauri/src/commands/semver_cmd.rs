use crate::commands::structures::CommandResult;
use crate::errors::BoxedError;
use crate::thelib::version::compare_semver;
use serde_json::{json, Value as JsonValue};

pub fn compare(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let mut result = CommandResult::default();

    let version1 = match &params.get("version1") {
        Some(v) => v.as_str().ok_or("`version1` must be a string")?,
        None => return Err("`version1` is required".into()),
    };
    let version2 = match &params.get("version2") {
        Some(v) => v.as_str().ok_or("`version2` must be a string")?,
        None => return Err("`version2` is required".into()),
    };
    let operator = match &params.get("operator") {
        Some(v) => v.as_str().ok_or("`operator` must be a string")?,
        None => return Err("`operator` is required".into()),
    };

    let compared = compare_semver(version1, &operator, version2)?;
    result.content = json!(compared);

    Ok(result)
}
