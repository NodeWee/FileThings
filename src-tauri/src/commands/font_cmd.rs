use crate::app::resource::get_font_dir;
use crate::commands::structures::CommandResult;
use crate::errors::BoxedError;
use crate::thelib::sys::get_home_dir;
use serde_json::{json, Value as JsonValue};
use std::fs::File;
use std::io::Read;
use ttf_parser::Face as FontFace;

pub fn list_system_fonts(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let font_dir = get_font_dir()?;
    let exts: Vec<&str> = match params.get("exts") {
        Some(v) => v
            .as_array()
            .ok_or("exts must be an array")?
            .iter()
            .map(|v| v.as_str().unwrap_or(""))
            .collect(),
        None => vec![],
    };

    let mut fonts: Vec<(String, JsonValue)> = vec![];

    for entry in std::fs::read_dir(font_dir)? {
        let entry = entry?;
        let path = entry.path();
        if path.is_file() {
            let ext = path.extension().unwrap_or_default().to_str().unwrap_or("");
            if exts.is_empty() || exts.contains(&ext) {
                let path_str = path.to_str().unwrap_or("");
                // 读取字体文件
                let mut file = match File::open(&path) {
                    Ok(f) => f,
                    Err(e) => {
                        log::error!("Unable to open font file: {}", e);
                        continue;
                    }
                };
                let mut buffer = Vec::new();
                match file.read_to_end(&mut buffer) {
                    Ok(_) => (),
                    Err(e) => {
                        log::error!("Unable to read font file: {}", e);
                        continue;
                    }
                }

                // 解析字体文件
                let face = match FontFace::parse(&buffer, 0) {
                    Ok(f) => f,
                    Err(e) => {
                        log::error!("Unable to parse font file: {}", e);
                        continue;
                    }
                };

                // 获取字体的全名
                let mut names: Vec<JsonValue> = vec![];
                let mut full_name: String = "".to_string();
                let mut local_name: String = "".to_string();
                let mut family_name: String = "".to_string();
                if !face.names().is_empty() {
                    for i in 0..face.names().len() {
                        if let Some(name) = face.names().get(i) {
                            let name_str = match name.to_string() {
                                Some(s) => s,
                                None => "".to_string(),
                            };
                            names.push(json!({
                                "name": name_str.clone(),
                                "language_id": name.language_id.to_string(),
                                "encoding_id": name.encoding_id.to_string(),
                                "name_id": name.name_id.to_string(),
                            }));
                            if name.language_id == 1033 && name.name_id == 1 {
                                family_name = name_str.clone();
                            }
                            if name.language_id == 1033 && name.name_id == 4 {
                                full_name = name_str.clone();
                            }
                            if name.language_id == 2052 && name.name_id == 1 {
                                local_name = name_str.clone();
                            }
                        }
                    }
                }

                let font = json!({
                    "path": path_str,
                    "ext": ext,
                    "full_name": full_name,
                    "family_name": family_name,
                    "local_name": local_name,
                    "names": names,
                });

                fonts.push((full_name.clone(), font));
            }
        }
    }

    // sorted fonts by full_name
    fonts.sort_by(|a, b| a.0.cmp(&b.0));
    let font_items = fonts
        .iter()
        .map(|f| f.1.clone())
        .collect::<Vec<JsonValue>>();

    let mut result = CommandResult::default();
    let home_dir_str: String = match get_home_dir() {
        Ok(s) => s.to_str().unwrap_or("").to_string(),
        Err(_) => "".to_string(),
    };
    result.content = json!({
        "fonts": &font_items,
        "home_dir": home_dir_str
    });
    Ok(result)
}
