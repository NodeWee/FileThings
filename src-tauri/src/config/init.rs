pub const APP_DATA_DIR_NAME: &str = "FileThings";
// pub const APP_IDENTIFIER: &str = "net.filethings.app";

use crate::config::structures::{AppConfig, AppStatus};
use lazy_static::lazy_static;
use std::sync::{Arc, Mutex};

lazy_static! {
    pub static ref USER_UI_CONFIG: Arc<Mutex<AppConfig>> =
        Arc::new(Mutex::new(AppConfig::new("user", "ui",)));
    pub static ref USER_THING_CONFIG: Arc<Mutex<AppConfig>> =
        Arc::new(Mutex::new(AppConfig::new("user", "file_function",)));
    pub static ref APP_STATUS: Arc<Mutex<AppStatus>> = Arc::new(Mutex::new(AppStatus::new()));
}
