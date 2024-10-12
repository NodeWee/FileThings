use crate::errors::BoxedError;
use crate::functions::tool::read::{check_tool_available, get_bin_path};
use crate::thelib::shell::exec_command;
use serde_json::{json, Value as JsonValue};

const EXIFTOOL_TOOL_NAME: &str = "tool.exe.exiftool";
const MISSING_TOOL_MESSAGE_TEMPLATE: &str = "Tool `{}` not available, please install it first.";

pub fn get_file_metadata(file_path: &str) -> Result<JsonValue, BoxedError> {
    // check exiftool exists
    let is_exists = match check_tool_available(EXIFTOOL_TOOL_NAME) {
        Ok(exists) => exists,
        Err(e) => return Err(e),
    };
    if !is_exists {
        let msg = MISSING_TOOL_MESSAGE_TEMPLATE.replace("{}", EXIFTOOL_TOOL_NAME);
        log::error!("{}", msg);
        return Err(msg.into());
    }

    // use exiftool to get all metadata
    let cmd = get_bin_path(EXIFTOOL_TOOL_NAME)?;
    let cmd_args = vec!["-j", "-g", file_path]; // -j: json format, -g: group by tag
                                                // if path is dir, will return empty string
    let cmd_out = exec_command(&cmd, cmd_args)?.trim().to_string();
    if cmd_out.is_empty() {
        return Ok(json!({}));
    }
    let arr: JsonValue = serde_json::from_str(&cmd_out)?;
    let exiftool_meta = arr[0].clone();

    return Ok(exiftool_meta);
}
