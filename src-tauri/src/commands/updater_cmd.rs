use crate::app::resource::{
    get_app_download_dir, get_function_dir_in_app_data, get_i18n_dir_in_app_data,
};
use crate::commands::http_cmd::download_file;
use crate::commands::structures::CommandResult;
use crate::commands::zip_cmd::unzip_file;
use crate::errors::BoxedError;
use crate::thelib::sys::get_app_ver_dirname;
use serde_json::json;
use serde_json::Value as JsonValue;

pub async fn update_functions() -> Result<CommandResult, BoxedError> {
    let target_dir = get_function_dir_in_app_data()?;
    let app_ver_dirname = get_app_ver_dirname();
    let downloads_dir = get_app_download_dir()?;

    // download the latest functions.json
    let endpoint = format!(
        "https://releases.filethings.net/res/functions/for-app-{}.json",
        app_ver_dirname
    );
    log::info!("check functions from: {}", endpoint);
    let latest_data_file = downloads_dir.join("latest-functions.json");
    let latest_data_file_str = match latest_data_file.to_str() {
        Some(s) => s,
        None => return Err("Failed to get the latest data file path".into()),
    };
    let params = json!({
        "url":endpoint,
        "output_file":latest_data_file_str,
        "resume":false
    });
    let result = download_file(&params).await?;
    if result.status != "ok" {
        return Err(result.message.into());
    }

    // load the functions.json
    let data_str = match std::fs::read_to_string(&latest_data_file) {
        Ok(s) => s,
        Err(e) => {
            return Err(format!(
                "Failed to read the latest data file: {}, Error:{}",
                &latest_data_file_str, e
            )
            .into())
        }
    };
    let data_json: Result<serde_json::Value, serde_json::Error> =
        serde_json::from_str(data_str.as_str());
    let data_json = match data_json {
        Ok(j) => j,
        Err(e) => return Err(format!("Failed to parse the data json: {}", e).into()),
    };
    let new_version: String = data_json["version"].as_str().unwrap_or("0").to_string();
    log::info!("found remote version: {}", new_version);

    // read the current version from : functions/version.txt
    let version_file = target_dir.join("version.txt");
    let current_version = if version_file.exists() {
        std::fs::read_to_string(&version_file)?.trim().to_string()
    } else {
        "0".to_string()
    };

    // compare the version
    if new_version <= current_version {
        log::info!("It's already the latest version: {}", current_version);
        // no need to update
        let mut cmd_rst = CommandResult::default();
        cmd_rst.status = "ignored".to_string();
        cmd_rst.content = json!(current_version);
        cmd_rst.message = "It's already the latest version".to_string();
        return Ok(cmd_rst);
    }

    log::info!("Update the functions to version: {}", new_version);

    // update the functions
    let url = match data_json["url"].as_str() {
        Some(s) => s,
        None => return Err("Invalid functions.json, missing url".into()),
    };
    let downloaded_file = downloads_dir.join("functions.zip");
    let downloaded_file_str = match downloaded_file.to_str() {
        Some(s) => s,
        None => return Err("Failed to get the destination file path".into()),
    };

    let params = json!({
        "url":url,
        "output_file":downloaded_file_str,
        "resume":false
    });
    let result = download_file(&params).await?;
    if result.status != "ok" {
        return Err(result.message.into());
    }

    // unzip the functions.zip
    let unzipped_dir = downloads_dir.join("functions_new");
    //  - clear the existing `unzipped_dir` if it exists
    if unzipped_dir.exists() {
        std::fs::remove_dir_all(&unzipped_dir)?;
    }
    //  - create the `unzipped_dir`
    std::fs::create_dir_all(&unzipped_dir)?;
    let unzipped_dir_str = match unzipped_dir.to_str() {
        Some(s) => s,
        None => return Err("Failed to get the unzipped directory path".into()),
    };
    let params = json!({
        "input_file":downloaded_file_str,
        "output_dir":unzipped_dir_str
    });
    let result = match unzip_file(&params) {
        Ok(r) => r,
        Err(e) => {
            log::error!("Failed to unzip the functions.zip: {}", e);
            return Err(e);
        }
    };

    if result.status != "ok" {
        log::error!("Failed to unzip the functions.zip: {}", result.message);
        return Err(result.message.into());
    }

    // clean the cur ver's `functions` directory at first (if exists)
    if target_dir.exists() {
        match std::fs::remove_dir_all(&target_dir) {
            Ok(_) => {}
            Err(e) => {
                log::error!("Failed to remove the existing functions directory: {}", e);
            }
        }
    }
    // create target_dir's parent dir
    let target_parent = match target_dir.parent() {
        Some(p) => p,
        None => return Err("Failed to get the parent dir of the target dir".into()),
    };
    match std::fs::create_dir_all(&target_parent) {
        Ok(_) => {}
        Err(e) => {
            log::error!("Failed to create the functions directory: {}", e);
        }
    }

    // rename `unzipped_dir/functions` to `target_dir`
    let from_dir = unzipped_dir.join("functions");
    match std::fs::rename(&from_dir, &target_dir) {
        Ok(_) => {}
        Err(e) => {
            log::error!(
                "Failed to rename dir: from {:?} to {:?}. Error: {:?}",
                from_dir,
                target_dir,
                e
            );
        }
    }

    // remove the downloaded files
    std::fs::remove_file(&downloaded_file)?;
    std::fs::remove_dir_all(&unzipped_dir)?;

    // re-read the version file
    let new_version = match std::fs::read_to_string(&version_file) {
        Ok(s) => s.trim().to_string(),
        Err(_) => {
            log::error!(
                "Failed to read the version file: {}",
                version_file.to_str().unwrap()
            );
            "0".to_string()
        }
    };

    // command result
    let mut cmd_rst = CommandResult::default();
    cmd_rst.content = json!(new_version);
    cmd_rst.message = "Functions updated".to_string();

    Ok(cmd_rst)
}

