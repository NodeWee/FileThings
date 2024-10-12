use crate::app::resource::get_app_data_dir;
use crate::errors::BoxedError;
use crate::functions::common::structures::{FunctionMatches, FunctionProfile};
use crate::thelib::sys::{get_app_version, get_platform};
use crate::thelib::version::compare_semver;
use serde_json::{json, Value as JsonValue};
use std::path::{Path, PathBuf};

#[derive(Clone, Debug)]
pub struct ToolFunction {
    pub name: String,
    pub func_type: String,
    pub profile: FunctionProfile,
    pub matches: FunctionMatches,
    pub worker_file: String,
    pub worker_utils_file: String,
    pub bin_path: String,
    pub bin_version_args: Vec<String>,
    pub required_bin_version_min: String,
    pub required_bin_version_max: String,
    pub installation: JsonValue,
    // status properties
    pub available: bool,
    pub version: String,
}

impl ToolFunction {
    pub fn new(
        name: &String,
        config_data: &JsonValue,
        worker_file: &String,
        worker_utils_file: &String,
    ) -> Result<ToolFunction, BoxedError> {
        let func_type = config_data["type"].as_str().unwrap_or("").to_string();
        if !["tool.exe", "tool.model"].contains(&func_type.as_str()) {
            return Err(format!("Ignore the function, unknown type: {}", func_type).into());
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

        // get bin path
        let all_bin_paths = &config_data["bin"]["path"];
        if all_bin_paths.is_null() {
            return Err("Not found `bin.path` key in config data".into());
        }
        // get bin path by platform: 1st. try current platform string, 2nd. try all os (*) string
        let path_json = all_bin_paths
            .get(get_platform().as_str())
            .unwrap_or(all_bin_paths.get("*").unwrap_or(&JsonValue::Null));
        if path_json.is_null() {
            return Err("Not found bin path for current platform".into());
        }
        let path_str = path_json.as_str().unwrap_or("");
        // if contains `/`, split it, then use path_join to join it
        let mut bin_path: PathBuf;
        if path_str.contains("/") {
            let path_parts: Vec<&str> = path_str.split("/").collect();
            bin_path = get_app_data_dir()?;
            for part in path_parts {
                bin_path = bin_path.join(part);
            }
        } else {
            bin_path = Path::new(path_str).to_path_buf();
        }

        // get version arguments of exe tool
        let version_arguments: Vec<&str> = match config_data["bin"]["version_arguments"].as_array()
        {
            Some(arr) => arr.iter().map(|v| v.as_str().unwrap_or("")).collect(),
            None => vec![],
        };
        // tool.exe: required version arguments of exe tool
        if func_type.as_str() == "tool.exe" && version_arguments.is_empty() {
            return Err("Missing `version_arguments` in config data for tool.exe".into());
        }

        // get required version (optional)
        let required_version_min = config_data["bin"]["required_version"]["min"]
            .as_str()
            .unwrap_or("")
            .to_string();
        let required_version_max = config_data["bin"]["required_version"]["max"]
            .as_str()
            .unwrap_or("")
            .to_string();

        // get bin installation data
        let installation = config_data["bin"]["installation"].clone();

        Ok(ToolFunction {
            name: name.to_string(),
            func_type,
            profile,
            matches,
            worker_file: worker_file.to_string(),
            worker_utils_file: worker_utils_file.to_string(),
            bin_path: bin_path.to_string_lossy().to_string(),
            bin_version_args: version_arguments.iter().map(|v| v.to_string()).collect(),
            required_bin_version_min: required_version_min,
            required_bin_version_max: required_version_max,
            installation,
            //
            available: false, // default false
            version: "".to_string(),
        })
    }

    pub fn to_json(&self) -> JsonValue {
        json!({
            "name": self.name,
            "func_type": self.func_type,
            "profile": self.profile.to_json(),
            "matches": self.matches.to_json(),
            "worker_file": self.worker_file,
            "worker_utils_file": self.worker_utils_file,
            "bin_path": self.bin_path,
            "bin_version_args": self.bin_version_args,
            "required_bin_version": {
                "min": self.required_bin_version_min,
                "max": self.required_bin_version_max
            },
            "installation": self.installation,
            //
            "available": self.available,
            "version": self.version
        })
    }
}
