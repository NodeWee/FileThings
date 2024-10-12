// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use sysinfo;
mod app;
mod commands;
mod config;
mod errors;
mod functions;
mod thelib;
use crate::app::logger::setup_logger;
use crate::config::init::APP_STATUS;
use errors::{pack_called_error, CallError};
use tauri;

#[tauri::command]
fn config_call(
    app: tauri::AppHandle,
    scope: &str,
    action: &str,
    params: &str,
) -> Result<String, CallError> {
    config::caller::route(&app, scope, action, params)
}

#[tauri::command(async)]
/// internal call, for example, front-end calls the back-end interface
async fn action_call(
    app: tauri::AppHandle,
    action: &str,
    params: &str,
) -> Result<String, CallError> {
    log::info!("CALL ACTION: action: {}, params: {}", action, params);
    match app::actions::route(&app, action, params).await {
        Ok(v) => Ok(v.to_string()),
        Err(err) => {
            log::error!(
                "Failed to call action: {}, params: {}, error: {}",
                action,
                params,
                err.to_string()
            );

            pack_called_error(err.to_string().as_str())
        }
    }
}

#[tauri::command[async]]
/// used for file file_function call backend provided functional interfaces. for security reasons, direct call shell command is not allowed
async fn file_function_command_invoke(
    app: tauri::AppHandle,
    command: &str, // command name
    params: &str,  //command params
) -> Result<String, CallError> {
    log::info!("CALL FILE COMMAND: command: {}, params: {}", command, params);
    match functions::file::command_caller::route(&app, command, params).await {
        Ok(v) => Ok(v),
        Err(err) => {
            log::error!(
                "Failed to call command: {}, params: {}, error: {}",
                command,
                params,
                err.to_string()
            );

            pack_called_error(err.to_string().as_str())
        }
    }
}

fn main() {
    let _ = fix_path_env::fix(); // fix env PATH for GUI app on macOS and Linux
    match setup_logger().map_err(|e| log::error!("Failed to setup logger: {}", e.to_string())) {
        Ok(_) => {}
        Err(_) => {}
    }

    log::info!("main start");
    // log current platform, architecture, version, and work directory
    log::info!(
        "Platform: {} {}, Architecture: {}, Tauri version: {},  Exe directory: {}",
        thelib::sys::get_platform(),
        thelib::sys::get_platform_version(),
        thelib::sys::get_arch(),
        thelib::sys::get_tauri_version(),
        thelib::sys::get_exe_dir()
            .unwrap_or("unknown".into())
            .to_string_lossy()
    );

    config::caller::load_user_config();

    tauri::Builder::default()
        .on_window_event(|_window, event| match event {
            tauri::WindowEvent::Destroyed => {
                // exit immediately when the main window is closed
                log::info!("Closing app, kill all child processes...");
                let current_pid = std::process::id();
                log::info!("Current process id: {}", current_pid);
                let mut system = sysinfo::System::new_all();
                system.refresh_processes();
                for (pid, process) in system.processes() {
                    let parent_id = match process.parent() {
                        Some(parent) => parent.as_u32(),
                        None => 0,
                    };
                    if parent_id == current_pid {
                        // kill the child process
                        let _ = process.kill();
                        log::info!("Killed child process: {}, {}", pid, process.name());
                    }
                }
            }
            _ => {}
        })
        .setup(|app| {
            // update app version to APP_STATUS
            match APP_STATUS.lock() {
                Ok(mut status) => {
                    status.version = app.package_info().version.to_string().clone();
                    log::info!("App version: {}", status.version);
                }
                Err(_) => {
                    log::error!("Failed to lock APP_STATUS");
                }
            };

            // updater plugin (only for desktop platform)
            #[cfg(desktop)]
            app.handle()
                .plugin(tauri_plugin_updater::Builder::new().build())?;

            Ok(())
        })
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_os::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            file_function_command_invoke,
            config_call,
            action_call
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
