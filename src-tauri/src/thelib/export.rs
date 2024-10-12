use crate::errors::BoxedError;
use crate::structures::{ThingTaskControl, ThingTaskPath, ThingTaskResult, ThingTask};
// use crate::thing_lib::{file_attribute, file_count};
use serde_json;

pub fn export_data(
    _app: &tauri::AppHandle,
    _task_path: &ThingTaskPath,
    task_thing: &ThingTask,
    _task_control: &mut ThingTaskControl,
    task_result: &mut ThingTaskResult,
) -> Result<(), BoxedError> {
    let path_rst_idx = task_result.add_new_path_result("");

    let data = task_thing.args.get("data").ok_or("No data to process")?;
    let format: String = task_thing
        .args
        .get("format")
        .ok_or("Require format parameter")?
        .as_str()
        .ok_or("format must be a string")?
        .to_string()
        .to_lowercase();
    let dest_path: &str = task_thing
        .args
        .get("dest_path")
        .ok_or("Require dest_path parameter")?
        .as_str()
        .ok_or("dest_path must be a string")?;

    task_result.path_results[path_rst_idx]
        .dest_paths
        .push(dest_path.to_string());

    match format.as_str() {
        "json" => match serde_json::to_string_pretty(data) {
            Ok(json_str) => {
                std::fs::write(dest_path, json_str)?;
                Ok(())
            }
            Err(e) => {
                return Err(e.into());
            }
        },
        _ => {
            return Err(format!("Unsupported format: {}", format).into());
        }
    }
}

// pub fn file_attribute(
//     paths: &Vec<String>,
//     _args: &JsonValue,
//     task_control: &mut ThingTaskControl,
//     task_result: &mut ThingTaskResult,
// ) -> Result<(), BoxedError> {
//     let src_path = &paths[0]; // this method only process one path at a time
//     let path_rst_idx = task_result.add_new_path_result(src_path);

//     let path = Path::new(src_path);
//     if !path.exists() {
//         task_result.path_results[path_rst_idx].status = PathProcessStatus::NotExist;
//         return Ok(());
//     }

//     let basic_attr = lib_attr::get_basic(src_path)?;
//     let meta_attr = lib_attr::get_metadata(src_path)?;
//     let all = json!({
//         "basic":basic_attr,
//         "metadata":meta_attr
//     });
//     // save to file

//     Ok(())
// }
