import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Enhanced pool configuration with connection management
export const pool = new Pool({ 
  connectionString: process.env.DATABASE_URL,
  max: 20, // Maximum number of clients
  idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // Return an error after 10 seconds if a connection couldn't be established
});

// Add event listeners for the connection pool
pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  // Attempt to reconnect or handle the error
});

// Function to check database connection and reconnect if needed
export async function checkDatabaseConnection() {
  try {
    const client = await pool.connect();
    try {
      await client.query('SELECT 1');
      console.log('Database connection successful');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Database connection error:', err);
    // You could implement retry logic here
  }
}

// Initialize connection check
checkDatabaseConnection();

// Set up a periodic connection check (every 8 hours)
setInterval(checkDatabaseConnection, 8 * 60 * 60 * 1000);

export const db = drizzle({ client: pool, schema });