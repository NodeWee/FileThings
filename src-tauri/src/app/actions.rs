use crate::commands;
use crate::errors::{pack_called_error, BoxedError, CallError};
use crate::functions;
use crate::thelib;
use serde_json::{json, Value as JsonValue};
use tauri::Manager;

pub async fn route(_app: &tauri::AppHandle, action: &str, args: &str) -> Result<String, CallError> {
    let action_params: JsonValue = match serde_json::from_str(&args) {
        Ok(args) => args,
        Err(e) => {
            return pack_called_error(&format!(
                "Failed to unpack action_params: {}",
                e.to_string()
            ));
        }
    };

    let result: Result<JsonValue, BoxedError> = match action {
        "open.dev_tools" => {
            // only in debug mode
            #[cfg(debug_assertions)]
            {
                let win = match _app.get_webview_window("main") {
                    Some(w) => w,
                    None => return pack_called_error("Failed to get main window"),
                };
                win.open_devtools();
            }
            Ok(json!({}))
        }
        "is.dev" => Ok(json!(thelib::sys::is_dev())),
        "log.info" => {
            log::info!("log.info: {:?}", action_params);
            Ok(json!({}))
        }
        "log.error" => {
            log::error!("log.error: {:?}", action_params);
            Ok(json!({}))
        }
        // load file functions
        "load.file.functions" => match functions::file::read::load_functions() {
            Ok(_) => Ok(json!("ok")),
            Err(e) => Err(e.into()),
        },
        // load tool functions
        "load.tools" => match functions::tool::read::load_tools() {
            Ok(_) => Ok(json!("ok")),
            Err(e) => Err(e.into()),
        },

        // else, as command
        _ => {
            let cmd_result = match commands::command_router::route(&action, &action_params).await {
                Ok(v) => v,
                Err(e) => {
                    log::error!("Failed do action `{}`: {}", action, e.to_string());
                    return pack_called_error(e.to_string().as_str());
                }
            };
            Ok(cmd_result.to_json())
        }
    };

    match result {
        Ok(v) => Ok(v.to_string()),
        Err(e) => {
            log::error!("Failed do action `{}`: {}", action, e.to_string());
            pack_called_error(e.to_string().as_str())
        }
    }
}
