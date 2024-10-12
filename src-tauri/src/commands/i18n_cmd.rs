use crate::app::resource::get_i18n_dir_using;
use crate::commands::structures::CommandResult;
use crate::errors::BoxedError;
use crate::thelib::json::load_json_file;
use serde_json::{json, Value as JsonValue};

pub fn load_languages() -> Result<CommandResult, BoxedError> {
    let i18n_dir = get_i18n_dir_using()?;
    let file = i18n_dir.join("languages.json");
    log::info!("Loading languages from: {:?}", file);

    let data = match load_json_file(&file) {
        Ok(v) => v,
        Err(e) => {
            log::error!("Failed to load languages: {}", e);
            return Err(e.into());
        }
    };

    let mut result = CommandResult::default();
    result.content = json!(data);

    Ok(result)
}

pub fn load_translation(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let i18n_dir = get_i18n_dir_using()?;

    let lang_code = match &params.get("lang_code") {
        Some(v) => v.as_str().ok_or("`lang_code` must be a string")?,
        None => {
            log::error!("fn load_translation: `lang_code` is required");
            return Err("`lang_code` is required".into());
        }
    };

    let lang_dir = i18n_dir.join(lang_code);

    let file_names = vec!["app.json", "file-info.json", "raw.json"];
    let mut lang_data = json!({});
    for file_name in file_names {
        let key = file_name.split('.').next().unwrap_or("");
        let file_path = lang_dir.join(file_name);
        if !file_path.exists() {
            continue;
        }
        let data = match load_json_file(&file_path.to_str().unwrap_or("")) {
            Ok(v) => v,
            Err(e) => {
                log::error!("Failed to load language data: {}", e);
                json!({})
            }
        };
        lang_data[key] = data;
    }

    let mut result = CommandResult::default();
    result.content = json!(lang_data);

    Ok(result)
}
