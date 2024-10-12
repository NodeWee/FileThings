use crate::app::resource::{get_function_category_dir_using, get_function_dir_using};
use crate::errors::BoxedError;
use crate::functions::file::structures::FileFunction;
use crate::thelib::file_path::get_sub_dirnames;
use crate::thelib::json::load_json_file;
use lazy_static::lazy_static;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};

lazy_static! {
    // key is flow name, e.g. "file.to_video"
    pub static ref FILE_FUNCTIONS: Arc<Mutex<HashMap<String, FileFunction>>> =
        Arc::new(Mutex::new(HashMap::new()));
}

// load file functions (operations)
pub fn load_functions() -> Result<(), BoxedError> {
    let function_category_dir = get_function_category_dir_using(vec!["files"])?;
    let function_dir = get_function_dir_using()?;

    // get all folder names in the function directory, as they are the js function names
    let sub_dirnames: Vec<String> = get_sub_dirnames(&function_category_dir);

    // js function data files
    let mut functions = Vec::new();
    for name in sub_dirnames {
        let worker_utils_file = function_dir.join("_utils").join("file.js");
        let file_func_dir = function_category_dir.join(&name);
        let config_path = file_func_dir.join("config.json");
        let worker_file = file_func_dir.join("worker.js");
        let function_name = format!("file.{}", name);

        let config = match load_json_file(&config_path) {
            Ok(v) => v,
            Err(e) => {
                log::warn!("Failed to read config.json: {}", e);
                continue;
            }
        };

        // check worker file exists
        if !worker_file.exists() {
            log::warn!("Worker file not found: {}", &worker_file.to_string_lossy());
            continue;
        }

        let function = match FileFunction::new(
            &function_name,
            &config,
            &worker_file.to_string_lossy().to_string(),
            &worker_utils_file.to_string_lossy().to_string(),
        ) {
            Ok(w) => w,
            Err(e) => {
                log::warn!("Ignore function {}, {}", &function_name, e);
                continue;
            }
        };

        functions.push((function_name, function));
    }

    match FILE_FUNCTIONS.lock() {
        Ok(mut w) => {
            w.clear();
            for (name, function) in &functions {
                w.insert(name.clone(), function.clone());
            }
        }
        Err(e) => {
            return Err(Box::new(e));
        }
    }

    log::info!("Loaded {} file functions", &functions.len());

    Ok(())
}
