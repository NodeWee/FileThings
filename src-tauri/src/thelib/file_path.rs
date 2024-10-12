use crate::errors::BoxedError;
use crate::thelib::sys::get_home_dir;
use std::collections::HashSet;
use std::path::{Path, PathBuf};
use uuid;

pub fn new_temp_file_path<P: AsRef<Path>>(temp_dir: P, ext: &str) -> Result<String, BoxedError> {
    let temp_dir = temp_dir.as_ref();
    // generate random file name (uuid)
    let file_name = uuid::Uuid::new_v4().to_string() + "." + ext;
    std::fs::create_dir_all(&temp_dir)?;
    let file_path = temp_dir.join(file_name);
    let tmp_file = file_path
        .to_str()
        .ok_or("Failed to get temporary file path")?
        .to_string();

    Ok(tmp_file)
}

pub fn make_parent_dirs<P: AsRef<Path>>(file_path: P) -> Result<(), BoxedError> {
    let parent_dir = file_path
        .as_ref()
        .parent()
        .ok_or("Failed to get parent dir")?;
    std::fs::create_dir_all(parent_dir)?;
    Ok(())
}

pub fn get_relative_path_with_home_dir(path: &str) -> String {
    let home_dir: String = match get_home_dir() {
        Ok(h) => h.to_string_lossy().to_string(),
        Err(_) => String::from(""),
    };
    if home_dir.is_empty() {
        return path.to_string();
    }
    if !path.starts_with(&home_dir) {
        return path.to_string();
    }
    path.replace(&home_dir, "~")
}

pub fn get_absolute_path_with_home_dir(path: &str) -> String {
    if !path.starts_with("~") {
        return path.to_string();
    }
    let path_sep = std::path::MAIN_SEPARATOR.to_string();
    let home_dir = match get_home_dir() {
        Ok(h) => h.to_string_lossy().to_string(),
        Err(_) => String::from(""),
    };
    if home_dir.is_empty() {
        return path.to_string();
    }
    path.replace(
        &("~".to_owned() + path_sep.as_str()),
        &(home_dir + path_sep.as_str()),
    )
}

/// Split the file path into directory, stem (file name without extension) and extension
pub fn split_file_path(file_path: &str) -> (String, String, String) {
    let path = Path::new(file_path);
    let file_dir = path
        .parent()
        .and_then(|p| p.to_str())
        .unwrap_or("")
        .to_string();
    let file_stem = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_string();
    let file_ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_string();

    (file_dir, file_stem, file_ext)
}

/// Generate a unique file path by adding suffix to the file name
pub fn get_unique_filepath(
    file_path: &str,
    new_stem: Option<&str>,
    new_ext: Option<&str>,
) -> Result<String, BoxedError> {
    let (file_dir, file_stem, file_ext) = split_file_path(&file_path);
    let ext: String = new_ext.unwrap_or(&file_ext).to_string();
    let stem: String = new_stem.unwrap_or(&file_stem).to_string();
    let mut new_path = Path::new(&file_dir).join(format!("{}.{}", stem, ext));

    if !new_path.exists() {
        return Ok(new_path
            .to_str()
            .ok_or("Invalid new file path")?
            .to_string());
    }

    // auto generate a new file name
    let mut suffix = 1;
    loop {
        new_path = Path::new(&file_dir).join(format!("{}-{}.{}", stem, suffix, ext));
        if !new_path.exists() {
            return Ok(new_path
                .to_str()
                .ok_or("Invalid new file path")?
                .to_string());
        }
        suffix += 1;
    }
}

