import crypto from 'crypto';
import { logger } from '../utils/logger.js';

class KeyEncryptionService {
  constructor() {
    this.algorithm = 'aes-256-gcm';
    this.keyLength = 32; // 256 bits
    this.ivLength = 16; // 128 bits
    this.saltLength = 64;
    this.tagLength = 16;
    this.isDecrypted = false;
    this.decryptedPrivateKey = null;
    this.encryptedKeyData = null;
  }

  /**
   * Generate a random salt for key derivation
   */
  generateSalt() {
    return crypto.randomBytes(this.saltLength);
  }

  /**
   * Derive encryption key from password using PBKDF2
   */
  deriveKey(password, salt) {
    return crypto.pbkdf2Sync(password, salt, 100000, this.keyLength, 'sha256');
  }

  /**
   * Encrypt private key with password
   */
  encryptPrivateKey(privateKey, password) {
    try {
      // Validate inputs
      if (!privateKey || typeof privateKey !== 'string') {
        throw new Error('Private key is required');
      }
      if (!password || typeof password !== 'string') {
        throw new Error('Password is required');
      }

      // Validate private key format (basic check)
      if (!privateKey.startsWith('0x') && privateKey.length !== 64) {
        logger.warn('Private key may not be in correct format');
      }

      // Generate salt and IV
      const salt = this.generateSalt();
      const iv = crypto.randomBytes(this.ivLength);

      // Derive key from password
      const key = this.deriveKey(password, salt);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, key, iv);

      // Encrypt private key
      let encrypted = cipher.update(privateKey, 'utf8', 'hex');
      encrypted += cipher.final('hex');

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      // Combine all components: salt + iv + authTag + encrypted
      const encryptedData = Buffer.concat([
        salt,
        iv,
        authTag,
        Buffer.from(encrypted, 'hex')
      ]);

      logger.info('Private key encrypted successfully');
      return {
        encryptedKey: encryptedData.toString('base64'),
        algorithm: this.algorithm,
        keyLength: this.keyLength,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error encrypting private key:', error);
      throw new Error(`Failed to encrypt private key: ${error.message}`);
    }
  }

  /**
   * Decrypt private key with password
   */
  decryptPrivateKey(encryptedData, password) {
    try {
      // Validate inputs
      if (!encryptedData || typeof encryptedData !== 'string') {
        throw new Error('Encrypted data is required');
      }
      if (!password || typeof password !== 'string') {
        throw new Error('Password is required');
      }

      // Parse encrypted data
      const dataBuffer = Buffer.from(encryptedData, 'base64');

      if (dataBuffer.length < this.saltLength + this.ivLength + this.tagLength) {
        throw new Error('Invalid encrypted data format');
      }

      // Extract components
      let offset = 0;
      const salt = dataBuffer.subarray(offset, offset + this.saltLength);
      offset += this.saltLength;
      const iv = dataBuffer.subarray(offset, offset + this.ivLength);
      offset += this.ivLength;
      const authTag = dataBuffer.subarray(offset, offset + this.tagLength);
      offset += this.tagLength;
      const encrypted = dataBuffer.subarray(offset);

      // Derive key from password
      const key = this.deriveKey(password, salt);

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv);
      decipher.setAuthTag(authTag);

      // Decrypt
      let decrypted = decipher.update(encrypted, null, 'utf8');
      decrypted += decipher.final('utf8');

      logger.info('Private key decrypted successfully');
      return decrypted;
    } catch (error) {
      logger.error('Error decrypting private key:', error);
      throw new Error(`Failed to decrypt private key: ${error.message}`);
    }
  }

  /**
   * Store encrypted key in memory
   */
  storeDecryptedKey(privateKey) {
    if (!privateKey) {
      throw new Error('Private key is required');
    }
    this.decryptedPrivateKey = privateKey;
    this.isDecrypted = true;
    logger.info('Decrypted private key stored in memory');
  }

  /**
   * Get decrypted private key
   */
  getDecryptedKey() {
    if (!this.isDecrypted || !this.decryptedPrivateKey) {
      throw new Error('No decrypted key available. Please decrypt first.');
    }
    return this.decryptedPrivateKey;
  }

  /**
   * Check if key is decrypted
   */
  isKeyDecrypted() {
    return this.isDecrypted;
  }

  /**
   * Clear decrypted key from memory
   */
  clearDecryptedKey() {
    if (this.decryptedPrivateKey) {
      // Overwrite with random data before clearing
      this.decryptedPrivateKey = crypto.randomBytes(this.decryptedPrivateKey.length).toString('hex');
      this.decryptedPrivateKey = null;
    }
    this.isDecrypted = false;
    logger.info('Decrypted private key cleared from memory');
  }

  /**
   * Test password strength
   */
  testPasswordStrength(password) {
    const result = {
      score: 0,
      warnings: []
    };

    if (!password) {
      result.warnings.push('Password is required');
      return result;
    }

    if (password.length < 12) {
      result.warnings.push('Password should be at least 12 characters long');
    } else {
      result.score += 20;
    }

    if (password.length >= 16) {
      result.score += 10;
    }

    if (/[a-z]/.test(password)) {
      result.score += 15;
    } else {
      result.warnings.push('Password should contain lowercase letters');
    }

    if (/[A-Z]/.test(password)) {
      result.score += 15;
    } else {
      result.warnings.push('Password should contain uppercase letters');
    }

    if (/[0-9]/.test(password)) {
      result.score += 15;
    } else {
      result.warnings.push('Password should contain numbers');
    }

    if (/[^a-zA-Z0-9]/.test(password)) {
      result.score += 25;
    } else {
      result.warnings.push('Password should contain special characters');
    }

    // Cap score at 100
    result.score = Math.min(result.score, 100);

    return result;
  }

  /**
   * Store encrypted key data (from database)
   */
  setEncryptedKeyData(data) {
    this.encryptedKeyData = data;
  }

  /**
   * Get encrypted key data
   */
  getEncryptedKeyData() {
    return this.encryptedKeyData;
  }

  /**
   * Initialize with encrypted data and attempt decryption
   */
  async initialize(encryptedData, password) {
    try {
      this.setEncryptedKeyData(encryptedData);
      const decryptedKey = this.decryptPrivateKey(encryptedData, password);
      this.storeDecryptedKey(decryptedKey);
      logger.info('Key encryption service initialized successfully');
      return true;
    } catch (error) {
      logger.error('Failed to initialize key encryption service:', error);
      throw error;
    }
  }
}

export default new KeyEncryptionService();
