use futures::TryStreamExt;
use reqwest::header::{HeaderName, HeaderValue, RANGE};
use std::path::PathBuf;
use tokio::{
    fs,
    io::{AsyncSeekExt, AsyncWriteExt, BufWriter, SeekFrom},
};

use std::collections::HashMap;

pub async fn download_file(
    url: &str,
    file_path: &PathBuf,
    headers: &Option<HashMap<String, String>>,
    resume: bool, // whether support resume download
    client: &reqwest::Client,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    log::info!("Downloading file from {} to {:?}", url, file_path);
    let mut start = 0;

    if file_path.exists() {
        if resume {
            let metadata = fs::metadata(&file_path).await?;
            start = metadata.len();

            if start > metadata.len() {
                log::error!(
                    "Local file is larger than the remote file. Local: {}, Remote: {}",
                    file_path.display(),
                    url
                );
                return Err("File exists but is larger than the remote file".into());
            }
        } else {
            // If the file exists and we're not resuming, delete it
            fs::remove_file(&file_path).await?;
        }
    } else {
        // Create the parent directory if it doesn't exist
        if let Some(parent) = file_path.parent() {
            match fs::create_dir_all(parent).await {
                Ok(_) => {}
                Err(e) => {
                    log::error!("Failed to create parent directory: {:?}", e);
                    return Err(format!("Failed to create parent directory: {:?}", e).into());
                }
            }
        }
    }

    log::debug!("file open");
    // Create/append to the file
    let mut file = if resume {
        fs::OpenOptions::new()
            .create(true)
            .write(true)
            .append(true)
            .open(file_path)
            .await?
    } else {
        fs::OpenOptions::new()
            .write(true)
            .create(true)
            .open(file_path)
            .await?
    };

    log::debug!("file seek to start: {}", start);
    // Seek to the start position
    file.seek(SeekFrom::Start(start)).await?;

    let mut request = client.get(url);
    // Loop through the headers keys and values
    // and add them to the request object.
    if let Some(headers_map) = headers {
        for (key, value) in headers_map {
            request = request.header(
                HeaderName::from_bytes(key.as_bytes())?,
                HeaderValue::from_str(value)?,
            );
        }
    }
    // Add the range header to the request (for resuming downloads)
    if resume {
        // 如果resume为true，才添加Range头部
        request = request.header(RANGE, format!("bytes={}-", start));
    }

    log::debug!("request send");
    let response = request.send().await?;
    log::debug!("url {:?} Response: {:?}", url, response);
    if !response.status().is_success() {
        // if response status is 416 Range Not Satisfiable, consider the file downloaded
        if response.status().as_u16() == 416 {
            log::info!("File already downloaded");
            return Ok(());
        } else {
            log::error!(
                "Error downloading file: {}. URL: {}",
                response.status(),
                url
            );
            return Err(format!("{}. URL: {}", response.status(), url).into());
        }
    }

    let mut file = BufWriter::new(file);
    let mut stream = response.bytes_stream();

    while let Some(chunk) = stream.try_next().await? {
        file.write_all(&chunk).await?;
        file.flush().await?;

        start += chunk.len() as u64;
    }

    log::debug!("Downloaded file: {:?}", file_path);

    Ok(())
}
