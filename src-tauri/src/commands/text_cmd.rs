use crate::commands::structures::CommandResult;
use crate::errors::BoxedError;
use serde_json::{json, Value as JsonValue};
use std::collections::HashMap;

pub fn replace_text(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let text = params["text"].as_str().ok_or("text must be a string")?;
    let map = params["map"].as_object().ok_or("map must be a object")?;
    let mut text_replaced = text.to_string();
    for (key, value) in map.iter() {
        let find = key.as_str();
        let value_str = value.as_str().ok_or("map value must be a string")?;
        text_replaced = text_replaced.replace(&find, &value_str);
    }

    let mut result = CommandResult::default();
    result.content = json!(text_replaced);

    Ok(result)
}

pub fn replace_words(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let text = params["text"].as_str().ok_or("text must be a string")?;
    let map = params["map"].as_object().ok_or("map must be a object")?;
    let mut text_replaced = text.to_string();
    for (key, value) in map.iter() {
        let find = key.as_str();
        let value_str = value.as_str().ok_or("map value must be a string")?;
        text_replaced = text_replaced.replace(&format!("\\b{}\\b", find), &value_str);
    }

    let mut result = CommandResult::default();
    result.content = json!(text_replaced);

    Ok(result)
}

pub fn regex_extract(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let text = match &params.get("text") {
        Some(v) => v.as_str().ok_or("`text` must be a string")?,
        None => return Err("`text` is required".into()),
    };
    let pattern = match &params.get("pattern") {
        Some(v) => v.as_str().ok_or("`pattern` must be a string")?,
        None => return Err("`pattern` is required".into()),
    };
    let captures = match &params.get("captures") {
        Some(v) => v.as_array().ok_or("`captures` must be a array")?,
        None => return Err("`captures` is required".into()),
    };

    let re = regex::Regex::new(pattern).map_err(|e| format!("pattern error: {}", e))?;
    let caps = re.captures(text).ok_or("pattern not match")?;
    let mut extractions: Vec<String> = Vec::new();
    for cap in captures.iter() {
        let cap_index = cap.as_u64().ok_or("capture index must be a number")? as usize;
        let cap_value = caps.get(cap_index).ok_or("capture index out of range")?;

        extractions.push(cap_value.as_str().trim().to_string());
    }

    let mut result = CommandResult::default();
    result.content = json!(extractions);

    Ok(result)
}

pub fn regex_find_all(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let text = match &params.get("text") {
        Some(v) => v.as_str().ok_or("`text` must be a string")?,
        None => return Err("`text` is required".into()),
    };
    let pattern = match &params.get("pattern") {
        Some(v) => v.as_str().ok_or("`pattern` must be a string")?,
        None => return Err("`pattern` is required".into()),
    };

    let re = regex::Regex::new(pattern).map_err(|e| format!("pattern error: {}", e))?;
    let matches: Vec<String> = re.find_iter(text).map(|m| m.as_str().to_string()).collect();

    let mut result = CommandResult::default();
    result.content = json!(matches);

    Ok(result)
}

pub fn split_text(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let text = params["text"].as_str().ok_or("text must be a string")?;
    let separator = params["separator"]
        .as_str()
        .ok_or("separator must be a string")?;
    let parts: Vec<&str> = text.split(separator).collect();

    let mut result = CommandResult::default();
    result.content = json!(parts);

    Ok(result)
}

pub fn datetime_split(parameters: &JsonValue) -> Result<CommandResult, BoxedError> {
    let datetime = parameters["datetime"]
        .as_str()
        .ok_or("Missing `datetime` parameter")?;
    // datetime format: "2021-08-01 12:34:56 +08:00" or "2021-08-01 12:34:56"
    //  or "2021-08-01T12:34:56+08:00" or "2021-08-01T12:34:56"
    //  or "2021-08-01T12:34:56Z" or "2021-08-01T12:34:56.123456Z"
    //  or "2021-08-01T12:34:56.123456+08:00" or "2021-08-01T12:34:56.123456-08:00"
    //  or "2021-08-01 12:34" or "2021-08-01T12:34"

    // split datetime to year, month, day, hour, minute, second, timezone
    // - normalize datetime string format
    let mut datetime_str = datetime.to_string();
    datetime_str = datetime_str.replace("Z", "");
    datetime_str = datetime_str.replace("T", " ");
    datetime_str = datetime_str.replace("+", " ");
    datetime_str = datetime_str.replace(".", " ");
    // replace multiple spaces with one space
    datetime_str = datetime_str
        .split_whitespace()
        .collect::<Vec<&str>>()
        .join(" ");

    let datetime_parts: Vec<&str> = datetime_str.split(" ").collect();
    if datetime_parts.len() < 2 {
        return Err(Box::new(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "Invalid datetime format",
        )));
    }

    let date_parts: Vec<&str> = datetime_parts[0].split("-").collect();
    if date_parts.len() != 3 {
        return Err(Box::new(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "Invalid date format",
        )));
    }

    let time_parts: Vec<&str> = datetime_parts[1].split(":").collect();
    if time_parts.len() < 2 {
        return Err(Box::new(std::io::Error::new(
            std::io::ErrorKind::InvalidInput,
            "Invalid time format",
        )));
    }

    let timezone = if datetime_parts.len() > 2 {
        // split by "+" or "-"
        let timezone_parts: Vec<&str> = datetime_parts[2].split(|c| c == '+' || c == '-').collect();
        if timezone_parts.len() > 1 {
            let timezone_sign = if datetime_parts[2].contains("-") {
                "-"
            } else {
                "+"
            };
            format!("{}{}", timezone_sign, timezone_parts[1])
        } else {
            if timezone_parts[0].contains(":") {
                format!("+{}", timezone_parts[0])
            } else {
                "".to_string()
            }
        }
    } else {
        "".to_string()
    };

    let mut datetime_map: HashMap<String, String> = HashMap::new();
    datetime_map.insert("{year}".to_string(), date_parts[0].to_string());
    datetime_map.insert("{month}".to_string(), date_parts[1].to_string());
    datetime_map.insert("{day}".to_string(), date_parts[2].to_string());
    datetime_map.insert("{hour}".to_string(), time_parts[0].to_string());
    datetime_map.insert("{minute}".to_string(), time_parts[1].to_string());
    datetime_map.insert(
        "{second}".to_string(),
        if time_parts.len() > 2 {
            time_parts[2].to_string()
        } else {
            "00".to_string()
        },
    );
    datetime_map.insert("timezone".to_string(), timezone);

    let mut result = CommandResult::default();
    result.content = json!(datetime_map);

    Ok(result)
}

pub fn regex_match(parameters: &JsonValue) -> Result<CommandResult, BoxedError> {
    let text = parameters["text"]
        .as_str()
        .ok_or("Missing `text` parameter")?;

    let empty_vec = vec![];
    let patterns = parameters["patterns"].as_array().unwrap_or(&empty_vec);
    let mut patterns_arr: Vec<&str> = patterns.iter().map(|v| v.as_str().unwrap_or("")).collect();
    let pattern = parameters["pattern"].as_str().unwrap_or("");
    if patterns.len() == 0 && pattern == "" {
        return Err("Missing `patterns` or `pattern` parameter".into());
    }
    if patterns.len() == 0 {
        patterns_arr.push(pattern);
    }

    let mut is_matched = false;
    for pat in patterns_arr.iter() {
        let re = regex::Regex::new(pat).map_err(|e| format!("pattern error: {}", e))?;
        if re.is_match(text) {
            is_matched = true;
            break;
        }
    }

    let mut result = CommandResult::default();
    result.content = json!(is_matched);

    Ok(result)
}
