/**
 * AES-256-GCM encryption for Outlook OAuth tokens.
 *
 * Requires TOKEN_ENCRYPTION_KEY env var: a 64-character hex string (32 bytes).
 * Generate one with:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 *
 * Stored format: <iv_hex>:<authTag_hex>:<ciphertext_hex>
 * All three parts are needed to decrypt; tampering with any part causes an error.
 */

const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';

function getKey() {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) {
    throw new Error(
      'TOKEN_ENCRYPTION_KEY must be a 64-character hex string (32 bytes). ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  return Buffer.from(hex, 'hex');
}

function encrypt(plaintext) {
  const key = getKey();
  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
}

function decrypt(stored) {
  const parts = stored.split(':');
  if (parts.length !== 3) throw new Error('Token cifrato non valido — formato non riconosciuto');
  const [ivHex, authTagHex, ciphertextHex] = parts;
  const key = getKey();
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextHex, 'hex')),
    decipher.final()
  ]);
  return plaintext.toString('utf8');
}

/**
 * Returns true if the value looks like an encrypted token (iv:tag:ciphertext).
 * Used to handle tokens stored before this migration was applied.
 */
function isEncrypted(value) {
  return typeof value === 'string' && value.split(':').length === 3;
}

module.exports = { encrypt, decrypt, isEncrypted };
