use crate::errors::BoxedError;
use std::fs::File;
use std::path::Path;
// use std::path::MAIN_SEPARATOR;
use zip::read::ZipArchive;

pub fn unzip_to(archive_path: &Path, to_dir: &Path) -> Result<(), BoxedError> {
    log::debug!("Unzipping {:?} to {:?}", archive_path, to_dir);

    match std::fs::create_dir_all(&to_dir) {
        Ok(_) => {}
        Err(e) => {
            log::error!("Failed to create directory {:?}: {:?}", to_dir, e);
            return Err(format!("Failed to create directory {:?}: {:?}", to_dir, e).into());
        }
    }

    let reader = match File::open(archive_path) {
        Ok(f) => f,
        Err(e) => {
            log::error!("Failed to open file {:?}: {:?}", archive_path, e);
            return Err(format!("Failed to open file {:?}: {:?}", archive_path, e).into());
        }
    };

    let mut archive = match ZipArchive::new(reader) {
        Ok(a) => a,
        Err(e) => {
            log::error!("Failed to read zip archive {:?}: {:?}", archive_path, e);
            return Err(format!("Failed to read zip archive {:?}: {:?}", archive_path, e).into());
        }
    };

    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        if file.is_dir() {
            let dir_path = to_dir.join(file.mangled_name());
            match std::fs::create_dir_all(&dir_path) {
                Ok(_) => {}
                Err(e) => {
                    log::error!("Failed to create directory {:?}: {:?}", dir_path, e);
                    return Err(
                        format!("Failed to create directory {:?}: {:?}", dir_path, e).into(),
                    );
                }
            };
        } else {
            let out_path = to_dir.join(file.mangled_name().as_os_str());
            if let Some(p) = out_path.parent() {
                match std::fs::create_dir_all(&p) {
                    Ok(_) => {}
                    Err(e) => {
                        log::error!("Failed to create directory {:?}: {:?}", p, e);
                        return Err(format!("Failed to create directory {:?}: {:?}", p, e).into());
                    }
                }
            }
            let mut outfile = match File::create(&out_path) {
                Ok(f) => f,
                Err(e) => {
                    log::error!("Failed to create file {:?}: {:?}", out_path, e);
                    return Err(format!("Failed to create file {:?}: {:?}", out_path, e).into());
                }
            };
            match std::io::copy(&mut file, &mut outfile) {
                Ok(_) => {}
                Err(e) => {
                    log::error!("Failed to copy file {:?}: {:?}", out_path, e);
                    return Err(format!("Failed to copy file {:?}: {:?}", out_path, e).into());
                }
            }
        }
    }
    Ok(())
}
