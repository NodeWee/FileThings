use crate::commands::structures::CommandResult;
use crate::commands::utils::get_string_val_from_params;
use crate::errors::BoxedError;
use crate::thelib;
use serde_json::json;
use serde_json::Value as JsonValue;
use std::path::Path;

pub fn unzip_file(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let input_file = get_string_val_from_params(vec!["input_file", "input_path"], params)?;

    let output_dir = get_string_val_from_params(vec!["output_dir"], params)?;

    let input_file_path = Path::new(&input_file);
    let output_dir_path = Path::new(&output_dir);

    thelib::compress::unzip_to(input_file_path, output_dir_path)?;

    let mut result = CommandResult::default();
    result.content = json!(output_dir);
    result.status = "ok".to_string();
    result.message = "File unzipped successfully".to_string();
    result.output_paths.push(output_dir.to_string());

    Ok(result)
}
