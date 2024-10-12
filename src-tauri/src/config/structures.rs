use crate::app::resource::get_app_data_dir;
use crate::errors::BoxedError;
use serde_json::{json, Value as JsonValue};
use std::path::PathBuf;

pub struct AppConfig {
    config: JsonValue,
    domain: String, // user, default, ...
    scope: String,  // ui, ...
}

impl AppConfig {
    pub fn new(domain: &str, scope: &str) -> Self {
        AppConfig {
            config: json!({}),
            domain: domain.to_string(),
            scope: scope.to_string(),
        }
    }

    pub fn get_file(&self) -> Result<PathBuf, BoxedError> {
        let dir = get_app_data_dir()?;
        let filename = format!("{}.json", self.scope);
        let abs_file = dir.join("settings").join(&self.domain).join(filename);
        Ok(abs_file)
    }

    pub fn load_from_file(&mut self) -> Result<(), BoxedError> {
        let file = self.get_file()?;
        if !file.exists() {
            // create dir and file
            let dir = file.parent().ok_or("Invalid file path, can't get parent")?;
            std::fs::create_dir_all(dir)?;
            std::fs::write(file, "{}")?;
            //
            self.config = json!({});
            return Ok(());
        }

        let data = std::fs::read_to_string(&file)?;
        self.config = serde_json::from_str(&data)?;
        Ok(())
    }

    pub fn get_all(&self) -> Result<JsonValue, BoxedError> {
        return Ok(self.config.clone());
    }

    pub fn get(&self, args: JsonValue) -> Result<JsonValue, BoxedError> {
        let keys = args.as_array().ok_or("Invalid args, require an array")?;
        let mut rst = json!({});
        for key in keys {
            let key_str = match key.as_str() {
                Some(key_str) => key_str,
                None => {
                    continue;
                }
            };
            rst[key_str] = self.config[key_str].clone();
        }

        Ok(rst)
    }

    pub fn set_all(&mut self, data: JsonValue) -> Result<JsonValue, BoxedError> {
        self.config = data;
        self.save_to_file()?;

        Ok(json!({"all": "ok"}))
    }

    pub fn set(&mut self, args: JsonValue) -> Result<JsonValue, BoxedError> {
        let items = args.as_object().ok_or("Invalid args, require an object")?;
        for (key, value) in items {
            self.config[key] = value.clone();
        }

        self.save_to_file()?;

        Ok(json!(items))
    }

    pub fn save_to_file(&self) -> Result<(), BoxedError> {
        let data = serde_json::to_string_pretty(&self.config)?;
        // create dir if not exist
        let file = self.get_file()?;
        let dir = file.parent().ok_or("Invalid file path")?;
        std::fs::create_dir_all(dir)?;
        // write to file
        std::fs::write(&file, data)?;
        log::info!("Saved {} config to file: {:?}", self.scope, file);
        Ok(())
    }
}

pub struct AppStatus {
    pub version: String,
}

impl AppStatus {
    pub fn new() -> Self {
        AppStatus {
            version: "unknown".to_string(),
        }
    }
}
