use crate::commands::structures::CommandResult;
use crate::errors::BoxedError;
use crate::thelib;
use trash;

use crate::app::resource::get_app_data_dir;
use crate::commands::utils::get_string_val_from_params;
use crate::functions::file::methods::get_supported_file_functions;
use crate::thelib::file_find::reveal_path;
use crate::thelib::file_path;
use crate::thelib::file_path::{
    count_files_and_dirs_to_check_bulk, get_absolute_path_with_home_dir, get_all_extensions,
    get_relative_path_with_home_dir,
};
use serde_json::json;
use serde_json::Value as JsonValue;
use std::collections::HashMap;
use std::collections::HashSet;
use std::path::{Path, PathBuf};

pub fn is_exists(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let input_path = get_string_val_from_params(vec!["input_path", "path"], &params)?;
    if input_path.is_empty() {
        return Err("parameter `input_path` is required".into());
    }

    let exists = std::path::Path::new(&input_path).exists();

    let mut result = CommandResult::default();
    result.content = json!(exists);

    Ok(result)
}

pub fn relative_with_home_dir(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let input_paths = match params.get("input_paths") {
        Some(paths) => paths.as_array().ok_or("input_paths must be an array")?,
        None => return Err("input_paths is required".into()),
    };
    let mut rel_paths: Vec<String> = Vec::new();
    for path in input_paths {
        let path_str = path
            .as_str()
            .ok_or(format!("path must be a string: {:?}", path))?;
        let rel_path = get_relative_path_with_home_dir(path_str);
        rel_paths.push(rel_path);
    }

    let mut result = CommandResult::default();
    result.content = json!(&rel_paths);

    Ok(result)
}

pub fn absolute_with_home_dir(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let input_paths = match params.get("input_paths") {
        Some(paths) => paths.as_array().ok_or("input_paths must be an array")?,
        None => return Err("input_paths is required".into()),
    };
    let mut abs_paths: Vec<String> = Vec::new();
    for path in input_paths {
        let path_str = path
            .as_str()
            .ok_or(format!("path must be a string: {:?}", path))?;
        let abs_path = get_absolute_path_with_home_dir(path_str);
        abs_paths.push(abs_path);
    }

    let mut result = CommandResult::default();
    result.content = json!(&abs_paths);

    Ok(result)
}

pub fn parse_for_task(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let input_paths = params["input_paths"]
        .as_array()
        .ok_or("Missing input_paths")?;
    let paths_set: HashSet<String> = input_paths
        .iter()
        .map(|path| path.as_str().unwrap_or("").to_string())
        .collect();

    // 1. file dir, stem, ext, is_dir, is_file, is_exist
    let mut path_items: Vec<HashMap<String, JsonValue>> = Vec::new();
    for path_str in paths_set.iter() {
        let (path_dir, path_stem, mut path_ext) = file_path::split_file_path(path_str);
        let path = Path::new(path_str);
        if path.is_dir() {
            path_ext = "".to_string();
        }
        let rel_path_str = get_relative_path_with_home_dir(path_str);

        let path_item = {
            let mut m: HashMap<String, JsonValue> = HashMap::new();
            m.insert("full".to_string(), json!(path_str.to_string()));
            m.insert("rel_full".to_string(), json!(rel_path_str));
            m.insert("dir".to_string(), json!(path_dir));
            m.insert("stem".to_string(), json!(path_stem));
            m.insert("ext".to_string(), json!(path_ext));
            m.insert("is_dir".to_string(), json!(path.is_dir()));
            m.insert("is_file".to_string(), json!(path.is_file()));
            m.insert("is_exist".to_string(), json!(path.exists()));
            m
        };
        path_items.push(path_item);
    }
    // sort path_items by full path
    path_items.sort_by(|a, b| {
        a.get("full")
            .unwrap_or(&json!("".to_string()))
            .as_str()
            .cmp(&b.get("full").unwrap_or(&json!("".to_string())).as_str())
    });

    // 2. supported things
    let file_exts_string: HashSet<String> = get_all_extensions(&paths_set, 500);
    let file_exts: HashSet<&str> = file_exts_string.iter().map(|ext| ext.as_str()).collect();
    let supported_file_functions: JsonValue = get_supported_file_functions(file_exts.clone())?;

    // 3. is multiple files or dirs
    let to_check_paths: Vec<&Path> = paths_set.iter().map(|p| Path::new(p)).collect();
    let (file_num, dir_num) = count_files_and_dirs_to_check_bulk(to_check_paths);
    let is_multiple_files = file_num > 1;
    let is_multiple_dirs = dir_num > 1;

    let mut result = CommandResult::default();
    result.content = json!({
        "paths": path_items,
        "file_exts": file_exts,
        "file_functions": supported_file_functions,
        "is_multiple_files": is_multiple_files,
        "is_multiple_dirs": is_multiple_dirs,
    });

    Ok(result)
}

