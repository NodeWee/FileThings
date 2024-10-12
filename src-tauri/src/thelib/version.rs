use crate::errors::BoxedError;
use regex::Regex;
use std::cmp::Ordering;

pub fn compare_semver(ver1: &str, operator: &str, ver2: &str) -> Result<bool, BoxedError> {
    let re = Regex::new(r"(\d+)\.(\d+)(?:\.(\d+))?")?;

    let left_ver = re.captures(ver1).ok_or("Invalid version format")?;
    let mut left_ver_arr: [u32; 3] = [0; 3];
    for (i, cap) in left_ver.iter().enumerate().skip(1) {
        left_ver_arr[i - 1] = cap.map(|m| m.as_str()).unwrap_or("0").parse::<u32>()?;
    }

    let right_ver = re.captures(ver2).ok_or("Invalid version format")?;
    let mut right_ver_arr: [u32; 3] = [0; 3];
    for (i, cap) in right_ver.iter().enumerate().skip(1) {
        right_ver_arr[i - 1] = cap.map(|m| m.as_str()).unwrap_or("0").parse::<u32>()?;
    }

    // compare versions
    let allowed_operators = vec![
        "=", "!=", ">", "<", ">=", "<=", "lt", "gt", "eq", "ne", "le", "ge",
    ];
    if !allowed_operators.contains(&operator) {
        return Err("Invalid operator".into());
    }
    let ordered = left_ver_arr.cmp(&right_ver_arr);

    let result = match ordered {
        Ordering::Equal => {
            if vec!["=", ">=", "<=", "eq", "le", "ge"].contains(&operator) {
                true
            } else {
                false
            }
        }
        Ordering::Less => {
            if vec!["<", "<=", "lt", "le"].contains(&operator) {
                true
            } else {
                false
            }
        }
        Ordering::Greater => {
            if vec![">", ">=", "gt", "ge"].contains(&operator) {
                true
            } else {
                false
            }
        }
    };

    Ok(result)
}

// test compare_semver
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_compare_semver() {
        assert_eq!(compare_semver("1.2.3", "=", "1.2.3").unwrap(), true);
        assert_eq!(compare_semver("1.2.3", "!=", "1.2.3").unwrap(), false);
        assert_eq!(compare_semver("1.2.3", ">", "1.2.3").unwrap(), false);
        assert_eq!(compare_semver("1.2.3", "<", "1.2.3").unwrap(), false);
        assert_eq!(compare_semver("1.2.3", ">=", "1.2.3").unwrap(), true);
        assert_eq!(compare_semver("1.2.3", "<=", "1.2.3").unwrap(), true);

        assert_eq!(compare_semver("1.2.3", "<", "1.2.4").unwrap(), true);
        assert_eq!(compare_semver("1.2.3", "<=", "1.2.4").unwrap(), true);
        assert_eq!(compare_semver("1.2.3", ">", "1.2.4").unwrap(), false);
        assert_eq!(compare_semver("1.2.3", ">=", "1.2.4").unwrap(), false);

        assert_eq!(compare_semver("1.2.3", "<", "1.2.2").unwrap(), false);
        assert_eq!(compare_semver("1.2.3", "<=", "1.2.2").unwrap(), false);
        assert_eq!(compare_semver("1.2.3", ">", "1.2.2").unwrap(), true);
        assert_eq!(compare_semver("1.2.3", ">=", "1.2.2").unwrap(), true);

        assert_eq!(compare_semver("1.2", "=", "1.2.0").unwrap(), true);
        assert_eq!(compare_semver("1.2", "=", "1.2").unwrap(), true);
        assert_eq!(compare_semver("1.2", "<", "1.2.0").unwrap(), false);
        assert_eq!(compare_semver("1.2", "<", "1.2.1").unwrap(), true);
        assert_eq!(compare_semver("1.2", ">", "1.2.0").unwrap(), false);
    }
}
