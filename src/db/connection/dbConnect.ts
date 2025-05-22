import mongoose, { Connection, MongooseError } from "mongoose";

// Environment variable for MongoDB URI
const MONGODB_URI = `${process.env.MONGODB_URI!}/ats`;

if (!MONGODB_URI) throw new Error("unable to get MONOGO_URI env");
// Cache to store the connection and promise
let cachedConnection: Connection | null = null;
let connectionPromise: Promise<Connection> | null = null;

// Enable production-specific optimizations
const isProduction = process.env.NODE_ENV === "production";

// Retry configuration for transient failures
const RETRY_COUNT = 3;
const RETRY_DELAY_MS = 1000;

/**
 * Establishes a connection to MongoDB using Mongoose, optimized for Edge runtime.
 * Reuses existing connection if available and implements retry logic for transient failures.
 */
export async function connectToDatabase(): Promise<Connection> {
  // Return cached connection if connected
  if (cachedConnection && cachedConnection.readyState === 1) {
    console.log("already connected");
    return cachedConnection;
  }

  // Return ongoing connection promise if connecting
  if (connectionPromise) {
    console.log("already connected");
    return connectionPromise;
  }

  // Validate MONGODB_URI
  if (!MONGODB_URI) {
    throw new Error("MONGODB_URI is not defined in environment variables");
  }

  // Retry logic for connection
  async function attemptConnection(attempt: number = 1): Promise<Connection> {
    try {
      // Configure Mongoose for Edge compatibility and performance
      mongoose.set("bufferCommands", false);
      mongoose.set("strictQuery", true); // Enforce strict schema validation

      // Establish connection
      const connection = await mongoose.connect(MONGODB_URI, {
        autoIndex: false, // Disable auto-indexing in production
        maxPoolSize: 5, // Reduced for Edge environments
        minPoolSize: 1, // Minimal connections
        connectTimeoutMS: 5000, // Shorter timeout for Edge
        socketTimeoutMS: 30000, // Close sockets after 30s inactivity
        serverSelectionTimeoutMS: 5000, // Faster server selection
      });

      cachedConnection = connection.connection;
      connectionPromise = null;

      // Log only in non-production or if explicitly enabled
      if (!isProduction) {
        console.log("MongoDB connected successfully");
      }

      // Handle connection events
      cachedConnection.on("error", (err) => {
        console.error("MongoDB connection error:", err);
        cachedConnection = null;
        connectionPromise = null;
      });

      cachedConnection.on("disconnected", () => {
        if (!isProduction) {
          console.warn("MongoDB disconnected");
        }
        cachedConnection = null;
        connectionPromise = null;
      });

      return cachedConnection;
    } catch (error) {
      // Handle specific MongoDB errors
      const err = error as MongooseError;
      if (err.name === "MongoServerSelectionError" && attempt <= RETRY_COUNT) {
        if (!isProduction) {
          console.warn(`Connection attempt ${attempt} failed, retrying...`);
        }
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS));
        return attemptConnection(attempt + 1);
      }

      cachedConnection = null;
      connectionPromise = null;
      console.error("MongoDB connection failed:", err);
      throw new Error(`Database connection failed: ${err.message}`);
    }
  }

  // Initiate connection attempt
  connectionPromise = attemptConnection();
  return connectionPromise;
}

/**
 * Closes the MongoDB connection and cleans up resources.
 * @returns {Promise<void>}
 */
export async function closeDatabaseConnection(): Promise<void> {
  if (cachedConnection && cachedConnection.readyState !== 0) {
    try {
      await mongoose.connection.close();
      if (!isProduction) {
        console.log("MongoDB connection closed");
      }
    } catch (error) {
      console.error("Error closing MongoDB connection:", error);
    } finally {
      cachedConnection = null;
      connectionPromise = null;
    }
  }
}
