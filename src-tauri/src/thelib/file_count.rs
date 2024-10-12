use crate::errors::BoxedError;
use crate::thelib::file_path::{get_relative_path_with_home_dir, split_file_path};
use serde_json::json;
use serde_json::Value as JsonValue;
use std::collections::HashMap;
use std::fs;

struct FilesCounter {
    pub dir_quantity: u64,
    pub file_quantity: u64,
    pub file_quantity_of_types: HashMap<String, u64>,
    pub file_size_sum: u64,
    pub file_size_of_types: HashMap<String, u64>,
    pub file_type_quantity: u64,
}

impl FilesCounter {
    pub fn new() -> Self {
        FilesCounter {
            dir_quantity: 0,
            file_quantity: 0,
            file_quantity_of_types: HashMap::new(),
            file_size_sum: 0,
            file_size_of_types: HashMap::new(),
            file_type_quantity: 0,
        }
    }

    pub fn to_json(&self) -> JsonValue {
        json!({
            "dir_quantity": self.dir_quantity,
            "file_quantity": self.file_quantity,
            "file_quantity_of_types": self.file_quantity_of_types,
            "file_size_sum": self.file_size_sum,
            "file_size_of_types": self.file_size_of_types,
            "file_type_quantity": self.file_type_quantity
        })
    }
}

pub fn count_in_paths(paths: Vec<&str>) -> Result<JsonValue, BoxedError> {
    let mut total: FilesCounter = FilesCounter::new();
    let mut result: HashMap<String, JsonValue> = HashMap::new();

    for path in paths {
        let mut path_counter = FilesCounter::new();
        count_size_and_quantity(path, &mut path_counter)?;
        let rel_path = get_relative_path_with_home_dir(path);
        result.insert(rel_path, path_counter.to_json());

        // add path_counter to total
        total.dir_quantity += path_counter.dir_quantity;
        total.file_quantity += path_counter.file_quantity;
        total.file_size_sum += path_counter.file_size_sum;
        for (file_ext, num) in path_counter.file_quantity_of_types.iter() {
            *total
                .file_quantity_of_types
                .entry(file_ext.to_string())
                .or_insert(0) += num;
        }
        for (file_ext, size) in path_counter.file_size_of_types.iter() {
            *total
                .file_size_of_types
                .entry(file_ext.to_string())
                .or_insert(0) += size;
        }
    }

    total.file_type_quantity = total.file_quantity_of_types.len() as u64;
    result.insert("total".to_string(), total.to_json());

    Ok(json!(result))
}

fn count_size_and_quantity(path: &str, numbers: &mut FilesCounter) -> Result<(), std::io::Error> {
    // if path is a file,
    let file_meta = std::fs::metadata(path)?;
    if file_meta.is_file() {
        numbers.file_quantity += 1;
        numbers.file_size_sum += file_meta.len();
        // get extension of the file by splitting the path by '.', if no '.' found, return empty string
        let (_, _, file_ext) = split_file_path(path);

        *numbers
            .file_quantity_of_types
            .entry(file_ext.to_string())
            .or_insert(0) += 1;
        *numbers
            .file_size_of_types
            .entry(file_ext.to_string())
            .or_insert(0) += file_meta.len();
    } else {
        // else path is a folder,
        numbers.dir_quantity += 1;

        // walk the directory
        for entry in fs::read_dir(path)? {
            let entry = entry?;
            let sub_path = entry.path().to_str().unwrap_or("").to_string();
            count_size_and_quantity(sub_path.as_str(), numbers)?;
        }
    }

    numbers.file_type_quantity = numbers.file_quantity_of_types.len() as u64;

    Ok(())
}

// // test
// #[cfg(test)]
// mod tests {
//     use super::*;

//     #[test]
//     fn test_count_in_paths() {
//         let paths = vec!["./src", "./Cargo.toml"];
//         let result = count_in_paths(paths).unwrap();
//         println!("test_count_in_paths result:\n{}", result);
//     }
// }
