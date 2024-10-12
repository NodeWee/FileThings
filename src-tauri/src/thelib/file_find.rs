use crate::errors::BoxedError;
use crate::thelib::shell::exec_command;
use std::path::Path;

pub fn reveal_path(path: &str) {
    // locate the path (not open the path)
    #[cfg(target_os = "macos")]
    {
        let _ = exec_command("open", vec!["-R", path]);
    }

    #[cfg(target_os = "windows")]
    {
        // explorer /select,"path"
        let _ = exec_command("explorer", vec!["/select,", path]);
    }

    #[cfg(target_os = "linux")]
    {
        let _ = exec_command("xdg-open", vec![path]);
    }
}

/// List files and directories in a directory (not recursive)
pub fn dir_list(
    path: &str,
    regex_pattern: &str,
    is_full_path: bool,
    ignore_file: bool,
    ignore_dir: bool,
) -> Result<Vec<String>, BoxedError> {
    if !Path::new(path).is_dir() {
        return Ok(vec![]);
    }

    let mut result = vec![];
    let re = regex::Regex::new(regex_pattern)?;
    let sub_paths = match std::fs::read_dir(path) {
        Ok(p) => p,
        Err(e) => return Err(format!("Error reading directory:{}. {}", &path, e).into()),
    };
    for sp in sub_paths {
        let sub_path = match &sp {
            Ok(p) => p,
            Err(e) => {
                log::error!("Error reading path:{:?}. {}", &sp, e);
                continue;
            }
        };

        let file_name = sub_path.file_name().to_string_lossy().to_string();
        if ignore_file && sub_path.file_type()?.is_file() {
            continue;
        }
        if ignore_dir && sub_path.file_type()?.is_dir() {
            continue;
        }
        if re.is_match(&file_name) {
            if is_full_path {
                let full_path = sub_path.path().display().to_string();
                result.push(full_path);
            } else {
                result.push(file_name);
            }
        }
    }

    Ok(result)
}
