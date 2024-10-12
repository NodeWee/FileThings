use crate::errors::BoxedError;
use serde_json::Value as JsonValue;
use std::path::Path;

pub fn load_json_file<P: AsRef<Path>>(path: P) -> Result<JsonValue, BoxedError> {
    let file = std::fs::File::open(path.as_ref())?;
    let json: JsonValue = serde_json::from_reader(file)?;
    Ok(json)
}

pub fn merge_json_value(target: &mut JsonValue, source: &JsonValue) {
    match (target, source) {
        (JsonValue::Object(target), JsonValue::Object(source)) => {
            for (k, v) in source {
                merge_json_value(target.entry(k.clone()).or_insert(JsonValue::Null), v);
            }
        }
        (target, source) => *target = source.clone(),
    }
}
