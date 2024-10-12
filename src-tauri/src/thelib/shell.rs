use crate::errors::BoxedError;
use std::process::Command;
use std::process::Stdio;

#[cfg(windows)]
use std::os::windows::process::CommandExt;
#[cfg(windows)]
const CREATE_NO_WINDOW: u32 = 0x08000000;

/// function: execute the shell command and return the execution result
/// parameter: command, array of arguments
/// return:
/// - success: Ok("string of stdout")
/// - not success: Err("string of stderr")
pub fn exec_command(command: &str, args: Vec<&str>) -> Result<String, BoxedError> {
    log::debug!("exec command: {}, args: {:?}", command, args);

    // to avoid pop up cmd window on Windows, need to set CREATE_NO_WINDOW
    #[cfg(windows)]
    let child = Command::new(command)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()?;

    #[cfg(not(windows))]
    let child = Command::new(command)
        .args(args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()?;

    let output = child.wait_with_output()?;

    log::debug!("exec command output: {:?}", output);

    if output.status.success() {
        let out_str = match String::from_utf8_lossy(&output.stdout) {
            s if s.is_empty() => String::from(""),
            s => s.trim().to_string(),
        };
        log::debug!("exec command success: {}", out_str);
        Ok(out_str)
    } else {
        let err_msg = String::from_utf8_lossy(&output.stderr).trim().to_string();
        log::error!("exec command failed: {}", err_msg);
        Err(err_msg.to_string().into())
    }
}
