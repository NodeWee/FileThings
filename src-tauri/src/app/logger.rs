use crate::app::resource::get_app_data_dir;
use crate::thelib::sys::is_debug;
use flexi_logger::{Cleanup, Criterion, Duplicate, FileSpec, LogSpecification, Logger, Naming};
/// level: trace, debug, info, warn, error
pub fn setup_logger() -> Result<(), Box<dyn std::error::Error>> {
    let level = if is_debug() { "debug" } else { "info" };
    let app_dir_path = get_app_data_dir()?;
    let log_dir = app_dir_path.join("logs");
    std::fs::create_dir_all(&log_dir)?;

    Logger::try_with_env_or_str(level)
        .unwrap_or_else(|_| Logger::with(LogSpecification::default()))
        .log_to_file(
            FileSpec::default()
                .directory(log_dir) // Use the new logs directory path
                .basename("app")
                .suffix("log"),
        )
        .rotate(
            Criterion::Size(5 * 1024 * 1024), // Rotate log file when it reaches 5MB
            Naming::TimestampsDirect,
            Cleanup::KeepLogFiles(5),
        )
        .duplicate_to_stderr(Duplicate::All)
        .format_for_files(|w, now, record| {
            write!(
                w,
                "{} {} {}: {}",
                now.now(),
                record.level(),
                record.target(),
                record.args()
            )
        })
        .start()?;

    Ok(())
}
