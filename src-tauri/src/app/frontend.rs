use crate::errors::BoxedError;
use serde_json::{json, Value as JsonValue};
use tauri::{Emitter, EventTarget};

#[allow(dead_code)]
/// Args:
/// - scope: "" or "toast", "dependency"
/// - data, use `pack_notify_data_toast` or `pack_notify_data_dependency` to generate
pub fn notify_user(
    app: &tauri::AppHandle,
    scope: &str,
    data: &JsonValue,
) -> Result<(), BoxedError> {
    let payload = json!({
    "scope": scope,
    "data": data,
    });

    app.emit_to(EventTarget::any(), "notify_user", Some(&payload))?;

    Ok(())
}

// /// info_type: "info", "error", "success"
// pub fn pack_notify_data_toast(info_type: &str, message: &str) -> JsonValue {
//     json!({
//         "type": info_type,
//         "message": message,
//     })
// }

// /// which_type: "software", "model"
// pub fn pack_notify_data_dependency(which_type: &str, name: &str, version: &str) -> JsonValue {
//     json!({
//         "type": which_type,
//         "name": name,
//         "version": version,
//     })
// }
