use std::error::Error;
use std::fmt;
use tauri::ipc::InvokeError;

pub type BoxedError = Box<dyn std::error::Error>;

pub struct CallError {
    msg: String,
}

impl CallError {
    pub fn new(msg: &str) -> Self {
        Self {
            msg: msg.to_string(),
        }
    }

    #[allow(dead_code)]
    // fn for printing the error message
    pub fn msg(&self) -> &str {
        &self.msg
    }
}

impl fmt::Debug for CallError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.msg)
    }
}

impl fmt::Display for CallError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.msg)
    }
}

impl Error for CallError {}

impl Into<InvokeError> for CallError {
    fn into(self) -> InvokeError {
        InvokeError::from_error(self)
    }
}

pub fn pack_called_error(msg: &str) -> Result<String, CallError> {
    Err(CallError::new(msg))
}
