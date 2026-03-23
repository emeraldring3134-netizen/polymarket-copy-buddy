import { logger } from '../utils/logger.js';

class MemoryProtectionService {
  constructor() {
    this.protectedObjects = new Map();
    this.protectedStrings = new WeakMap();
  }

  /**
   * Store a protected value in memory
   * Uses a Map with string keys for easy cleanup
   */
  protect(key, value) {
    if (!key) {
      throw new Error('Key is required for memory protection');
    }
    
    // Store with metadata for tracking
    this.protectedObjects.set(key, {
      value: value,
      createdAt: Date.now(),
      accessCount: 0
    });
    
    logger.debug(`Protected value stored with key: ${key}`);
  }

  /**
   * Retrieve a protected value
   */
  get(key) {
    if (!this.protectedObjects.has(key)) {
      throw new Error(`No protected value found for key: ${key}`);
    }
    
    const data = this.protectedObjects.get(key);
    data.accessCount++;
    return data.value;
  }

  /**
   * Check if a key exists
   */
  has(key) {
    return this.protectedObjects.has(key);
  }

  /**
   * Remove and overwrite a protected value
   */
  remove(key) {
    if (!this.protectedObjects.has(key)) {
      return false;
    }
    
    const data = this.protectedObjects.get(key);
    
    // Overwrite the value with random data before removal
    if (typeof data.value === 'string') {
      const randomData = Buffer.alloc(data.value.length);
      randomData.fill(Math.random() * 256);
      data.value = randomData.toString('hex').substring(0, data.value.length);
    }
    
    this.protectedObjects.delete(key);
    logger.debug(`Protected value removed for key: ${key}`);
    return true;
  }

  /**
   * Clear all protected memory
   */
  clearAll() {
    const keys = Array.from(this.protectedObjects.keys());
    keys.forEach(key => this.remove(key));
    logger.info(`Cleared ${keys.length} protected values from memory`);
  }

  /**
   * Get statistics about protected memory
   */
  getStats() {
    const stats = {
      totalProtected: this.protectedObjects.size,
      keys: Array.from(this.protectedObjects.keys()),
      oldestAccess: null,
      newestAccess: null,
      totalAccesses: 0
    };

    let oldestTime = Infinity;
    let newestTime = 0;

    this.protectedObjects.forEach((data, key) => {
      stats.totalAccesses += data.accessCount;
      
      if (data.createdAt < oldestTime) {
        oldestTime = data.createdAt;
        stats.oldestAccess = key;
      }
      
      if (data.createdAt > newestTime) {
        newestTime = data.createdAt;
        stats.newestAccess = key;
      }
    });

    return stats;
  }

  /**
   * Sanitize string to prevent memory leaks
   * Overwrite string with zeros (best effort in JavaScript)
   */
  sanitizeString(str) {
    if (typeof str !== 'string') {
      return;
    }

    // In JavaScript, strings are immutable, but we can try to overwrite references
    // This is a best-effort approach
    try {
      // Create a new string with same length filled with '0'
      const sanitized = '0'.repeat(str.length);
      // In V8, this might help with garbage collection
      return sanitized;
    } catch (error) {
      logger.warn('Failed to sanitize string:', error);
    }
  }

  /**
   * Prevent swapping to disk (best effort)
   * Note: This is not guaranteed in Node.js/JavaScript
   * In production, use native modules or OS-level configurations
   */
  preventSwapping() {
    if (process.platform !== 'linux' && process.platform !== 'darwin') {
      logger.warn('Memory swapping prevention only supported on Linux and macOS');
      return false;
    }

    try {
      // On Linux, we could use mlock() via native module
      // For now, log the recommendation
      logger.info('To prevent memory swapping on Linux, use: mlockall(MCL_CURRENT | MCL_FUTURE)');
      logger.info('Consider using native bindings: https://github.com/wayo/node-mlock');
      return true;
    } catch (error) {
      logger.warn('Failed to prevent swapping:', error);
      return false;
    }
  }

  /**
   * Set up process handlers to clean memory on exit
   */
  setupExitHandlers(callback) {
    const cleanup = () => {
      logger.info('Cleaning up protected memory before exit...');
      this.clearAll();
      if (callback) callback();
    };

    process.on('exit', cleanup);
    process.on('SIGINT', () => {
      cleanup();
      process.exit(0);
    });
    process.on('SIGTERM', () => {
      cleanup();
      process.exit(0);
    });
    process.on('uncaughtException', (error) => {
      logger.error('Uncaught exception:', error);
      cleanup();
      process.exit(1);
    });

    logger.info('Exit handlers configured for memory protection');
  }

  /**
   * Create a secure buffer that can be cleared
   */
  createSecureBuffer(size) {
    const buffer = Buffer.alloc(size);
    buffer.fill(0);
    
    return {
      buffer,
      write(data, offset = 0) {
        buffer.write(data, offset);
      },
      read(offset = 0, length = buffer.length) {
        return buffer.toString('utf8', offset, offset + length);
      },
      clear() {
        buffer.fill(Math.random() * 256);
        buffer.fill(0);
      }
    };
  }
}

export default new MemoryProtectionService();
