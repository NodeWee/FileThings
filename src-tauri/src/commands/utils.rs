use crate::errors::BoxedError;
use crate::thelib::file_path::split_file_path;
use serde_json::Value as JsonValue;

#[allow(dead_code)]
#[derive(Debug, Clone)]
pub struct FileConversionParams {
    pub input_file: String,
    pub is_bulk: bool,
    pub output_file: String,
    pub output_dir: String,
    pub src_ext: String,
    pub target_ext: String,
    pub actual_output_file: String,
}

impl FileConversionParams {
    pub fn new() -> Self {
        FileConversionParams {
            input_file: "".to_string(),
            is_bulk: false,
            output_file: "".to_string(),
            output_dir: "".to_string(),
            src_ext: "".to_string(),
            target_ext: "".to_string(),
            actual_output_file: "".to_string(),
        }
    }
}

pub fn parse_file_conversion_params(
    params: &JsonValue,
) -> Result<FileConversionParams, BoxedError> {
    let mut fcp = FileConversionParams::new();

    fcp.input_file = get_string_val_from_params(vec!["input_file", "input_path"], params)?;
    let (_, _, src_ext) = split_file_path(&fcp.input_file.as_str());
    fcp.src_ext = src_ext.to_lowercase();

    fcp.output_file = get_string_val_from_params(vec!["output_file", "output_path"], params)?;
    if fcp.output_file.is_empty() {
        return Err("parameter `output_file` is required".into());
    }
    let (_, _, target_ext) = split_file_path(&fcp.output_file.as_str());
    fcp.target_ext = target_ext.to_lowercase();

    fcp.actual_output_file = fcp.output_file.to_string();

    log::debug!("Parsed FileConversionParams: {:?}", fcp);

    Ok(fcp)
}

pub fn get_string_val_from_params(
    accept_keys: Vec<&str>,
    params: &JsonValue,
) -> Result<String, BoxedError> {
    let mut val: JsonValue = JsonValue::Null;
    let mut val_name: String = "".to_string();
    for key in &accept_keys {
        val = params[key].clone();
        if !val.is_null() {
            val_name = key.to_string();
            break;
        }
    }
    if val.is_null() {
        let key_str = accept_keys[0];
        return Err(format!("Missing parameter: {}", key_str).into());
    }

    let str_val = val
        .as_str()
        .ok_or(format!("Invalid parameter: {}", val_name))?;

    if str_val.is_empty() {
        return Err(format!("Missing value for parameter: {}", val_name).into());
    }

    Ok(str_val.to_string())
}
