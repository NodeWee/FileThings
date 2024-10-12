use crate::app;
use crate::commands::structures::CommandResult;
use crate::errors::BoxedError;
use crate::thelib;
use serde_json::json;

pub fn get_platform() -> Result<CommandResult, BoxedError> {
    let platform = thelib::sys::get_platform();
    let mut result = CommandResult::default();
    result.content = json!(platform);
    Ok(result)
}

pub fn get_arch() -> Result<CommandResult, BoxedError> {
    let arch = thelib::sys::get_arch();
    let mut result = CommandResult::default();
    result.content = json!(arch);
    Ok(result)
}

pub fn is_debug() -> Result<CommandResult, BoxedError> {
    let is_debug = thelib::sys::is_debug();
    let mut result = CommandResult::default();
    result.content = json!(is_debug);
    Ok(result)
}

pub fn get_app_data_dir() -> Result<CommandResult, BoxedError> {
    let app_data_dir = app::resource::get_app_data_dir()?;
    let mut result = CommandResult::default();
    result.content = json!(&app_data_dir);
    Ok(result)
}

pub fn get_home_dir() -> Result<CommandResult, BoxedError> {
    let home_dir = thelib::sys::get_home_dir()?;
    let mut result = CommandResult::default();
    result.content = json!(&home_dir);
    Ok(result)
}
