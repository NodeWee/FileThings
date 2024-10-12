use crate::config::init::APP_DATA_DIR_NAME;
use crate::errors::BoxedError;
use crate::thelib::sys::{get_app_ver_dirname, get_exe_resources_dir};
use dirs;
#[cfg(target_os = "windows")]
use std::env;
use std::path::{Path, PathBuf}; // for env::var_os under Windows

pub fn get_font_dir() -> Result<PathBuf, BoxedError> {
    #[cfg(not(target_os = "windows"))]
    // dirs::font_dir() not supported on Windows
    let font_dir = dirs::font_dir().ok_or("Cannot get user's font directory")?;

    #[cfg(target_os = "windows")]
    let font_dir: PathBuf = env::var_os("LOCALAPPDATA")
        .and_then(|x| {
            let path = PathBuf::from(x)
                .join("Microsoft")
                .join("Windows")
                .join("Fonts");
            if path.is_dir() {
                Some(path)
            } else {
                env::var_os("windir").and_then(|x| {
                    let path = PathBuf::from(x).join("Fonts");
                    if path.is_dir() {
                        Some(path)
                    } else {
                        None
                    }
                })
            }
        })
        .ok_or("Cannot get user's font directory")?;

    Ok(font_dir)
}

pub fn get_app_data_dir() -> Result<PathBuf, BoxedError> {
    let data_dir = dirs::data_dir().ok_or("Cannot get user's data directory")?;
    let app_data_dir = Path::new(&data_dir).join(APP_DATA_DIR_NAME);
    Ok(app_data_dir)
}

pub fn get_app_download_dir() -> Result<PathBuf, BoxedError> {
    let app_data_dir: PathBuf = get_app_data_dir()?;
    let download_dir = app_data_dir.join("downloads");

    Ok(download_dir)
}

pub fn get_i18n_dir_in_app_data() -> Result<PathBuf, BoxedError> {
    // default: app-data-dir/i18n/vX.Y.Z
    let app_data_dir: PathBuf = get_app_data_dir()?;
    let app_ver_dirname = get_app_ver_dirname();
    let default_i18n_dir = app_data_dir.join("i18n").join(app_ver_dirname);

    Ok(default_i18n_dir)
}

pub fn get_i18n_dir_using() -> Result<PathBuf, BoxedError> {
    let dir1 = get_i18n_dir_in_app_data()?;
    if dir1.exists() {
        return Ok(dir1);
    }
    // else, bin-resource-dir/i18n
    let exe_res_dir = get_exe_resources_dir()?;
    let dir2 = Path::new(&exe_res_dir).join("i18n");

    Ok(dir2)
}

pub fn get_function_dir_in_app_data() -> Result<PathBuf, BoxedError> {
    let app_data_dir = get_app_data_dir()?;
    let app_ver_dirname = get_app_ver_dirname();
    let default_function_dir = app_data_dir.join("functions").join(app_ver_dirname);

    Ok(default_function_dir)
}

pub fn get_function_dir_using() -> Result<PathBuf, BoxedError> {
    let dir1 = get_function_dir_in_app_data()?;
    let function_dir: PathBuf;
    if dir1.exists() {
        function_dir = dir1;
    } else {
        let exe_res_dir = get_exe_resources_dir()?;
        function_dir = Path::new(&exe_res_dir).join("functions");
    }

    Ok(function_dir)
}

pub fn get_function_category_dir_using(
    category_dirnames: Vec<&str>,
) -> Result<PathBuf, BoxedError> {
    let using_function_dir = get_function_dir_using()?;

    let mut category_function_dir = using_function_dir.clone();
    for dir_name in &category_dirnames {
        category_function_dir = category_function_dir.join(dir_name);
    }

    Ok(category_function_dir)
}

pub fn get_template_dir_in_app_data() -> Result<PathBuf, BoxedError> {
    let app_data_dir: PathBuf = get_app_data_dir()?;
    let app_ver_dirname = get_app_ver_dirname();
    let default_dir = app_data_dir.join("templates").join(app_ver_dirname);

    Ok(default_dir)
}

pub fn get_template_dir_using() -> Result<PathBuf, BoxedError> {
    let dir1 = get_template_dir_in_app_data()?;
    let the_dir: PathBuf;
    if dir1.exists() {
        the_dir = dir1;
    } else {
        let exe_res_dir = get_exe_resources_dir()?;
        the_dir = Path::new(&exe_res_dir).join("templates");
    }

    Ok(the_dir)
}
