use crate::commands::structures::CommandResult;
use crate::commands::utils::get_string_val_from_params;
use crate::errors::BoxedError;
use serde_json::{json, Value as JsonValue};
use std::collections::HashMap;

pub fn get_tags(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let input_file = get_string_val_from_params(vec!["input_file", "file"], &params)?;
    let tags = match params["tags"].as_array() {
        Some(tags) => tags,
        None => return Err("Missing tags parameter".into()),
    };

    // read exif data
    let file = std::fs::File::open(input_file)?;
    let mut bufreader = std::io::BufReader::new(&file);
    let exifreader = exif::Reader::new();
    let exif = exifreader.read_from_container(&mut bufreader)?;

    let mut tags_data: HashMap<String, String> = HashMap::new();
    for tag in tags {
        let tag_name = match tag.as_str() {
            Some(tag_name) => tag_name,
            None => return Err("Invalid tag name".into()),
        };

        match tag_name {
            "DateTimeOriginal" => {
                // result format: "2024-03-20 17:49:58"
                let r = match exif.get_field(exif::Tag::DateTimeOriginal, exif::In::PRIMARY) {
                    Some(field) => field.display_value().to_string(),
                    None => return Err("No DateTimeOriginal field found".into()),
                };
                tags_data.insert(tag_name.to_string(), r);
            }
            _ => {
                return Err(format!("Tag {} not supported", tag_name).into());
            }
        }
    }

    let mut result = CommandResult::default();
    result.content = json!(tags_data);

    Ok(result)
}
