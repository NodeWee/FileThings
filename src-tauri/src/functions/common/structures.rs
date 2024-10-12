use crate::errors::BoxedError;
use serde_json::{json, Value as JsonValue};
use std::collections::HashSet;

#[derive(Clone, Debug)]
pub struct FunctionProfile {
    pub title: JsonValue,
    pub summary: JsonValue,
    pub version: String,
    pub website: String,
    pub authors: JsonValue,
}
impl FunctionProfile {
    pub fn from_json(data: &JsonValue) -> FunctionProfile {
        FunctionProfile {
            title: data["title"].clone(),
            summary: data["summary"].clone(),
            version: data["version"].as_str().unwrap_or("").to_string(),
            website: data["website"].as_str().unwrap_or("").to_string(),
            authors: data["authors"].clone(),
        }
    }

    pub fn to_json(&self) -> JsonValue {
        json!({
            "title": self.title,
            "summary": self.summary,
            "version": self.version,
            "website": self.website,
            "authors": self.authors,
        })
    }
}

#[derive(Clone, Debug)]
pub struct FunctionMatches {
    pub platforms: HashSet<String>,
    pub extensions: HashSet<String>,
    pub app_version_min: String,
    pub app_version_max: String,
}
impl FunctionMatches {
    pub fn from_json(data: &JsonValue) -> Result<FunctionMatches, BoxedError> {
        let extensions = data["extensions"]
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .map(|ext| ext.as_str().unwrap_or("").to_lowercase())
            .collect();

        let platforms = data["platforms"]
            .as_array()
            .unwrap_or(&vec![])
            .iter()
            .map(|ext| ext.as_str().unwrap_or("").to_lowercase())
            .collect();

        let app_version_min = data["app"]["min"].as_str().unwrap_or("").to_string();
        let app_version_max = data["app"]["max"].as_str().unwrap_or("").to_string();

        Ok(FunctionMatches {
            extensions,
            platforms,
            app_version_min,
            app_version_max,
        })
    }

    pub fn to_json(&self) -> JsonValue {
        json!({
            "extensions": self.extensions.iter().map(|ext| {
                JsonValue::String(ext.to_string())
            }).collect::<Vec<JsonValue>>(),
            "platforms": self.platforms.iter().map(|ext| {
                JsonValue::String(ext.to_string())
            }).collect::<Vec<JsonValue>>(),
            "app": {
                "min": self.app_version_min.to_string(),
                "max": self.app_version_max.to_string(),
            }
        })
    }
}
