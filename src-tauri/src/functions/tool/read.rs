use crate::app::resource::{get_function_category_dir_using, get_function_dir_using};
use crate::errors::BoxedError;
use crate::functions::tool::structures::ToolFunction;
use crate::thelib::file_path::get_sub_dirnames;
use crate::thelib::json::load_json_file;
use crate::thelib::shell::exec_command;
use lazy_static::lazy_static;
use std::collections::HashMap;
use std::path::Path;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

lazy_static! {
    // key is flow name, like "tool.exe.ffmpeg"
    pub static ref TOOL_FUNCTIONS: Arc<Mutex<HashMap<String, ToolFunction>>> =
        Arc::new(Mutex::new(HashMap::new()));
}

pub fn load_tools() -> Result<(), BoxedError> {
    // clear the tool functions
    match TOOL_FUNCTIONS.lock() {
        Ok(mut w) => {
            w.clear();
        }
        Err(e) => {
            return Err(Box::new(e));
        }
    }
    load_tool_functions("executables", "tool.exe")?;
    load_tool_functions("models", "tool.model")?;
    Ok(())
}

pub fn load_tool_functions(cat_dir_name: &str, func_type: &str) -> Result<(), BoxedError> {
    log::debug!("Loading {} tool functions", cat_dir_name);
    let function_category_dir = get_function_category_dir_using(vec![cat_dir_name])?;
    let function_dir = get_function_dir_using()?;

    // get all folder names in the function directory, as they are the js function names
    let sub_dirnames: Vec<String> = get_sub_dirnames(&function_category_dir);

    // js function data files
    let mut functions = Vec::new();
    for sub_dirname in sub_dirnames {
        let worker_utils_file = function_dir.join("_utils").join("tool.js");
        let tool_func_dir = function_category_dir.join(&sub_dirname);
        let config_path = tool_func_dir.join("config.json");
        let worker_file = tool_func_dir.join("worker.js");
        let function_name = format!("{}.{}", func_type, sub_dirname);

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

        let function = match ToolFunction::new(
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

    match TOOL_FUNCTIONS.lock() {
        Ok(mut w) => {
            for (name, function) in &functions {
                w.insert(name.clone(), function.clone());
            }
        }
        Err(e) => {
            return Err(Box::new(e));
        }
    }

    log::info!(
        "Loaded {} {} tool functions",
        &functions.len(),
        cat_dir_name
    );

    Ok(())
}

pub fn get_bin_path(name: &str) -> Result<String, BoxedError> {
    // use independent scope to release lock; use loop to try to wait for lock automatically;
    let start = Instant::now();
    let tool_functions: HashMap<String, ToolFunction>;
    loop {
        match TOOL_FUNCTIONS.lock() {
            Ok(c) => {
                tool_functions = c.clone();
                break;
            }
            Err(_) => {
                if start.elapsed() > Duration::from_millis(200) {
                    return Err("Failed to acquire lock TOOL_FUNCTIONS".into());
                }
                std::thread::sleep(Duration::from_millis(10)); // wait 10ms and retry
            }
        }
    }

    match tool_functions.get(name) {
        Some(p) => Ok(p.bin_path.clone()),
        None => {
            log::error!("Not found tool bin path for: {}", name);
            Err(format!("Not found tool bin path for: {}", name).into())
        }
    }
}

pub fn check_tool_available(name: &str) -> Result<bool, BoxedError> {
    log::debug!("Checking tool available: {}", name);

    let tool = {
        // use independent scope to release lock; use loop to try to wait for lock automatically;
        let start = Instant::now();
        let tool_functions: HashMap<String, ToolFunction>;
        loop {
            match TOOL_FUNCTIONS.lock() {
                Ok(c) => {
                    tool_functions = c.clone();
                    break;
                }
                Err(_) => {
                    if start.elapsed() > Duration::from_millis(200) {
                        return Err("Failed to acquire lock TOOL_FUNCTIONS".into());
                    }
                    std::thread::sleep(Duration::from_millis(10)); // wait 10ms and retry
                }
            }
        }

        if !tool_functions.contains_key(name) {
            log::debug!("Not found tool: {} in TOOL_FUNCTIONS", name);
            return Ok(false);
        }

        match tool_functions.get(name) {
            Some(c) => c.clone(),
            None => return Ok(false),
        }
    };

    if tool.available {
        // if available is true, return true directly
        return Ok(true);
    }

    // execute the tool with version args to check if the tool is available
    let bin_path = match get_bin_path(name) {
        // this function will use TOOL_FUNCTIONS.lock()
        Ok(v) => v,
        Err(_) => {
            return Ok(false);
        }
    };

    let is_available = match tool.func_type.as_str() {
        "tool.model" => {
            // if bin path exists, the tool is available
            if Path::new(&bin_path).exists() {
                true
            } else {
                false
            }
        }
        "tool.exe" => {
            let cmd_args = tool
                .bin_version_args
                .iter()
                .map(|arg| arg.as_str())
                .collect::<Vec<&str>>();

            match exec_command(&bin_path, cmd_args) {
                Ok(_) => true,
                Err(_) => false,
            }
        }

        _ => return Err(format!("Unknown tool type: {}", tool.func_type).into()),
    };

    // if the tool is available, set the tool available to true
    if is_available {
        // use independent scope to release lock; use loop to try to wait for lock automatically;
        let start = Instant::now();
        let mut tool_functions;
        loop {
            match TOOL_FUNCTIONS.lock() {
                Ok(c) => {
                    tool_functions = c;
                    break;
                }
                Err(_) => {
                    if start.elapsed() > Duration::from_millis(200) {
                        return Err("Failed to acquire lock TOOL_FUNCTIONS".into());
                    }
                    std::thread::sleep(Duration::from_millis(10)); // wait 10ms and retry
                }
            }
        }

        if let Some(c) = tool_functions.get_mut(name) {
            c.available = true;
        }
    }

    Ok(is_available)
}
