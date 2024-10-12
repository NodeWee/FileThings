use crate::commands::structures::CommandResult;
use crate::commands::utils::get_string_val_from_params;
use crate::errors::BoxedError;
use crate::functions::tool::read::TOOL_FUNCTIONS;
use crate::functions::tool::structures::ToolFunction;
use serde_json::{json, Value as JsonValue};
use std::collections::HashMap;
use std::time::{Duration, Instant};

pub fn get_tools() -> Result<CommandResult, BoxedError> {
    // use independent scope to release lock; use loop to try to wait for lock automatically;
    let start = Instant::now();
    let tools: HashMap<String, ToolFunction>;
    loop {
        match TOOL_FUNCTIONS.lock() {
            Ok(c) => {
                tools = c.clone();
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

    let mut model_names: Vec<String> = Vec::new();
    let mut exe_names: Vec<String> = Vec::new();
    let mut tools_map: HashMap<String, JsonValue> = HashMap::new();
    for (name, tool) in tools.iter() {
        if tool.func_type == "tool.model" {
            model_names.push(name.clone());
        } else if tool.func_type == "tool.exe" {
            exe_names.push(name.clone());
        }
        tools_map.insert(name.clone(), tool.to_json());
    }
    model_names.sort();
    exe_names.sort();

    let mut result = CommandResult::default();
    result.content = json!({
            "items": tools_map,
            "exe_names": exe_names,
            "model_names": model_names,
    });

    Ok(result)
}

pub fn get_tool_bin_path(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let tool_name = get_string_val_from_params(vec!["tool_name", "name"], params)?;

    // use independent scope to release lock; use loop to try to wait for lock automatically;
    let start = Instant::now();
    let tools: HashMap<String, ToolFunction>;
    loop {
        match TOOL_FUNCTIONS.lock() {
            Ok(c) => {
                tools = c.clone();
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

    let tool = tools.get(&tool_name);
    let mut result = CommandResult::default();
    match tool {
        Some(t) => {
            result.content = json!(t.bin_path);
        }
        None => {
            result.status = "error".to_string();
            result.message = format!("Tool `{}` not found.", tool_name);
        }
    }

    Ok(result)
}

/// Mock command execution for tool.model
pub fn model_tool_mock_command_execution(
    _command: &str,
    params: &JsonValue,
) -> Result<CommandResult, BoxedError> {
    let mut result = CommandResult::default();

    let empty_arr = vec![];
    let args = params["arguments"].as_array().unwrap_or(&empty_arr);

    // if first argument is `-v` or `--version`, return version info
    if args.len() > 0 {
        let arg0 = args[0].as_str().unwrap_or("");
        if arg0 == "-v" || arg0 == "--version" {
            // check if model file exists in previous steps (in command router)
            result.content = json!("is_exists");
        }
    } else {
        result.status = "error".to_string();
        result.message = "No arguments provided.".to_string();
    }

    Ok(result)
}
