use crate::commands::structures::CommandResult;
use crate::commands::utils::get_string_val_from_params;
use crate::commands::utils::{parse_file_conversion_params, FileConversionParams};
use crate::errors::BoxedError;
use crate::thelib;
use serde_json::{json, Value as JsonValue};

pub fn raw_svg_to_png(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let svg_text = match params["svg"].as_str() {
        Some(s) => s,
        None => {
            return Err("Missing 'svg' parameter".into());
        }
    };

    let width = match params["width"].as_u64() {
        Some(w) => w as u32,
        None => 0, // default, use the SVG viewBox width
    };

    let height = match params["height"].as_u64() {
        Some(h) => h as u32,
        None => 0, // default, use the SVG viewBox height
    };

    let (w, h, data) = thelib::svg::svg_to_png(svg_text, width, height)?;

    let mut result = CommandResult::default();

    result.content = json!({
        "width": w,
        "height": h,
        "data": data,
    });

    Ok(result)
}

pub fn file_svg_to_png(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let input_file = get_string_val_from_params(vec!["input_file"], &params)?;
    let output_file = get_string_val_from_params(vec!["output_file"], &params)?;

    let width = match params["width"].as_u64() {
        Some(w) => w as u32,
        None => 0, // default, use the SVG viewBox width
    };
    let height = match params["height"].as_u64() {
        Some(h) => h as u32,
        None => 0, // default, use the SVG viewBox height
    };

    let svg_text = std::fs::read_to_string(&input_file)?;
    let (_, _, png_data) = thelib::svg::svg_to_png(&svg_text, width, height)?;
    std::fs::write(&output_file, &png_data)?;

    let mut result = CommandResult::default();
    result.add_output_path(&output_file);
    Ok(result)
}

pub fn file_image_to_svg(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let mut result = CommandResult::default();
    let mut fcp: FileConversionParams = parse_file_conversion_params(params)?;

    if fcp.src_ext == fcp.target_ext {
        result.status = "ignored".to_string();
        result.message = "Source and target format are the same".to_string();
        return Ok(result);
    }

    fcp.actual_output_file =
        thelib::image::file_image_to_svg(&fcp.input_file, &fcp.actual_output_file, &params)?;

    // result.status = "ok".to_string();
    result.add_output_path(&fcp.actual_output_file);
    result.content = json!(fcp.actual_output_file.clone());

    Ok(result)
}

pub fn remove_background(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let mut result = CommandResult::default();
    let mut fcp: FileConversionParams = parse_file_conversion_params(params)?;

    let img = thelib::image::load_image(&fcp.input_file)?;
    let img_without_bg = thelib::image_rmbg::remove_background(&img)?;
    // write image to file
    fcp.actual_output_file =
        thelib::image::save_image_with_png(&img_without_bg, &fcp.actual_output_file)?;

    result.add_output_path(&fcp.actual_output_file);
    result.content = json!(fcp.actual_output_file.clone());

    Ok(result)
}

pub fn png_optimize(params: &JsonValue) -> Result<CommandResult, BoxedError> {
    let mut result = CommandResult::default();
    let mut fcp: FileConversionParams = parse_file_conversion_params(params)?;

    fcp.actual_output_file =
        thelib::image::png_optimize(&fcp.input_file, &fcp.actual_output_file, &params)?;

    result.add_output_path(&fcp.actual_output_file);
    result.content = json!(fcp.actual_output_file.clone());

    Ok(result)
}
