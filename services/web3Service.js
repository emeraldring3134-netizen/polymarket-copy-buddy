import { ethers } from 'ethers';
import { logger } from '../utils/logger.js';
import keyEncryption from './keyEncryption.js';
import memoryProtection from './memoryProtection.js';

const POLYGON_RPC_URL = process.env.POLYGON_RPC_URL || 'https://polygon-rpc.com';

class Web3Service {
  constructor() {
    if (!POLYGON_RPC_URL) {
      throw new Error('POLYGON_RPC_URL is required');
    }
    this.provider = new ethers.JsonRpcProvider(POLYGON_RPC_URL);
    this.signer = null;
    this.currentWalletAddress = null;
  }

  /**
   * Initialize with encrypted private key and password
   */
  async initializeWithEncryptedKey(encryptedData, password) {
    try {
      // Decrypt the private key
      const decryptedKey = keyEncryption.decryptPrivateKey(encryptedData, password);
      
      // Store decrypted key in protected memory
      memoryProtection.protect('privateKey', decryptedKey);
      keyEncryption.storeDecryptedKey(decryptedKey);
      
      // Set wallet
      this.setWallet(decryptedKey);
      
      logger.info('Wallet initialized with encrypted key');
      return true;
    } catch (error) {
      logger.error('Failed to initialize wallet with encrypted key:', error);
      throw error;
    }
  }

  /**
   * Set wallet with private key
   */
  setWallet(privateKey) {
    if (!privateKey) {
      throw new Error('Private key is required');
    }
    this.signer = new ethers.Wallet(privateKey, this.provider);
    this.currentWalletAddress = this.signer.address;
    logger.info(`Wallet set successfully: ${this.formatAddress(this.currentWalletAddress)}`);
  }

  /**
   * Set wallet from encrypted key (must be decrypted first)
   */
  setWalletFromEncrypted() {
    try {
      const decryptedKey = keyEncryption.getDecryptedKey();
      this.setWallet(decryptedKey);
    } catch (error) {
      logger.error('Failed to set wallet from encrypted key:', error);
      throw error;
    }
  }

  /**
   * Get current wallet address
   */
  getWalletAddress() {
    return this.currentWalletAddress;
  }

  /**
   * Check if wallet is initialized
   */
  isWalletInitialized() {
    return this.signer !== null && this.currentWalletAddress !== null;
  }

  async getBalance(address) {
    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error) {
      logger.error('Error getting balance:', error);
      throw error;
    }
  }

  async estimateGas(transaction) {
    try {
      const gasEstimate = await this.provider.estimateGas(transaction);
      return gasEstimate;
    } catch (error) {
      logger.error('Error estimating gas:', error);
      throw error;
    }
  }

  /**
   * Send transaction using the initialized wallet
   */
  async sendTransaction(transaction) {
    try {
      if (!this.signer) {
        throw new Error('Wallet not initialized. Call initializeWithEncryptedKey first.');
      }

      const tx = await this.signer.sendTransaction(transaction);
      const receipt = await tx.wait();
      logger.info(`Transaction sent: ${tx.hash}`);
      return {
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status,
      };
    } catch (error) {
      logger.error('Error sending transaction:', error);
      throw error;
    }
  }

  /**
   * Send transaction from a specific wallet address
   * This requires the wallet to be in the user's trading wallets
   */
  async sendTransactionFromWallet(transaction, walletAddress, privateKey) {
    try {
      const wallet = new ethers.Wallet(privateKey, this.provider);
      const tx = await wallet.sendTransaction(transaction);
      const receipt = await tx.wait();
      logger.info(`Transaction sent from ${walletAddress}: ${tx.hash}`);
      return {
        hash: tx.hash,
        blockNumber: receipt.blockNumber,
        status: receipt.status,
        from: walletAddress,
      };
    } catch (error) {
      logger.error('Error sending transaction:', error);
      throw error;
    }
  }

  async getTransactionReceipt(txHash) {
    try {
      const receipt = await this.provider.getTransactionReceipt(txHash);
      return receipt;
    } catch (error) {
      logger.error('Error getting transaction receipt:', error);
      throw error;
    }
  }

  isValidAddress(address) {
    return ethers.isAddress(address);
  }

  formatAddress(address, length = 6) {
    if (!this.isValidAddress(address)) return address;
    return `${address.substring(0, 2 + length)}...${address.substring(address.length - length)}`;
  }

  parseEther(value) {
    return ethers.parseEther(value.toString());
  }

  formatEther(value) {
    return ethers.formatEther(value);
  }

  /**
   * Clean up sensitive data from memory
   */
  cleanup() {
    logger.info('Cleaning up Web3 service...');
    this.signer = null;
    this.currentWalletAddress = null;
    keyEncryption.clearDecryptedKey();
    memoryProtection.remove('privateKey');
  }
}

export default new Web3Service();
