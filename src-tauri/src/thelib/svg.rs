use crate::errors::BoxedError;
use image::DynamicImage;
use resvg; // for svg to png
use vtracer; // for image to svg

/// return: width, height, svg text
pub fn image_to_svg(
    img: &DynamicImage,
    color_colorful: bool,
) -> Result<(u32, u32, String), BoxedError> {
    // create vtracer config
    let mut cfg = vtracer::Config::default();
    if !color_colorful {
        cfg.color_mode = vtracer::ColorMode::Binary;
    }

    // DynamicImage to ColorImage
    let mut clr_img = vtracer::ColorImage::new();
    clr_img.width = img.width() as usize;
    clr_img.height = img.height() as usize;

    clr_img.pixels = img.to_rgba8().into_raw().to_vec();

    let svg_data = match vtracer::convert(clr_img, cfg) {
        Ok(svg_data) => svg_data,
        Err(e) => {
            return Err(format!("Failed to convert image to svg: {}", e).into());
        }
    };

    let width = svg_data.width as u32;
    let height = svg_data.height as u32;
    let svg_text = svg_data.to_string();

    Ok((width, height, svg_text))
}

/// return: width, height, png data
pub fn svg_to_png(
    svg_text: &str,
    width: u32,
    height: u32,
) -> Result<(u32, u32, Vec<u8>), BoxedError> {
    // dependencies: resvg

    // svg tree
    let tree_options = resvg::usvg::Options::default();
    let fontdb = resvg::usvg::fontdb::Database::new();
    let svg_tree = resvg::usvg::Tree::from_str(&svg_text, &tree_options, &fontdb)?;

    // svg transform (sx,sy for scale(缩放), kx,ky for skew(倾斜), tx,ty for translate(平移))
    //  row: sx,ky,kx,sy,tx,ty
    let out_width: u32;
    let out_height: u32;
    if width > 0 {
        out_width = width.clone();
    } else {
        out_width = svg_tree.view_box().rect.width() as u32;
    }
    if height > 0 {
        out_height = height.clone();
    } else {
        out_height = svg_tree.view_box().rect.height() as u32;
    }

    let sx: f32;
    let sy: f32;
    sx = out_width as f32 / svg_tree.view_box().rect.width();
    sy = out_height as f32 / svg_tree.view_box().rect.height();

    let transform = resvg::tiny_skia::Transform::from_row(sx, 0.0, 0.0, sy, 0.0, 0.0);
    let mut data = vec![0; (out_width * out_height * 4) as usize]; // 4 bytes per pixel for RGBA
    let mut pixmap_mut = resvg::tiny_skia::PixmapMut::from_bytes(&mut data, out_width, out_height)
        .ok_or("Failed to create PixmapMut")?;

    // render svg to pixmap
    resvg::render(&svg_tree, transform, &mut pixmap_mut);

    // encode pixmap to png data
    let png_data = match resvg::tiny_skia::PixmapRef::from(pixmap_mut.as_ref()).encode_png() {
        Ok(png_data) => png_data,
        Err(_) => {
            return Err("Failed to encode png data".to_string().into());
        }
    };

    Ok((out_width, out_height, png_data))
}
