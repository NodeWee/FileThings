use crate::errors::BoxedError;
use crate::functions::tool::read::{check_tool_available, get_bin_path};
use rmbg::Rmbg;
use image;
use image::DynamicImage;
use once_cell::sync::Lazy;
use std::path::Path;
use std::sync::Mutex;

static RMBG_MODEL: Lazy<Mutex<Option<Rmbg>>> = Lazy::new(|| Mutex::new(None));
const MISSING_TOOL_MESSAGE_TEMPLATE: &str = "Tool `{}` not available, please install it first.";
const RMBG_TOOL_NAME: &str = "tool.model.briaai_rmbg";

pub fn remove_background(original_img: &DynamicImage) -> Result<DynamicImage, BoxedError> {
    let is_available = check_tool_available(&RMBG_TOOL_NAME)?;
    if !is_available {
        let msg = MISSING_TOOL_MESSAGE_TEMPLATE.replace("{}", RMBG_TOOL_NAME);
        log::error!("{}", msg);
        return Err(msg.into());
    }
    let model_file = get_bin_path(&RMBG_TOOL_NAME)?;
    let model_path = Path::new(&model_file);

    let mut model_lock = RMBG_MODEL.lock().unwrap_or_else(|e| e.into_inner());
    if model_lock.is_none() {
        *model_lock = Some(Rmbg::new(model_path)?);
        log::info!("AI Model loaded: {}", RMBG_TOOL_NAME);
    }
    let rmbg = match model_lock.as_ref() {
        Some(m) => m,
        None => return Err(format!("Failed to load AI model: {}", RMBG_TOOL_NAME).into()),
    };

    // Remove the background
    let img_without_bg = match rmbg.remove_background(&original_img) {
        Ok(img) => img,
        Err(e) => {
            return Err(format!("Failed to remove background: {}", e).into());
        }
    };

    Ok(img_without_bg)
}

// fn notify_user_require_ai_model(app: &tauri::AppHandle, model: &ModelNames) {
//     match frontend::notify_user(
//         app,
//         "dependency",
//         &frontend::pack_notify_data_dependency("model", &model.to_str(), ""),
//     ) {
//         Ok(_) => {}
//         Err(e) => {
//             log::error!("Failed to notify user: {}", e);
//         }
//     }
// }
