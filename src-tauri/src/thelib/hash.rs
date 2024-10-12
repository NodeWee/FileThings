use md5;
use sha1::Sha1;
use sha2::{Digest, Sha256, Sha512};

pub fn calc_md5(data: &[u8]) -> String {
    let digest = md5::compute(&data);
    let result = format!("{:x}", digest);
    result
}

pub fn calc_sha1(data: &[u8]) -> String {
    let hash = Sha1::new().chain_update(&data).finalize();
    let result = format!("{:x}", hash);
    result
}

pub fn calc_sha256(data: &[u8]) -> String {
    let hash = Sha256::new().chain_update(&data).finalize();
    let result = format!("{:x}", hash);
    result
}

pub fn calc_sha512(data: &[u8]) -> String {
    let mut hasher = Sha512::new();
    hasher.update(&data);
    let digest = hasher.finalize();
    let result = format!("{:x}", digest);
    result
}
