use crate::app::resource::get_template_dir_using;
use crate::commands::structures::CommandResult;
use crate::errors::BoxedError;
use crate::thelib::json::load_json_file;
use serde_json::{json, Value as JsonValue};

pub fn list_templates(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let templates_dir = get_template_dir_using()?;
    let scope = match &params.get("scope") {
        // scope is directory name. e.g. "html-to-image"
        Some(v) => v.as_str().ok_or("`scope` must be a string")?,
        None => {
            log::error!("fn list_templates: `scope` is required");
            return Err("`scope` is required".into());
        }
    };
    let category = match &params.get("category") {
        // category is directory name. e.g. "text-to-svg"
        Some(v) => v.as_str().ok_or("`category` must be a string")?,
        None => {
            log::error!("fn list_templates: `category` is required");
            return Err("`category` is required".into());
        }
    };

    let the_data_dir = templates_dir.join(scope).join(category);
    if !the_data_dir.exists() {
        log::error!("Template category not found: {:?}", the_data_dir);
        return Err("Template category not found".into());
    }

    let mut templates: Vec<JsonValue> = vec![];
    // data json: {meta: meta json, scope: scope, category: category, preview: preview image data}
    // 遍历子文件夹,读取 ./meta.json
    for entry in std::fs::read_dir(&the_data_dir)? {
        let entry = entry?;
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }

        let template_name = match path.file_name() {
            Some(v) => v.to_string_lossy().to_string(),
            None => {
                log::error!("path.file_name() error");
                continue;
            }
        };

        let meta_json = match load_json_file(&path.join("meta.json")) {
            Ok(v) => v,
            Err(e) => {
                log::error!("load_json_file error: {:?}", e);
                continue;
            }
        };

        let preview_file = path.join("preview.webp");
        let preview = match std::fs::read(&preview_file) {
            Ok(v) => v,
            Err(e) => {
                log::warn!(
                    "failed to read preview file: {:?}, error: {:?}",
                    preview_file,
                    e
                );
                vec![]
            }
        };

        let template = json!({
            "name": template_name,
            "meta": meta_json,
            "preview": preview
        });

        templates.push(template);
    }

    // sort templates by name
    templates.sort_by(|a, b| {
        let a_name = a["name"].as_str().unwrap_or("");
        let b_name = b["name"].as_str().unwrap_or("");
        a_name.cmp(b_name)
    });

    let mut result = CommandResult::default();
    result.content = json!(templates);

    Ok(result)
}

pub fn get_template_content(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let templates_dir = get_template_dir_using()?;
    let scope = match &params.get("scope") {
        // scope is directory name. e.g. "html-to-image"
        Some(v) => v.as_str().ok_or("`scope` must be a string")?,
        None => {
            log::error!("fn load_template: `scope` is required");
            return Err("`scope` is required".into());
        }
    };
    let category = match &params.get("category") {
        // category is directory name. e.g. "text-to-svg"
        Some(v) => v.as_str().ok_or("`category` must be a string")?,
        None => {
            log::error!("fn load_template: `category` is required");
            return Err("`category` is required".into());
        }
    };
    let template = match &params.get("template") {
        // template is directory name. e.g. "basic"
        Some(v) => v.as_str().ok_or("`template` must be a string")?,
        None => {
            log::error!("fn load_template: `template` is required");
            return Err("`template` is required".into());
        }
    };
    let content_file_name = match &params.get("content_file") {
        // content_file is file name. e.g. "content.html"
        Some(v) => v.as_str().ok_or("`content_file` must be a string")?,
        None => {
            log::error!("fn load_template: `content_file` is required");
            return Err("`content_file` is required".into());
        }
    };

    let content_file = templates_dir
        .join(scope)
        .join(category)
        .join(template)
        .join(content_file_name);
    if !content_file.exists() {
        log::error!("Template content file not found: {:?}", content_file);
        return Err("Template content file not found".into());
    }

    // read content file as string
    let content = match std::fs::read_to_string(&content_file) {
        Ok(v) => v,
        Err(e) => {
            log::error!("read content file error: {:?}", e);
            return Err("read content file error".into());
        }
    };

    let mut result = CommandResult::default();
    result.content = json!(content);

    Ok(result)
}
