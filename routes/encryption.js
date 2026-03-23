import express from 'express';
import User from '../models/User.js';
import keyEncryption from '../services/keyEncryption.js';
import memoryProtection from '../services/memoryProtection.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

/**
 * POST /api/encryption/setup
 * Setup encryption for the first time (encrypt and store private key)
 */
router.post('/setup', async (req, res) => {
  try {
    const { privateKey, password } = req.body;

    if (!privateKey || !password) {
      return res.status(400).json({ error: 'Private key and password are required' });
    }

    // Test password strength
    const strengthTest = keyEncryption.testPasswordStrength(password);
    if (strengthTest.score < 50) {
      return res.status(400).json({ 
        error: 'Password is too weak',
        warnings: strengthTest.warnings
      });
    }

    // Encrypt the private key
    const encryptedData = keyEncryption.encryptPrivateKey(privateKey, password);

    // Store in user's encryptedPrivateKey field
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    user.encryptedPrivateKey = encryptedData;
    await user.save();

    // Initialize the service
    await keyEncryption.initialize(encryptedData.encryptedKey, password);

    logger.info(`Encryption setup completed for user ${userId}`);

    res.json({ 
      success: true,
      message: 'Encryption setup completed successfully',
      walletAddress: user.walletAddress,
      algorithm: encryptedData.algorithm,
      keyLength: encryptedData.keyLength
    });
  } catch (error) {
    logger.error('Error setting up encryption:', error);
    res.status(500).json({ error: 'Failed to setup encryption' });
  }
});

/**
 * POST /api/encryption/decrypt
 * Decrypt the private key with password
 */
router.post('/decrypt', async (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findById(userId).select('+encryptedPrivateKey');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!user.encryptedPrivateKey || !user.encryptedPrivateKey.encryptedKey) {
      return res.status(400).json({ error: 'No encrypted key found. Please setup encryption first.' });
    }

    try {
      // Decrypt the private key
      const decryptedKey = keyEncryption.decryptPrivateKey(
        user.encryptedPrivateKey.encryptedKey,
        password
      );

      // Store in protected memory
      memoryProtection.protect('privateKey', decryptedKey);
      keyEncryption.storeDecryptedKey(decryptedKey);

      logger.info(`Decryption completed for user ${userId}`);

      res.json({ 
        success: true,
        message: 'Decryption completed successfully',
        walletAddress: user.walletAddress
      });
    } catch (decryptError) {
      logger.error('Decryption failed:', decryptError);
      return res.status(401).json({ error: 'Invalid password' });
    }
  } catch (error) {
    logger.error('Error decrypting private key:', error);
    res.status(500).json({ error: 'Failed to decrypt private key' });
  }
});

/**
 * POST /api/encryption/change-password
 * Change the encryption password
 */
router.post('/change-password', async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: 'Old password and new password are required' });
    }

    // Test new password strength
    const strengthTest = keyEncryption.testPasswordStrength(newPassword);
    if (strengthTest.score < 50) {
      return res.status(400).json({ 
        error: 'New password is too weak',
        warnings: strengthTest.warnings
      });
    }

    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findById(userId).select('+encryptedPrivateKey');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    try {
      // Decrypt with old password
      const decryptedKey = keyEncryption.decryptPrivateKey(
        user.encryptedPrivateKey.encryptedKey,
        oldPassword
      );

      // Re-encrypt with new password
      const newEncryptedData = keyEncryption.encryptPrivateKey(decryptedKey, newPassword);

      // Update user record
      user.encryptedPrivateKey = newEncryptedData;
      await user.save();

      // Clear old decrypted key from memory
      keyEncryption.clearDecryptedKey();
      memoryProtection.remove('privateKey');

      logger.info(`Password changed for user ${userId}`);

      res.json({ 
        success: true,
        message: 'Password changed successfully'
      });
    } catch (decryptError) {
      logger.error('Old password verification failed:', decryptError);
      return res.status(401).json({ error: 'Invalid old password' });
    }
  } catch (error) {
    logger.error('Error changing password:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

/**
 * POST /api/encryption/lock
 * Lock encryption (clear decrypted key from memory)
 */
router.post('/lock', async (req, res) => {
  try {
    // Clear decrypted key from memory
    keyEncryption.clearDecryptedKey();
    memoryProtection.remove('privateKey');

    logger.info('Encryption locked');

    res.json({ 
      success: true,
      message: 'Encryption locked successfully'
    });
  } catch (error) {
    logger.error('Error locking encryption:', error);
    res.status(500).json({ error: 'Failed to lock encryption' });
  }
});

/**
 * GET /api/encryption/status
 * Get encryption status
 */
router.get('/status', async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const user = await User.findById(userId).select('+encryptedPrivateKey');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isDecrypted = keyEncryption.isKeyDecrypted();
    const hasEncryptedKey = !!(user.encryptedPrivateKey?.encryptedKey);
    const memoryStats = memoryProtection.getStats();

    res.json({ 
      success: true,
      isSetup: hasEncryptedKey,
      isDecrypted: isDecrypted,
      algorithm: user.encryptedPrivateKey?.algorithm,
      keyLength: user.encryptedPrivateKey?.keyLength,
      memoryProtected: memoryStats.totalProtected > 0,
      lastEncryptedAt: user.encryptedPrivateKey?.timestamp
    });
  } catch (error) {
    logger.error('Error getting encryption status:', error);
    res.status(500).json({ error: 'Failed to get encryption status' });
  }
});

/**
 * POST /api/encryption/test-password
 * Test password strength
 */
router.post('/test-password', (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: 'Password is required' });
    }

    const strengthTest = keyEncryption.testPasswordStrength(password);

    res.json({ 
      success: true,
      strength: strengthTest
    });
  } catch (error) {
    logger.error('Error testing password:', error);
    res.status(500).json({ error: 'Failed to test password' });
  }
});

export default router;
