use crate::commands::structures::CommandResult;
use crate::errors::BoxedError;
use crate::thelib::shell::exec_command;
use serde_json::{json, Value as JsonValue};

pub fn open_url(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    // use default browser to open link

    let url = match &params.get("url") {
        Some(v) => v.as_str().ok_or("`url` must be a string")?,
        None => return Err("`url` is required".into()),
    };

    let (cmd, cmd_args): (&str, Vec<&str>);

    // - on macOS, use `open`
    #[cfg(target_os = "macos")]
    {
        cmd = "open";
        cmd_args = vec![url];
    }

    // - on windows, use `powershell start`
    #[cfg(target_os = "windows")]
    {
        cmd = "powershell";
        cmd_args = vec!["start", url];
    }

    // - on linux, use `xdg-open`
    #[cfg(target_os = "linux")]
    {
        cmd = "xdg-open";
        cmd_args = vec![url];
    }

    match exec_command(cmd, cmd_args) {
        Ok(v) => {
            let mut result = CommandResult::default();
            result.content = json!(url);
            result.message = v;
            Ok(result)
        }
        Err(e) => Err(e),
    }
}
