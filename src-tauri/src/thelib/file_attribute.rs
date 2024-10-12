use crate::errors::BoxedError;
use crate::thelib::exiftool::get_file_metadata as exiftool_get_file_metadata;
use crate::thelib::json::merge_json_value;
use chrono::{DateTime, Local, Utc};
use serde_json::json;
use serde_json::Value as JsonValue;
use std::collections::HashMap;
use std::path::Path;
#[cfg(unix)] // only for linux and macos, windows will not compile
use xattr;

pub fn get_basic(file_path: &str) -> Result<JsonValue, BoxedError> {
    let path = Path::new(file_path);
    if !path.exists() {
        return Err("File not found".into());
    }

    let mut basic_attrs: HashMap<String, String> = HashMap::new();

    let path_name = path
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("");
    basic_attrs.insert("PathName".to_string(), path_name.to_string());

    let mut path_type = "UNKNOWN";
    if path.is_symlink() {
        path_type = "SYMLINK";
    } else if path.is_file() {
        path_type = "FILE";
    } else if path.is_dir() {
        path_type = "DIR";
    }
    basic_attrs.insert("PathType".to_string(), path_type.to_string());

    match path.read_link() {
        Ok(target) => basic_attrs.insert(
            "LinkTarget".to_string(),
            target.to_str().unwrap_or("").to_string(),
        ),
        Err(_) => None,
    };

    match path.metadata() {
        Ok(metadata) => {
            // file size
            basic_attrs.insert("FileSize".to_string(), metadata.len().to_string());
            // add last modified time (string format), if success to get the time
            match metadata.modified() {
                Ok(time) => {
                    let datetime: DateTime<Utc> = time.into(); // convert SystemTime to DateTime
                    let local_datetime = datetime.with_timezone(&Local); // convert DateTime<Utc> to DateTime<Local>
                    basic_attrs.insert(
                        "FileModifyDate".to_string(),
                        local_datetime.format("%Y-%m-%d %H:%M:%S %:z").to_string(),
                    );
                }
                Err(_) => (),
            }

            // add created time same as above
            match metadata.created() {
                Ok(time) => {
                    let datetime: DateTime<Utc> = time.into();
                    let local_datetime = datetime.with_timezone(&Local);
                    basic_attrs.insert(
                        "FileCreateDate".to_string(),
                        local_datetime.format("%Y-%m-%d %H:%M:%S %:z").to_string(),
                    );
                }
                Err(_) => (),
            }

            // add accessed time same as above
            match metadata.accessed() {
                Ok(time) => {
                    let datetime: DateTime<Utc> = time.into();
                    let local_datetime = datetime.with_timezone(&Local);
                    basic_attrs.insert(
                        "FileAccessDate".to_string(),
                        local_datetime.format("%Y-%m-%d %H:%M:%S %:z").to_string(),
                    );
                }
                Err(_) => (),
            }
        }
        Err(_) => (),
    };

    Ok(json!(basic_attrs))
}

/// Get all metadata of a file (include symlink, but no directory)
pub fn get_metadata(file_path: &str) -> Result<JsonValue, BoxedError> {
    let path = Path::new(file_path);
    if !path.exists() {
        return Err("Path not exist".into());
    }

    let mut mac_meta_json: JsonValue = json!({});

    // get Extended file attributes (xattr)
    //  only for linux and macos, windows will not compile
    #[cfg(unix)]
    {
        let mut mac_meta: HashMap<String, String> = HashMap::new();
        match xattr::list(&file_path) {
            Ok(r) => {
                for key in r {
                    match xattr::get(&file_path, &key) {
                        Ok(Some(value)) => {
                            let key_str = key
                                .into_string()
                                .unwrap_or_else(|f| f.to_string_lossy().into_owned());
                            mac_meta.insert(key_str, String::from_utf8_lossy(&value).to_string());
                        }
                        _ => (),
                    }
                }
            }
            _ => {}
        };

        if !mac_meta.is_empty() {
            mac_meta_json = json!({ "Extended file attributes": mac_meta })
        }
    }

    let exiftool_meta = match exiftool_get_file_metadata(file_path) {
        Ok(meta) => meta,
        Err(e) => {
            log::error!("Failed to get metadata by exiftool: {:?}", e);
            json!({})
        }
    };

    // merge mac_meta and exiftool_meta
    let mut meta: JsonValue = mac_meta_json.clone();
    merge_json_value(&mut meta, &exiftool_meta);

    Ok(meta)
}
