use crate::commands::structures::CommandResult;
use crate::commands::utils::get_string_val_from_params;
use crate::errors::BoxedError;
use crate::thelib;
use crate::thelib::file_count;
use crate::thelib::file_path::make_parent_dirs;
use base64::{engine::general_purpose::STANDARD as b64, Engine};
use regex::Regex;
use serde_json::{json, Value as JsonValue};
use std::path::Path;

pub fn rename_file(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let input_file = get_string_val_from_params(vec!["input_file", "input_path"], &params)?;
    let output_file = get_string_val_from_params(vec!["output_file", "output_path"], &params)?;

    // create parent directory if not exists
    if let Some(parent_dir) = std::path::Path::new(&output_file).parent() {
        if !parent_dir.exists() {
            std::fs::create_dir_all(parent_dir)?;
        }
    }

    match std::fs::rename(&input_file, &output_file) {
        Ok(_) => {} // do nothing
        Err(_) => {
            // for compatibility: if source file and target file are not on the same disk,
            // on Windows, it will report an error: System cannot move file to different drive. (os error 17)
            std::fs::copy(&input_file, &output_file)?;
            std::fs::remove_file(&input_file)?;
        }
    };

    let mut result = CommandResult::default();
    result.content = json!(true);
    result.add_output_path(&output_file);

    Ok(result)
}

pub fn copy_file(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let input_file = get_string_val_from_params(vec!["input_file", "input_path"], &params)?;
    let output_file = get_string_val_from_params(vec!["output_file", "output_path"], &params)?;

    // create parent directory if not exists
    if let Some(parent_dir) = std::path::Path::new(&output_file).parent() {
        if !parent_dir.exists() {
            std::fs::create_dir_all(parent_dir)?;
        }
    }

    std::fs::copy(&input_file, &output_file)?;

    let mut result = CommandResult::default();
    result.content = json!(true);
    result.add_output_path(&output_file);

    Ok(result)
}

/// clear specific files by name or path patterns
pub fn clear_files(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    // get input paths
    let mut input_paths = match params.get("input_paths") {
        Some(v) => v.as_array().ok_or("input_paths must be an array")?.clone(),
        None => vec![],
    };
    if input_paths.is_empty() {
        if let Some(paths) = params.get("paths") {
            if let Some(array) = paths.as_array() {
                input_paths = array.clone();
            } else {
                return Err("paths must be an array".into());
            }
        }
    }
    if input_paths.is_empty() {
        if let Some(input_dir) = params.get("input_dir") {
            input_paths.push(input_dir.clone());
        }
    }
    if input_paths.is_empty() {
        if let Some(input_file) = params.get("input_file") {
            input_paths.push(input_file.clone());
        }
    }
    if input_paths.is_empty() {
        return Err("Missing parameter `input_paths`".into());
    }

    // transform input paths to string
    let input_paths_arr: Vec<String> = input_paths
        .iter()
        .map(|p| p.as_str().unwrap_or("").to_string())
        .collect();
    // filter out empty paths
    let input_paths_arr: Vec<String> = input_paths_arr
        .iter()
        .filter(|p| !p.is_empty())
        .map(|p| p.clone())
        .collect();

    // get patterns
    let include_name_patterns = match params["includes"]["name_patterns"].as_array() {
        Some(v) => v.clone(),
        None => Vec::new(),
    };
    let include_path_patterns = match params["includes"]["path_patterns"].as_array() {
        Some(v) => v.clone(),
        None => Vec::new(),
    };

    let mut include_name_matchers: Vec<Regex> = Vec::new();
    if !include_name_patterns.is_empty() {
        for pattern in &include_name_patterns {
            let pat = pattern.as_str().unwrap_or("");
            if pat.is_empty() {
                return Err(format!("Invalid include name patterns:{:?}", pattern).into());
            }
            let matcher = match Regex::new(pat) {
                Ok(v) => v,
                Err(e) => {
                    return Err(format!(
                        "Invalid include name patterns:{:?},error:{:?}",
                        pattern, e
                    )
                    .into());
                }
            };
            include_name_matchers.push(matcher);
        }
    }
    let mut include_path_matchers: Vec<Regex> = Vec::new();
    if !include_path_patterns.is_empty() {
        for pattern in &include_path_patterns {
            let pat = pattern.as_str().unwrap_or("");
            if pat.is_empty() {
                return Err(format!("Invalid include path patterns:{:?}", pattern).into());
            }
            let matcher = match Regex::new(pat) {
                Ok(v) => v,
                Err(e) => {
                    return Err(format!(
                        "Invalid include path patterns:{:?},error:{:?}",
                        pattern, e
                    )
                    .into());
                }
            };
            include_path_matchers.push(matcher);
        }
    }

    let mut count_deleted = 0;

    for path_str in &input_paths_arr {
        let path = std::path::Path::new(&path_str);
        if !path.exists() {
            continue;
        }

        if path.is_file() {
            let filename = match path.file_name() {
                Some(v) => v.to_str().unwrap_or(""),
                None => "",
            };
            if filename.is_empty() {
                continue;
            }
            let mut is_match = false;
            for matcher in &include_name_matchers {
                if matcher.is_match(filename) {
                    is_match = true;
                    break;
                }
            }
            if !is_match {
                for matcher in &include_path_matchers {
                    if matcher.is_match(&path_str) {
                        is_match = true;
                        break;
                    }
                }
            }

            if is_match {
                std::fs::remove_file(path)?;
                count_deleted += 1;
            }
        } else if path.is_dir() {
            let entries = match std::fs::read_dir(path) {
                Ok(v) => v,
                Err(e) => {
                    log::error!("Error reading directory:{:?},error:{:?}", path, e);
                    continue;
                }
            };

            for entry in entries {
                let entry = match entry {
                    Ok(v) => v,
                    Err(e) => {
                        log::error!("Error reading entry:{:?}", e);
                        continue;
                    }
                };
                let entry_path = entry.path();
                let entry_path_str = entry_path.to_str().unwrap_or("");
                if entry_path_str.is_empty() {
                    continue;
                }
                let sub_params = json!({
                    "input_paths": [entry_path_str],
                    "include": {
                        "name_patterns": include_name_patterns.clone(),
                        "path_patterns": include_path_patterns.clone(),
                    },
                });
                let sub_rst = clear_files(&sub_params)?;
                count_deleted += sub_rst.content.as_u64().unwrap_or(0);
            }
        }
    }

    let mut result = CommandResult::default();
    result.content = json!(count_deleted);
    result.message = format!("{}", count_deleted);

    Ok(result)
}

