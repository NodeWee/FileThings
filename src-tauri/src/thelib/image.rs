use crate::errors::BoxedError;
use crate::thelib::file_path::{make_parent_dirs, split_file_path};
use crate::thelib::svg;
use oxipng;

// use crate::utils::frontend;
use image;
use image::DynamicImage;
use serde_json::json;
use serde_json::Value as JsonValue;
use std::path::Path;

pub const IMAGE_LIB_SUPPORTED_FORMATS: &'static [&'static str] = &[
    "bmp", "dds", "farbfeld", "gif", "hdr", "ico", "jpeg", "exr", "png", "pnm", "qoi", "tga",
    "tiff", "webp",
];

pub fn load_image(path: &str) -> Result<DynamicImage, BoxedError> {
    let path_obj = Path::new(path);
    if !path_obj.exists() {
        return Err(format!("File does not exist: {}", path).into());
    }
    if !path_obj.is_file() {
        return Err(format!("Path is not a file: {}", path).into());
    }

    let (_, _, ext) = split_file_path(path);

    //  if IMAGE_LIB_SUPPORTED_FORMATS contains the ext, load with image::open
    let img: image::DynamicImage;
    if IMAGE_LIB_SUPPORTED_FORMATS.contains(&ext.to_lowercase().as_str()) {
        img = image::open(path)?;
    } else {
        return Err(format!("Unsupported image format: {}", ext).into());
    }

    Ok(img)
}

pub fn save_image_with_png(img: &DynamicImage, path: &str) -> Result<String, BoxedError> {
    let path_obj = Path::new(path);
    let output_path = path_obj.with_extension("png");

    make_parent_dirs(&output_path)?;

    img.save_with_format(&output_path, image::ImageFormat::Png)?;

    Ok(output_path.to_string_lossy().to_string())
}

pub fn file_image_to_svg(
    src_path: &str,
    dest_path: &str,
    args: &JsonValue,
) -> Result<String, BoxedError> {
    // prepare arg - color_colorful
    let color_colorful: bool = args
        .get("color_colorful")
        .unwrap_or(&json!(false))
        .as_bool()
        .unwrap_or(false);

    // get dynamic image
    let img = match load_image(src_path) {
        Ok(img) => {
            // notice: limit width and height, otherwise vtracer will overflow error
            if img.width() > 1024 || img.height() > 1024 {
                let ratio = img.width() as f32 / img.height() as f32;
                let resized_img = img.resize(
                    1024,
                    (1024 as f32 / ratio) as u32,
                    image::imageops::FilterType::Lanczos3,
                );
                resized_img
            } else {
                img
            }
        }
        Err(e) => return Err(e.into()),
    };

    // use image_to_svg to convert dynamic image to svg
    let (_, _, svg_text) = svg::image_to_svg(&img, color_colorful)?;

    make_parent_dirs(&dest_path)?;

    // write svg text to dest_path
    std::fs::write(&dest_path, svg_text.as_bytes())?;

    return Ok(dest_path.to_string());
}

pub fn png_optimize(
    src_path: &str,
    dest_path: &str,
    _args: &JsonValue,
) -> Result<String, BoxedError> {
    let in_file = oxipng::InFile::Path(Path::new(src_path).to_path_buf());

    let out_file = oxipng::OutFile::Path {
        path: Some(Path::new(dest_path).to_path_buf()),
        preserve_attrs: true,
    };

    let mut opts = oxipng::Options::default();
    opts.fix_errors = true;
    opts.force = true;
    // use oxipng to optimize png
    let _ = match oxipng::optimize(&in_file, &out_file, &opts) {
        Ok(png) => png,
        Err(e) => return Err(e.into()),
    };

    return Ok(dest_path.to_string());
}