pub fn split_path(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let file_path = get_string_val_from_params(vec!["file_path", "path"], &params)?;
    let (path_dir, path_stem, path_ext) = file_path::split_file_path(&file_path);

    let mut result = CommandResult::default();
    result.content = json!({
        "dir": path_dir,
        "stem": path_stem,
        "ext": path_ext.to_lowercase(),
    });

    Ok(result)
}

/// get: is_exists, is_file, is_dir, parent_dir, file_name, file_stem, file_ext, sub_names, sub_paths
pub fn read_path(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let file_path = get_string_val_from_params(vec!["file_path", "path"], &params)?;
    let list_sub_names: bool = match params.get("list_sub_names") {
        Some(s) => s.as_bool().unwrap_or(false),
        None => false,
    };
    let list_sub_paths: bool = match params.get("list_sub_paths") {
        Some(s) => s.as_bool().unwrap_or(false),
        None => false,
    };

    let mut result = CommandResult::default();
    let path = Path::new(&file_path);
    result.content = json!({
        "is_exists": path.exists(),
        "is_file": path.is_file(),
        "is_dir": path.is_dir(),
    });

    let (path_dir, path_stem, path_ext) = file_path::split_file_path(&file_path);
    result.content["parent_dir"] = json!(path_dir);
    result.content["file_name"] = json!(path.file_name().unwrap_or_default().to_string_lossy());
    result.content["file_stem"] = json!(path_stem);
    result.content["file_ext"] = json!(path_ext.to_lowercase());

    if path.is_dir() && list_sub_names {
        let sub_names = thelib::file_find::dir_list(&file_path, ".*", false, false, false)?;
        result.content["sub_names"] = json!(sub_names);
    }
    if path.is_dir() && list_sub_paths {
        let sub_paths = thelib::file_find::dir_list(&file_path, ".*", true, false, false)?;
        result.content["sub_paths"] = json!(sub_paths);
    }

    Ok(result)
}

pub fn make_unused_file_path(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let input_file = get_string_val_from_params(vec!["input_file", "input_path"], &params)?;

    let ext_param =
        get_string_val_from_params(vec!["ext", "extension", "to_format", "format"], &params);
    let ext: Option<&str> = match ext_param {
        Ok(ref e) => Some(e.as_str()),
        Err(_) => None,
    };

    let new_path = file_path::get_unique_filepath(&input_file, None, ext)?;

    let mut result = CommandResult::default();
    result.content = json!(new_path);

    Ok(result)
}

pub fn locate_path(parameters: &JsonValue) -> Result<CommandResult, BoxedError> {
    let result = CommandResult::default();

    let input_paths = parameters["input_paths"]
        .as_array()
        .ok_or("Missing input_paths")?;

    for path in input_paths {
        // 忽略错误的路径
        let path = match path.as_str() {
            Some(p) => p,
            None => continue,
        };
        // 忽略空路径
        if path.is_empty() {
            continue;
        }

        // 如果 path 是相对路径, 则转换为绝对路径
        let abs_path = get_absolute_path_with_home_dir(path);

        // 忽略不存在的路径
        if !Path::new(&abs_path).exists() {
            continue;
        }

        reveal_path(&abs_path.as_str());
    }

    Ok(result)
}

pub fn locate_app_data_dir(_params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let app_data_dir: PathBuf = get_app_data_dir()?;
    let new_params = json!({
        "input_paths": [app_data_dir]
    });

    locate_path(&new_params)
}

pub fn join_path(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let mut result = CommandResult::default();

    let parts = match &params.get("parts") {
        Some(v) => v.as_array().ok_or("`parts` must be an array")?,
        None => return Err("`parts` is required".into()),
    };

    let path = Path::new(parts[0].as_str().unwrap_or(""));
    let joined_path = parts
        .iter()
        .skip(1)
        .fold(path.to_path_buf(), |mut acc, part| {
            acc.push(part.as_str().unwrap_or(""));
            acc
        });

    result.content = json!(joined_path);

    log::debug!("joined path: {:?}", joined_path);

    Ok(result)
}

