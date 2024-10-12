use crate::config::init::APP_STATUS;
use crate::errors::BoxedError;
use std::path::PathBuf;
use std::time::{Duration, Instant};

pub fn get_app_version() -> String {
    // use independent scope to release lock; use loop to try to wait for lock automatically;
    let start = Instant::now();
    let app_status;
    loop {
        let locked = APP_STATUS.lock();
        match locked {
            Ok(m) => {
                app_status = m;
                break;
            }
            Err(_) => {
                if start.elapsed() > Duration::from_millis(200) {
                    log::warn!("Failed to acquire lock APP_STATUS");
                    return "".to_string();
                }
                std::thread::sleep(Duration::from_millis(10)); // wait 10ms and retry
            }
        }
    }

    let app_version = app_status.version.clone();

    return app_version;
}

pub fn get_app_ver_dirname() -> String {
    let app_version = get_app_version();
    let major_minor = app_version
        .split('.')
        .take(2)
        .collect::<Vec<&str>>()
        .join(".");
    return format!("v{}", major_minor);
}

pub fn get_platform() -> String {
    // return target_os
    return std::env::consts::OS.to_string();
}

pub fn get_platform_version() -> String {
    match get_platform().as_str() {
        "macos" => {
            return get_macos_version();
        }
        "linux" => {
            return get_linux_version();
        }
        "windows" => {
            return get_windows_version();
        }
        _ => {
            return "unknown".to_string();
        }
    }
}

fn get_macos_version() -> String {
    let output = std::process::Command::new("sw_vers")
        .arg("-productVersion")
        .output();
    match output {
        Ok(output) => {
            return String::from_utf8(output.stdout).unwrap_or("unknown".to_string());
        }
        Err(_) => {
            return "unknown".to_string();
        }
    }
}

fn get_linux_version() -> String {
    let output = std::process::Command::new("lsb_release").arg("-a").output();
    match output {
        Ok(output) => {
            return String::from_utf8(output.stdout).unwrap_or("unknown".to_string());
        }
        Err(_) => {
            return "unknown".to_string();
        }
    }
}

fn get_windows_version() -> String {
    let output = std::process::Command::new("ver").output();
    match output {
        Ok(output) => {
            return String::from_utf8(output.stdout).unwrap_or("unknown".to_string());
        }
        Err(_) => {
            return "unknown".to_string();
        }
    }
}

pub fn get_arch() -> String {
    return std::env::consts::ARCH.to_string();
}

pub fn get_tauri_version() -> String {
    return tauri::VERSION.to_string();
}

pub fn is_dev() -> bool {
    return tauri::is_dev();
}

pub fn is_debug() -> bool {
    return cfg!(debug_assertions);
}

pub fn get_home_dir() -> Result<PathBuf, BoxedError> {
    match dirs::home_dir() {
        Some(home_dir) => Ok(home_dir),
        None => Err("Cannot get user's home directory".into()),
    }
}

pub fn get_exe_dir() -> Result<PathBuf, BoxedError> {
    let exe_path = match std::env::current_exe() {
        Ok(p) => p,
        Err(e) => {
            log::error!("Failed to get current exe path: {}", e);
            Err("Failed to get current exe path")?
        }
    };
    let exe_dir = match exe_path.parent() {
        Some(p) => p.to_path_buf(),
        None => {
            log::error!("Failed to get current exe parent directory");
            Err("Failed to get current exe parent directory")?
        }
    };

    Ok(exe_dir)
}

pub fn get_exe_resources_dir() -> Result<PathBuf, BoxedError> {
    let exe_dir = get_exe_dir()?;

    let resources_dir = match get_platform().as_str() {
        "macos" => match &exe_dir.parent() {
            Some(parent_dir) => {
                let res_dir = parent_dir.join("Resources").join("resources");
                if res_dir.exists() {
                    // for macOS app bundle
                    res_dir
                } else {
                    // for macOS app bundle in development (target/debug)
                    exe_dir.join("resources")
                }
            }
            None => exe_dir.join("resources"),
        },
        _ => exe_dir.join("resources"),
    };

    Ok(resources_dir)
}
