use crate::errors::BoxedError;
use crate::functions::common::structures::{FunctionMatches, FunctionProfile};
use crate::thelib::sys::{get_app_version, get_platform};
use crate::thelib::version::compare_semver;
use serde_json::json;
use serde_json::Value as JsonValue;

#[derive(Clone, Debug)]
pub struct FileFunction {
    pub name: String,
    pub func_type: String,
    pub profile: FunctionProfile,
    pub matches: FunctionMatches,
    pub variables: JsonValue,
    pub worker_file: String,
    pub worker_utils_file: String,
}
impl FileFunction {
    pub fn new(
        name: &str,
        config_data: &JsonValue,
        worker_file: &String,
        worker_utils_file: &String,
    ) -> Result<FileFunction, BoxedError> {
        let func_type = config_data["type"].as_str().unwrap_or("").to_string();
        if func_type.as_str() != "file" {
            return Err(format!("Ignore the function, type is not file: {}", func_type).into());
        }

        let profile_data = config_data["profile"].clone();
        if profile_data.is_null() {
            return Err("Not found `profile` key in config data".into());
        }
        let profile = FunctionProfile::from_json(&profile_data);

        let matches_data = config_data["matches"].clone();
        if matches_data.is_null() {
            return Err("Not found `matches` key in config data".into());
        }
        let matches = FunctionMatches::from_json(&matches_data)?;

        // skip not match platform
        let cur_platform = get_platform();
        if matches.platforms.is_empty() {
            return Err("Ignore the function, not found platforms in matches".into());
        }
        if !matches.platforms.contains(&cur_platform) && !matches.platforms.contains("*") {
            return Err(format!(
                "Ignore the function, not match current platform: {}",
                cur_platform
            )
            .into());
        }

        // match app version
        let cur_app_version = get_app_version();
        if !matches.app_version_min.is_empty() {
            let matched = compare_semver(&cur_app_version, ">=", &matches.app_version_min)?;
            if !matched {
                return Err(format!(
                    "Ignore the function, current app version is lower than min version: {} < {}",
                    cur_app_version, matches.app_version_min
                )
                .into());
            }
        }
        if !matches.app_version_max.is_empty() {
            let matched = compare_semver(&cur_app_version, "<=", &matches.app_version_max)?;
            if !matched {
                return Err(format!(
                    "Ignore the function, current app version is higher than max version: {} > {}",
                    cur_app_version, matches.app_version_max
                )
                .into());
            }
        }

        // variables, optional
        let variables = config_data["variables"].clone();

        Ok(FileFunction {
            name: name.to_string(),
            func_type,
            profile,
            matches,
            variables,
            worker_file: worker_file.to_string(),
            worker_utils_file: worker_utils_file.to_string(),
        })
    }

    pub fn to_json(&self) -> JsonValue {
        json!({
            "name": self.name,
            "func_type": self.func_type,
            "profile": self.profile.to_json(),
            "matches": self.matches.to_json(),
            "variables": self.variables,
            "worker_file": self.worker_file,
            "worker_utils_file": self.worker_utils_file,
        })
    }
}