pub fn get_all_extensions(paths: &HashSet<String>, limit_walk_file: u32) -> HashSet<String> {
    log::debug!(
        "get_all_extensions for paths: {:?}. limit_walk_file: {}",
        paths,
        limit_walk_file
    );

    let mut exts: HashSet<String> = HashSet::new();
    let mut walk_file_count = 0;
    for path in paths {
        get_all_ext_handle_a_path(path, &mut walk_file_count, &mut exts).ok();

        if walk_file_count >= limit_walk_file {
            break;
        }
    }

    // add special file type tags for internal use
    // - /paths
    if paths.len() > 1 {
        exts.insert("/paths".to_string());
    }
    // - /file, /files, /dir, /dirs
    let to_check_paths: Vec<&Path> = paths.iter().map(|p| Path::new(p)).collect();
    let (file_num, dir_num) = count_files_and_dirs_to_check_bulk(to_check_paths);
    if file_num == 1 {
        exts.insert("/file".to_string());
    } else if file_num > 1 {
        exts.insert("/files".to_string());
    };
    if dir_num == 1 {
        exts.insert("/dir".to_string());
    } else if dir_num > 1 {
        exts.insert("/dirs".to_string());
    };

    exts
}

fn get_all_ext_handle_a_path(
    path: &str,
    walk_file_count: &mut u32,
    exts: &mut HashSet<String>,
) -> Result<(), BoxedError> {
    let the_path = Path::new(path);
    if !the_path.exists() {
        return Ok(());
    }

    // if exts length is greater than 100, return directly without continuing
    if exts.len() >= 100 {
        return Ok(());
    }

    if the_path.is_file() {
        *walk_file_count += 1;
        let (_, _, file_ext) = split_file_path(&path);

        if !file_ext.is_empty() {
            exts.insert(file_ext.to_lowercase());
        }
    } else if the_path.is_dir() {
        for entry in std::fs::read_dir(&path)? {
            let entry = entry?;
            let sub_path = match entry.path().to_str() {
                Some(sub_path) => sub_path.to_string(),
                None => continue,
            };
            get_all_ext_handle_a_path(&sub_path, walk_file_count, exts)?;
        }
    }
    // else others: ignored
    Ok(())
}

/// only used for judging whether it is a batch of files or directories (when the counter is greater than 1, it will end the counter)
pub fn count_files_and_dirs_to_check_bulk(paths: Vec<&Path>) -> (usize, usize) {
    let mut file_count = 0;
    let mut dir_count = 0;

    fn count_files_and_dirs(paths: Vec<&Path>, file_count: &mut usize, dir_count: &mut usize) {
        for path in paths {
            if *file_count > 1 && *dir_count > 1 {
                break;
            }
            if path.is_dir() {
                *dir_count += 1;
                let entry_iter = match std::fs::read_dir(path) {
                    Ok(e) => e,
                    Err(_) => continue,
                };
                for entry in entry_iter {
                    if *file_count > 1 && *dir_count > 1 {
                        break;
                    }
                    let entry = match entry {
                        Ok(e) => e,
                        Err(_) => continue,
                    };
                    let path = entry.path();
                    if path.is_file() {
                        *file_count += 1;
                    } else if path.is_dir() {
                        *dir_count += 1;
                        count_files_and_dirs(vec![path.as_path()], file_count, dir_count);
                    }
                }
            } else if path.is_file() {
                *file_count += 1;
            }
        }
    }

    count_files_and_dirs(paths, &mut file_count, &mut dir_count);

    (file_count, dir_count)
}

/// get all sub directory names (not recursive)
pub fn get_sub_dirnames(dir_path: &PathBuf) -> Vec<String> {
    let path = Path::new(dir_path);
    let mut sub_dirnames = Vec::new();
    if path.is_dir() {
        match std::fs::read_dir(&path) {
            Ok(read_iter) => {
                for entry in read_iter {
                    let entry = match entry {
                        Ok(e) => e,
                        Err(_) => continue,
                    };
                    let sub_path = entry.path();
                    if sub_path.is_dir() {
                        if let Some(sub_dirname) = sub_path.file_name() {
                            if let Some(sub_dirname_str) = sub_dirname.to_str() {
                                sub_dirnames.push(sub_dirname_str.to_string());
                            }
                        }
                    }
                }
            }
            Err(_) => {}
        }
    }
    sub_dirnames
}