pub fn dir_list(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let input_dir = get_string_val_from_params(vec!["input_dir", "dir"], &params)?;

    let regex_pattern = match params.get("pattern") {
        Some(s) => s.as_str().ok_or("regex `pattern` must be a string")?,
        None => ".*",
    };

    let is_full_path: bool = match params.get("is_full_path") {
        Some(s) => s.as_bool().ok_or("is_full_path must be a boolean")?,
        None => false,
    };

    let ignore_file: bool = match params.get("ignore_file") {
        Some(s) => s.as_bool().ok_or("ignore_file must be a boolean")?,
        None => false,
    };
    let ignore_dir: bool = match params.get("ignore_dir") {
        Some(s) => s.as_bool().ok_or("ignore_dir must be a boolean")?,
        None => false,
    };

    let file_names = thelib::file_find::dir_list(
        &input_dir,
        &regex_pattern,
        is_full_path,
        ignore_file,
        ignore_dir,
    )?;

    let mut result = CommandResult::default();
    result.content = json!(file_names);

    Ok(result)
}

pub fn new_temp_file_path(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    // get ext from `ext` or `extension` in params
    let ext = match params.get("ext") {
        Some(s) => s.as_str().ok_or("ext must be a string")?,
        None => match params.get("extension") {
            Some(s) => s.as_str().ok_or("extension must be a string")?,
            None => "tmp",
        },
    };

    // get parent dir from `parent_dir` or `dir` in params,
    let parent_dir_str = match params.get("parent_dir") {
        Some(s) => s.as_str().ok_or("parent_dir must be a string")?,
        None => match params.get("dir") {
            Some(s) => s.as_str().ok_or("dir must be a string")?,
            None => "",
        },
    };

    // if got, use it, else if not exists, use default temp dir
    let temp_dir: PathBuf = if !parent_dir_str.is_empty() {
        PathBuf::from(parent_dir_str)
    } else {
        let app_data_dir = match get_app_data_dir() {
            Ok(d) => d,
            Err(e) => return Err(format!("Can't get dir for temp file: {}", e).into()),
        };
        app_data_dir.join(".temp")
    };

    let temp_file = thelib::file_path::new_temp_file_path(&temp_dir, &ext)?;

    let mut result = CommandResult::default();
    result.content = json!(temp_file);
    Ok(result)
}

/// delete files or directories
pub fn delete_path(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    // get paths from `input_paths` or `paths` in params
    let input_paths = match params.get("input_paths") {
        Some(v) => v.as_array().ok_or("input_paths must be an array")?,
        None => {
            if let Some(v) = params.get("paths") {
                v.as_array().ok_or("paths must be an array")?
            } else {
                return Err("parameter `input_paths` or `paths` is required".into());
            }
        }
    };

    let input_paths_arr: Vec<String> = input_paths
        .iter()
        .map(|path| path.as_str().unwrap_or("").to_string())
        .collect();
    // filter out empty paths
    let input_paths_arr: Vec<String> = input_paths_arr
        .iter()
        .filter(|path| !path.is_empty())
        .map(|path| path.to_string())
        .collect();

    let app_data_dir_str: String = get_app_data_dir()?.to_string_lossy().to_string();

    let mut count_deleted: usize = 0;

    let mut wait_to_trash: Vec<String> = Vec::new();
    for input_path in &input_paths_arr {
        if input_path.starts_with(&app_data_dir_str) {
            // if specified path is a sub path of app data dir or temp dir, delete it directly
            // include temp files created by workflows (located in app_data_dir/.temp)
            let path = std::path::Path::new(&input_path);
            if path.is_dir() {
                std::fs::remove_dir_all(input_path)?;
            } else if path.is_file() {
                std::fs::remove_file(input_path)?;
            }
            count_deleted += 1;
        } else {
            // otherwise, for safety, move it to trash
            wait_to_trash.push(input_path.to_string());
        }
    }
    if !wait_to_trash.is_empty() {
        for path in &wait_to_trash {
            trash::delete(path)?;
        }
        count_deleted += wait_to_trash.len();
    }

    let mut result = CommandResult::default();
    result.content = json!(count_deleted);
    Ok(result)
}
