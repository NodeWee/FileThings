use crate::errors::BoxedError;
use crate::functions;
use serde_json::{json, Value as JsonValue};
use std::collections::{HashMap, HashSet};

// get supported things (operations) according to the file types
pub fn get_supported_file_functions(file_exts: HashSet<&str>) -> Result<JsonValue, BoxedError> {
    log::debug!("get_supported_functions for exts: {:?}", file_exts);

    let file_functions = match functions::file::read::FILE_FUNCTIONS.lock() {
        Ok(w) => w,
        Err(e) => {
            log::error!("get_supported_functions: lock FILE_FUNCTIONS error: {}", e);
            return Ok(json!({}));
        }
    };

    // default support all operations, then take intersection with file types
    let mut supported_function_names: HashSet<&str> =
        file_functions.keys().map(|s| s.as_str()).collect();

    // specific file type matching, take intersection
    for ext in &file_exts {
        if ext.starts_with("/") {
            // skip special file types for internal use (will be processed later)
            continue;
        }
        let mut ext_supported_thing_names: HashSet<&str> = HashSet::new();
        for item in file_functions.iter() {
            let (fn_name, function) = item;
            if function.matches.extensions.contains("*")
                || function.matches.extensions.contains(&"/all".to_string())
                || function.matches.extensions.contains(&ext.to_string())
            {
                ext_supported_thing_names.insert(fn_name.as_str());
            }
        }
        // take intersection
        supported_function_names = supported_function_names
            .intersection(&ext_supported_thing_names)
            .copied()
            .collect();
    }

    // special file types for internal use
    let inner_file_exts = vec!["/file", "/dir", "/files", "/dirs", "/paths"];
    for inner_ext in inner_file_exts {
        if file_exts.contains(inner_ext) {
            for item in file_functions.iter() {
                let (fn_name, function) = item;
                let allow_matched: bool = function.matches.extensions.contains(inner_ext);
                let not_allow_matched: bool = function
                    .matches
                    .extensions
                    .contains(&format!("!{}", inner_ext));

                if allow_matched && !not_allow_matched {
                    supported_function_names.insert(fn_name.as_str());
                } else if not_allow_matched {
                    supported_function_names.remove(fn_name.as_str());
                }
            }
        }
    }

    // all file processing functions (File Functions) are through configuration files as interfaces
    // no longer provide built-in file processing functions directly as interfaces to the front end
    // if file_exts.contains("/dir")
    //     || file_exts.contains("/dirs")
    //     || file_exts.contains("/paths")
    //     || file_exts.contains("/files")
    // {
    //     supported_function_names.insert(command_names::FILE_COUNT_FILES);
    // }

    log::debug!("supported_function_names: {:?}", supported_function_names);

    let mut supported_things: HashMap<String, JsonValue> = HashMap::new();
    for thing_name in supported_function_names {
        if let Some(thing_function) = file_functions.get(thing_name) {
            supported_things.insert(thing_name.to_string(), thing_function.to_json());
        } else {
            supported_things.insert(thing_name.to_string(), json!({ "name": thing_name }));
        }
    }

    let mut sorted_thing_names = supported_things.keys().collect::<Vec<&String>>();
    sorted_thing_names.sort();

    let result = json!({
        "names": sorted_thing_names,
        "items": supported_things
    });

    Ok(result)
}