pub fn get_basic_info(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let input_file = get_string_val_from_params(vec!["input_file", "input_path"], &params)?;

    let attrs = thelib::file_attribute::get_basic(&input_file)?;

    let mut result = CommandResult::default();
    result.content = json!(attrs);

    // sleep for 3 seconds for testing
    // std::thread::sleep(std::time::Duration::from_secs(3));

    Ok(result)
}

pub fn get_metadata_info(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let input_file = get_string_val_from_params(vec!["input_file", "input_path"], &params)?;

    let attrs = thelib::file_attribute::get_metadata(&input_file)?;

    let mut result = CommandResult::default();
    result.content = json!(attrs);

    Ok(result)
}

pub fn split_file_in_bytes(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let input_file = get_string_val_from_params(vec!["input_file", "input_path"], &params)?;

    let chunk_size: u64 = match params.get("chunk_size") {
        Some(v) => v.as_u64().ok_or("chunk_size must be an integer")?,
        None => 1024 * 1024,
    };

    let output_dir = get_string_val_from_params(vec!["output_dir"], &params)?;

    let output_files = thelib::file_binary::split_in_bytes(&input_file, chunk_size, &output_dir)?;

    let mut result = CommandResult::default();
    result.output_paths = output_files;

    Ok(result)
}

pub fn join_files_in_bytes(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let input_file = get_string_val_from_params(vec!["input_file", "input_path"], &params)?;
    // only accept .001 file
    if !input_file.ends_with(".001") {
        return Err("Not found .001 file".into());
    }

    let file_name = std::path::Path::new(&input_file)
        .file_name()
        .ok_or("Invalid file name")?
        .to_str()
        .ok_or("Failed to convert to str")?
        .trim_end_matches(".001");

    let mut output_file: String = match params.get("output_file") {
        Some(v) => v
            .as_str()
            .ok_or("Invalid parameter `output_file`")?
            .to_string(),
        None => "".to_string(),
    };
    if output_file.is_empty() {
        output_file = input_file.trim_end_matches(".001").to_string();
    }

    // get all input files from the same directory by increasing number sequence (e.g. .001, .002, .003, ...)
    let input_dir = std::path::Path::new(&input_file)
        .parent()
        .ok_or("Invalid parent directory")?;
    let mut input_files_arr: Vec<String> = Vec::new();
    for i in 1.. {
        let file = input_dir.join(format!("{}.{:03}", file_name, i));
        if file.exists() {
            input_files_arr.push(file.to_str().ok_or("Invalid file path")?.to_string());
        } else {
            break;
        }
    }

    let actual_output_file = thelib::file_binary::join_in_bytes(&input_files_arr, &output_file)?;

    let mut result = CommandResult::default();
    result.add_output_path(&actual_output_file);

    Ok(result)
}

