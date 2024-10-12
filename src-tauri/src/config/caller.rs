use crate::config::init::{USER_THING_CONFIG, USER_UI_CONFIG};
use crate::errors::{pack_called_error, CallError};
use serde_json::Value as JsonValue;
use std::time::{Duration, Instant};

pub fn route(
    _app: &tauri::AppHandle,
    scope: &str,
    action: &str,
    action_params: &str,
) -> Result<String, CallError> {
    log::debug!(
        "config_call: scope: {}, action: {}, args: {}",
        scope,
        action,
        action_params
    );

    if !["ui", "file_function"].contains(&scope) {
        return pack_called_error(&format!("Invalid scope: {}", scope));
    }
    if !["get", "set", "get_all", "set_all"].contains(&action) {
        return pack_called_error(&format!("Invalid action: {}", action));
    }

    let args: JsonValue = match serde_json::from_str(action_params) {
        Ok(args) => args,
        Err(e) => {
            return pack_called_error(&format!(
                "Failed to unpack action_params: {}",
                e.to_string()
            ));
        }
    };

    // use independent scope to release lock; use loop to try to wait for lock automatically;
    let start = Instant::now();
    let mut config;
    loop {
        let locked = match scope {
            "ui" => USER_UI_CONFIG.lock(),
            "file_function" => USER_THING_CONFIG.lock(),
            _ => return pack_called_error(&format!("Config scope not found: {}", scope)),
        };

        match locked {
            Ok(c) => {
                config = c;
                break;
            }
            Err(_) => {
                if start.elapsed() > Duration::from_millis(200) {
                    return Err(CallError::new(
                        format!("Failed to acquire lock {}", scope).as_str(),
                    ));
                }
                std::thread::sleep(Duration::from_millis(10)); // wait 10ms and retry
            }
        }
    }

    let result = match action {
        "get_all" => config.get_all(),
        "get" => config.get(args),
        "set_all" => config.set_all(args),
        "set" => config.set(args),
        _ => return pack_called_error(&format!("Config action not found: {}", action)),
    };

    match result {
        Ok(data) => Ok(data.to_string()),
        Err(e) => pack_called_error(&format!("Failed to {} config: {}", action, e.to_string())),
    }
}

pub fn load_user_config() {
    // load user config (ignore error to prevent crash to continue run the app)

    // user ui config
    match USER_UI_CONFIG.lock() {
        Ok(mut config) => match config.load_from_file() {
            Ok(_) => {
                log::info!("USER_UI_CONFIG loaded");
            }
            Err(e) => {
                log::error!("Failed to load USER_UI_CONFIG: {}", e)
            }
        },
        Err(e) => {
            log::error!("Failed to lock USER_UI_CONFIG: {}", e)
        }
    }

    // user file_function config
    match USER_THING_CONFIG.lock() {
        Ok(mut config) => match config.load_from_file() {
            Ok(_) => {
                log::info!("USER_THING_CONFIG loaded");
            }
            Err(e) => {
                log::error!("Failed to load USER_THING_CONFIG: {}", e)
            }
        },
        Err(e) => {
            log::error!("Failed to lock USER_THING_CONFIG: {}", e)
        }
    }
}
