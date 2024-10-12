use crate::commands::structures::CommandResult;
use crate::errors::BoxedError;
use crate::thelib::shell::exec_command;
use serde_json::{json, Value as JsonValue};

pub async fn execute(command: &str, params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let empty_arr = vec![];
    let args = params["arguments"].as_array().unwrap_or(&empty_arr);
    let ignore_error = match params.get("ignore_error") {
        Some(_) => true,
        None => false,
    };

    log::debug!("run shell command: {}, args: {:?}", command, args);

    // convert elements (maybe numbers, maybe strings) in args to strings
    let args_string: Vec<String> = convert_args_to_strings(&args)?;
    let args_str: Vec<&str> = args_string.iter().map(|s| s.as_str()).collect();

    match exec_command(command, args_str) {
        Ok(stdout) => {
            let mut result = CommandResult::default();
            result.content = json!(stdout);
            // output_paths add in upstream because here cannot have a unified rule to get output paths
            Ok(result)
        }
        Err(e) => {
            if ignore_error {
                log::warn!("Ignoring error: {}", e);
                let mut result = CommandResult::default();
                result.content = json!(e.to_string());
                return Ok(result);
            }
            log::error!("Failed to executing command: {}", e);
            Err(e.into())
        }
    }
}

fn convert_args_to_strings(args: &[JsonValue]) -> Result<Vec<String>, BoxedError> {
    let mut args_string: Vec<String> = Vec::new();

    fn process_arg(arg: &JsonValue, args_string: &mut Vec<String>) -> Result<(), BoxedError> {
        match arg {
            JsonValue::Number(num) => {
                // must convert to number first then convert to string, directly convert JSON NUM to string will have quotes
                let num_str = if let Some(n) = num.as_u64() {
                    n.to_string()
                } else if let Some(f) = num.as_f64() {
                    f.to_string()
                } else {
                    log::error!("Failed to convert number to string: {}", num);
                    return Err(format!("Failed to convert number to string: {}", num).into());
                };
                args_string.push(num_str);
            }
            JsonValue::String(s) => args_string.push(s.clone()),
            JsonValue::Array(arr) => {
                for item in arr {
                    process_arg(item, args_string)?;
                }
            }
            _ => {
                log::error!("Invalid type of command argument: {}", arg);
                return Err(format!("Invalid type of command argument : {}", arg).into());
            }
        }
        Ok(())
    }

    for arg in args {
        process_arg(arg, &mut args_string)?;
    }

    Ok(args_string)
}