pub fn count_files(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let input_paths = match &params.get("input_paths") {
        Some(v) => v.as_array().ok_or("`input_paths` must be an array")?,
        None => return Err("`input_paths` is required".into()),
    };

    let input_paths_arr: Vec<&str> = input_paths
        .iter()
        .map(|p| p.as_str().unwrap_or(""))
        .collect();
    // filter out empty paths
    let input_paths_arr: Vec<&str> = input_paths_arr
        .iter()
        .filter(|p| !p.is_empty())
        .map(|p| *p)
        .collect();

    let data = file_count::count_in_paths(input_paths_arr)?;

    let mut result = CommandResult::default();
    result.content = data;
    Ok(result)
}

pub fn get_file_name(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let input_file = get_string_val_from_params(vec!["input_file", "input_path"], &params)?;

    let file_name = std::path::Path::new(&input_file)
        .file_name()
        .ok_or("Invalid file name")?
        .to_str()
        .ok_or("Failed to convert to str")?;

    let mut result = CommandResult::default();
    result.content = json!(file_name);
    Ok(result)
}

pub fn get_file_extension(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let input_file = get_string_val_from_params(vec!["input_file", "input_path"], &params)?;

    let (_, _, ext) = thelib::file_path::split_file_path(&input_file);

    let mut result = CommandResult::default();
    result.content = json!(ext);
    Ok(result)
}

pub fn read_file(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let input_file = get_string_val_from_params(vec!["input_file", "input_path"], &params)?;
    if !Path::new(&input_file).is_file() {
        return Err(format!("File not found: '{}'", &input_file).into());
    }

    let format = match params.get("format") {
        Some(v) => v.as_str().ok_or("format must be a string")?,
        None => "text",
    };

    let content: JsonValue = match format {
        "text" => {
            let content = std::fs::read_to_string(&input_file)?;
            json!(content)
        }
        "base64" => {
            let content = std::fs::read(&input_file)?;
            let encoded = b64.encode(&content);
            json!(encoded)
        }
        "bytes" => {
            let content = std::fs::read(&input_file)?;
            json!(content)
        }
        _ => {
            return Err(format!(
                "Invalid format: '{}'. Must be 'text', 'base64' or 'bytes'",
                format
            )
            .into())
        }
    };

    let mut result = CommandResult::default();
    result.content = content;

    Ok(result)
}

pub fn write_file(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let output_file = get_string_val_from_params(vec!["output_file", "output_path"], &params)?;

    let format = match params.get("format") {
        Some(v) => v.as_str().ok_or("format must be a string")?,
        None => "text",
    };

    let content_json = match params.get("content") {
        Some(v) => v,
        None => return Err("content is required".into()),
    };

    // write to file
    make_parent_dirs(&output_file)?;

    match format {
        "text" => {
            let content = content_json.as_str().ok_or("content must be a string")?;
            std::fs::write(&output_file, content)?;
        }
        "base64" => {
            let content = content_json.as_str().ok_or("content must be a string")?;
            let bytes = b64.decode(content.as_bytes())?;
            std::fs::write(&output_file, bytes)?;
        }
        "bytes" => {
            let content = content_json.as_array().ok_or("content must be an array")?;
            let bytes: Vec<u8> = content
                .iter()
                .map(|v| v.as_u64().unwrap_or(0) as u8)
                .collect();
            std::fs::write(&output_file, bytes)?;
        }
        _ => {
            return Err(format!(
                "Invalid format: '{}'. Must be 'text', 'base64' or 'bytes'",
                format
            )
            .into())
        }
    }

    let mut result = CommandResult::default();
    result.content = json!(true);
    result.add_output_path(&output_file);

    Ok(result)
}

pub fn hash_file(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let input_file = get_string_val_from_params(vec!["input_file", "input_path"], &params)?;

    let hash_type = match params.get("hash_type") {
        Some(v) => v.as_str().ok_or("hash_type must be a string")?,
        None => "md5",
    };

    let hash = match hash_type {
        "md5" => thelib::hash::calc_md5(&std::fs::read(&input_file)?),
        "sha1" => thelib::hash::calc_sha1(&std::fs::read(&input_file)?),
        "sha256" => thelib::hash::calc_sha256(&std::fs::read(&input_file)?),
        "sha512" => thelib::hash::calc_sha512(&std::fs::read(&input_file)?),
        _ => return Err(format!("Invalid hash type: '{}'", hash_type).into()),
    };

    let mut result = CommandResult::default();
    result.content = json!(hash);

    Ok(result)
}
