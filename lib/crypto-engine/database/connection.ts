import mongoose from 'mongoose';
import logger from '../utils/logger';

class DatabaseConnection {
  private static instance: DatabaseConnection;
  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;

  private constructor() {}

  static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  async connect(): Promise<void> {
    if (this.isConnected) {
      logger.debug('MongoDB already connected');
      return;
    }

    // Prevent multiple concurrent connection attempts
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    const uri = process.env.MONGODB_URI;
    if (!uri) {
      logger.warn('MONGODB_URI is not defined – skipping database connection');
      return;
    }

    this.connectionPromise = this.doConnect(uri);
    await this.connectionPromise;
    this.connectionPromise = null;
  }

  private async doConnect(uri: string): Promise<void> {
    try {
      await mongoose.connect(uri, {
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 30000,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 10000,
        serverSelectionTimeoutMS: 5000,
        heartbeatFrequencyMS: 10000,
      });

      this.isConnected = true;
      logger.info('✅ MongoDB connected successfully');

      // Handle connection events
      mongoose.connection.on('error', (error) => {
        logger.error({ error: error.message }, 'MongoDB connection error');
        this.isConnected = false;
      });

      mongoose.connection.on('disconnected', () => {
        logger.warn('MongoDB disconnected');
        this.isConnected = false;
      });

      mongoose.connection.on('reconnected', () => {
        logger.info('MongoDB reconnected');
        this.isConnected = true;
      });

    } catch (error) {
      logger.error({ error: (error as Error).message }, 'Failed to connect to MongoDB');
      this.isConnected = false;
      this.connectionPromise = null;
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await mongoose.disconnect();
      this.isConnected = false;
      logger.info('MongoDB disconnected');
    }
  }

  isReady(): boolean {
    return this.isConnected && mongoose.connection.readyState === 1;
  }

  getConnection(): typeof mongoose | null {
    return this.isConnected ? mongoose : null;
  }
}

export const db = DatabaseConnection.getInstance();

// Auto-connect on import (if URI exists)
if (process.env.MONGODB_URI) {
  db.connect().catch(() => {
    // Silently fail – will retry on first operation
  });
}