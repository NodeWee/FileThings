use crate::commands;
// use crate::commands::structures::CommandResult;
use crate::errors::{pack_called_error, CallError};
use serde_json::Value as JsonValue;

// shell command whitelist
const SHELL_COMMAND_WHITELIST: [&str; 1] = ["shell.xattr"];

pub async fn route(
    _app: &tauri::AppHandle,
    command_name: &str,
    command_params: &str,
) -> Result<String, CallError> {
    log::debug!(
        "file function's command caller route: {}, args: {}",
        command_name,
        command_params
    );

    if command_name.is_empty() {
        return pack_called_error("file function's command caller name is empty");
    }

    // security check - only allow whitelist shell commands
    if command_name.starts_with("shell.") {
        if !SHELL_COMMAND_WHITELIST.contains(&command_name) {
            return pack_called_error("shell command is not allowed");
        }
    }

    let args_json: JsonValue = match serde_json::from_str(&command_params) {
        Ok(args) => args,
        Err(e) => {
            return pack_called_error(&format!(
                "Failed to unpack command_params: {}",
                e.to_string()
            ));
        }
    };

    let cmd_rst = match commands::command_router::route(&command_name, &args_json).await {
        Ok(v) => v,
        Err(e) => {
            log::error!(
                "Failed do file function's command caller: {}, args: {}, error: {}",
                command_name,
                command_params,
                e
            );
            return pack_called_error(e.to_string().as_str());
        }
    };

    Ok(cmd_rst.to_json().to_string())
}
