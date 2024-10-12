use crate::errors::BoxedError;
use crate::thelib::file_path::{make_parent_dirs, split_file_path};
use std::fs;
use std::io::{BufReader, Read, Write};
use std::path::Path;

pub fn split_in_bytes(
    file_path: &str,
    chunk_size: u64,
    output_dir: &str,
) -> Result<Vec<String>, BoxedError> {
    let path = Path::new(file_path);

    // only accept file
    if !path.is_file() {
        return Err("Not a file".into());
    }

    // create output directory if not exists
    if !Path::new(output_dir).exists() {
        fs::create_dir_all(output_dir)?;
    }

    // read file
    let file = fs::File::open(&file_path)?;
    let mut reader = BufReader::new(file);

    // split file
    let mut result = vec![];
    let mut index = 1;
    loop {
        let mut buffer = vec![0; chunk_size as usize];
        let n = reader.read(&mut buffer)?;
        if n == 0 {
            break;
        }

        let (_, file_stem, file_ext) = split_file_path(&file_path);
        let part_file_name = format!("{}.{}.{:03}", file_stem, file_ext, index);
        let output_file = Path::new(output_dir).join(part_file_name);
        let output_file_string = output_file.to_str().ok_or("Invalid path")?.to_string();
        let mut output = fs::File::create(&output_file)?;
        output.write_all(&buffer[..n])?;

        result.push(output_file_string);
        index += 1;
    }

    Ok(result)
}

pub fn join_in_bytes(input_files: &Vec<String>, output_file: &str) -> Result<String, BoxedError> {
    log::info!(
        "join_in_bytes - input_files: {:?}, output_file: {}",
        input_files,
        output_file
    );

    // remove output file if exists
    if Path::new(output_file).exists() {
        fs::remove_file(output_file)?;
    }

    make_parent_dirs(&output_file)?;

    // create output file
    let mut output = fs::File::create(&output_file)?;

    // sort input files
    let mut sorted_files = input_files.clone();
    sorted_files.sort();

    // merge files
    for file_path in sorted_files {
        let file = fs::File::open(&file_path)?;
        let mut reader = BufReader::new(file);

        let mut buffer = vec![];
        reader.read_to_end(&mut buffer)?;

        output.write_all(&buffer)?;
        output.flush()?;
        output.sync_all()?; // Ensure all data is written to disk
    }

    Ok(output_file.to_string())
}
