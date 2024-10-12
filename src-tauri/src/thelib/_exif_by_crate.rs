// use crate::file_do::file_name::{generate_unique_filepath, split_file_path};
// use crate::structures::ThingResult;
// use csv;
// use exif::Reader;
// use exif::Tag;
// // use image;
// //  image lib - supported: AVIF,BMP,DDS,,GIF,HDR,ICO,JPEG,EXR,PNG,PNM,QOI,TGA,TIFF,WebP
// use serde_json::json;
// use serde_json::Value as JsonValue;
// use std::collections::HashMap;
// use std::error::Error;
// use std::fs::File;
// use std::io::BufReader;
// use std::path::Path;

// pub fn read_exif(
//     dry_run: &bool,
//     src_path: &str,
//     args: &JsonValue,
// ) -> Result<Option<ThingResult>, Box<dyn Error>> {
//     // ignore directory
//     if Path::new(&src_path).is_dir() {
//         return Ok(None);
//     }

//     let mut result = ThingResult::default();

//     let file_path_result = split_file_path(&src_path)?;
//     let (_, _, file_ext) = file_path_result;

//     // filter out not supported image files(ignore case)
//     //  Supported: TIFF, JPEG, HEIF, AVIF, PNG, and WebP
//     let allowed_exts = vec![
//         "tiff", "tif", "jpeg", "jpg", "heif", "heic", "avif", "png", "webp",
//     ];
//     if !allowed_exts.contains(&file_ext.as_str()) {
//         result.is_ignore = true;
//         return Ok(Some(result));
//     }

//     // get args
//     let export_to_json: bool = args
//         .get("export_to_json")
//         .unwrap_or(&json!(false))
//         .as_bool()
//         .unwrap_or(false);
//     let export_to_csv: bool = args
//         .get("export_to_csv")
//         .unwrap_or(&json!(false))
//         .as_bool()
//         .unwrap_or(false);

//     // get exif datetime
//     let file = File::open(src_path)?;
//     let mut bufreader = BufReader::new(&file);
//     let exifreader = Reader::new();
//     let exif = exifreader.read_from_container(&mut bufreader)?;

//     let mut fields_map: HashMap<String, String> = HashMap::new();
//     exif.fields().for_each(|field| {
//         let value = field.display_value().with_unit(&exif);
//         if field.tag != Tag::MakerNote {
//             fields_map.insert(field.tag.to_string(), value.to_string());
//         }
//     });
//     // hash map to json object
//     let fields_json = json!(fields_map);

//     // save to file in json format
//     if export_to_json {
//         let new_dest_json_filepath = generate_unique_filepath(&format!("{}-exif.json", src_path))?;
//         if !*dry_run {
//             let new_file = File::create(&new_dest_json_filepath)?;
//             serde_json::to_writer_pretty(new_file, &fields_json)?;
//         }
//         result.dest_paths.push(new_dest_json_filepath);
//     }
//     if export_to_csv {
//         let new_dest_csv_filepath = generate_unique_filepath(&format!("{}-exif.csv", src_path))?;
//         if !*dry_run {
//             let new_file = File::create(&new_dest_csv_filepath)?;
//             let mut wtr = csv::Writer::from_writer(new_file);
//             for (key, value) in fields_map.iter() {
//                 wtr.write_record(&[key, value])?;
//             }
//             wtr.flush()?;
//         }
//         result.dest_paths.push(new_dest_csv_filepath);
//     }

//     let output = json!({
//         "file": src_path,
//         "exif": fields_json,
//     });
//     result.output = Some(output);

//     return Ok(Some(result));
// }
