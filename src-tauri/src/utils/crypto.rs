use aes_gcm::aead::{Aead, KeyInit};
use aes_gcm::{Aes256Gcm, Nonce};
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use aes_gcm::aead::generic_array::GenericArray;

pub fn encrypt(plaintext: &str, key: &str) -> Result<String, String> {
    let key_bytes = derive_key(key);
    let cipher = Aes256Gcm::new(GenericArray::from_slice(&key_bytes));

    let nonce_bytes: [u8; 12] = rand_nonce();
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher
        .encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| format!("Encryption error: {}", e))?;

    let mut combined = Vec::with_capacity(nonce_bytes.len() + ciphertext.len());
    combined.extend_from_slice(&nonce_bytes);
    combined.extend_from_slice(&ciphertext);

    Ok(BASE64.encode(&combined))
}

pub fn decrypt(encrypted: &str, key: &str) -> Result<String, String> {
    let key_bytes = derive_key(key);
    let cipher = Aes256Gcm::new(GenericArray::from_slice(&key_bytes));

    let combined = BASE64.decode(encrypted)
        .map_err(|e| format!("Base64 decode error: {}", e))?;

    if combined.len() < 12 {
        return Err("Invalid encrypted data: too short".to_string());
    }

    let (nonce_bytes, ciphertext) = combined.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher
        .decrypt(nonce, ciphertext)
        .map_err(|e| format!("Decryption error: {}", e))?;

    String::from_utf8(plaintext).map_err(|e| format!("UTF-8 error: {}", e))
}

fn derive_key(key: &str) -> [u8; 32] {
    use std::hash::{Hash, Hasher};
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    key.hash(&mut hasher);
    let hash1 = hasher.finish();

    let mut hasher2 = std::collections::hash_map::DefaultHasher::new();
    format!("{}-skiller-encryption-key", key).hash(&mut hasher2);
    let hash2 = hasher2.finish();

    let mut result = [0u8; 32];
    result[..8].copy_from_slice(&hash1.to_le_bytes());
    result[8..16].copy_from_slice(&hash2.to_le_bytes());
    result[16..24].copy_from_slice(&hash1.to_be_bytes());
    result[24..32].copy_from_slice(&hash2.to_be_bytes());
    result
}

fn rand_nonce() -> [u8; 12] {
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    let mut nonce = [0u8; 12];
    nonce[..8].copy_from_slice(&now.as_nanos().to_le_bytes()[..8]);
    nonce[8..].copy_from_slice(&now.as_secs().to_le_bytes()[..4]);
    nonce
}