pub async fn update_i18n() -> Result<CommandResult, BoxedError> {
    let app_ver_dirname = get_app_ver_dirname();
    let downloads_dir = get_app_download_dir()?;
    let target_dir = get_i18n_dir_in_app_data()?;

    // download the latest i18n.json
    let endpoint = format!(
        "https://releases.filethings.net/res/i18n/for-app-{}.json",
        app_ver_dirname
    );
    log::info!("check i18n from: {}", endpoint);
    let latest_data_file = downloads_dir.join("latest-i18n.json");
    let latest_data_file_str = match latest_data_file.to_str() {
        Some(s) => s,
        None => return Err("Failed to get the latest data file path".into()),
    };
    let params = json!({
        "url":endpoint,
        "output_file":&latest_data_file_str,
        "resume":false
    });
    let result = download_file(&params).await?;
    if result.status != "ok" {
        return Err(result.message.into());
    }

    // load the data json
    let data_str = match std::fs::read_to_string(&latest_data_file) {
        Ok(s) => s,
        Err(e) => {
            return Err(format!(
                "Failed to read the latest data file: {}, Error:{}",
                &latest_data_file_str, e
            )
            .into())
        }
    };
    let data_json: Result<serde_json::Value, serde_json::Error> =
        serde_json::from_str(data_str.as_str());
    let data_json = match data_json {
        Ok(j) => j,
        Err(e) => return Err(format!("Failed to parse the data json: {}", e).into()),
    };
    let new_version: String = data_json["version"].as_str().unwrap_or("0").to_string();

    // read the current version
    let version_file = &target_dir.join("version.txt");
    let current_version = if version_file.exists() {
        std::fs::read_to_string(&version_file)?.trim().to_string()
    } else {
        "0".to_string()
    };

    // compare the version
    if new_version <= current_version {
        log::info!("It's already the latest version: {}", current_version);
        // no need to update
        let mut cmd_rst = CommandResult::default();
        cmd_rst.status = "ignored".to_string();
        cmd_rst.content = json!(current_version);
        cmd_rst.message = "It's already the latest version".to_string();
        return Ok(cmd_rst);
    }

    log::info!("Update the i18n to version: {}", new_version);

    let url = match data_json["url"].as_str() {
        Some(s) => s,
        None => return Err("Invalid i18n.json, missing url".into()),
    };
    let downloaded_file = downloads_dir.join("i18n.zip");
    let downloaded_file_str = match downloaded_file.to_str() {
        Some(s) => s,
        None => return Err("Failed to get the destination file path".into()),
    };

    let params = json!({
        "url":url,
        "output_file":downloaded_file_str,
        "resume":false
    });
    let result = download_file(&params).await?;
    if result.status != "ok" {
        return Err(result.message.into());
    }

    // unzip the .zip
    let unzipped_dir = downloads_dir.join("i18n_new");
    //  - clear the existing `unzipped_dir` if it exists
    if unzipped_dir.exists() {
        match std::fs::remove_dir_all(&unzipped_dir) {
            Ok(_) => {}
            Err(e) => {
                log::error!("Failed to remove the existing unzipped directory: {}", e);
            }
        }
    }
    //  - create the `unzipped_dir`
    match std::fs::create_dir_all(&unzipped_dir) {
        Ok(_) => {}
        Err(e) => {
            log::error!("Failed to create the unzipped directory: {}", e);
        }
    }
    let unzipped_dir_str = match unzipped_dir.to_str() {
        Some(s) => s,
        None => return Err("Failed to get the unzipped directory path".into()),
    };
    let params = json!({
        "input_file":downloaded_file_str,
        "output_dir":unzipped_dir_str
    });
    let result = match unzip_file(&params) {
        Ok(r) => r,
        Err(e) => {
            log::error!("Failed to unzip the i18n.zip: {}", e);
            return Err(e);
        }
    };
    if result.status != "ok" {
        log::error!("Failed to unzip the i18n.zip: {}", result.message);
        return Err(result.message.into());
    }

    // remove the dest `i18n` directory at first
    if target_dir.exists() {
        match std::fs::remove_dir_all(&target_dir) {
            Ok(_) => {}
            Err(e) => {
                log::error!("Failed to remove the existing i18n directory: {}", e);
            }
        }
    }
    // create the target_dir's parent dir
    let target_parent = match target_dir.parent() {
        Some(p) => p,
        None => return Err("Failed to get the parent dir of the target dir".into()),
    };
    match std::fs::create_dir_all(&target_parent) {
        Ok(_) => {}
        Err(e) => {
            log::error!("Failed to create the i18n directory: {}", e);
        }
    }
    // rename the unzipped `i18n` to dest `i18n`
    let from_dir = unzipped_dir.join("i18n");
    match std::fs::rename(&from_dir, &target_dir) {
        Ok(_) => {}
        Err(e) => {
            log::error!(
                "Failed to rename dir: from {:?} to {:?}. Error: {:?}",
                from_dir,
                target_dir,
                e
            );
        }
    }

    // clean the downloaded files
    std::fs::remove_file(&downloaded_file)?;
    std::fs::remove_dir_all(&unzipped_dir)?;

    // re-read the version file
    let new_version = match std::fs::read_to_string(&version_file) {
        Ok(s) => s.trim().to_string(),
        Err(_) => {
            log::error!(
                "Failed to read the version file: {}",
                version_file.to_str().unwrap()
            );
            "0".to_string()
        }
    };

    // command result
    let mut cmd_rst = CommandResult::default();
    cmd_rst.content = json!(new_version);
    cmd_rst.message = "I18N translations updated".to_string();

    Ok(cmd_rst)
}

pub async fn download_app_windows_installer(
    params: &JsonValue,
) -> Result<CommandResult, BoxedError> {
    let version = match &params.get("version") {
        Some(v) => v.as_str().ok_or("`version` must be a string")?,
        None => return Err("`version` is required".into()),
    };

    let endpoint = format!(
        "https://releases.filethings.net/app/v{}/FileThings_{}_x64-setup.exe",
        &version, &version
    );

    let downloads_dir = get_app_download_dir()?;

    log::info!("download windows installer from: {}", endpoint);
    let installer_file = downloads_dir.join("filethings-installer.exe");
    let installer_file_str = match installer_file.to_str() {
        Some(s) => s,
        None => return Err("Failed to get the installer file path".into()),
    };
    let params = json!({
        "url":endpoint,
        "output_file":installer_file_str,
        "resume":false
    });
    let result = download_file(&params).await?;
    if result.status != "ok" {
        return Err(result.message.into());
    }

    // command result
    let mut cmd_rst = CommandResult::default();
    cmd_rst.content = json!(installer_file_str);
    cmd_rst.message = "Installer downloaded".to_string();

    Ok(cmd_rst)
}
