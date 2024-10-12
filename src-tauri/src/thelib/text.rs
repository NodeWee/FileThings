use crate::errors::BoxedError;

#[allow(dead_code)]
pub fn right_replace_once(
    original: &str,
    pattern: &str,
    replacement: &str,
) -> Result<String, BoxedError> {
    if let Some(index) = original.rfind(pattern) {
        let (left, right) = original.split_at(index);
        Ok(format!(
            "{}{}{}",
            left,
            replacement,
            &right[pattern.len()..]
        ))
    } else {
        Ok(original.to_string())
    }
}
