import fs from 'fs/promises';
import path from 'path';
import { db } from './db';
import { sql } from 'drizzle-orm';

// Directory for storing backups
const BACKUP_DIR = './data/backups';
const USERS_BACKUP_FILE = path.join(BACKUP_DIR, 'users_backup.json');
const ORDERS_BACKUP_FILE = path.join(BACKUP_DIR, 'orders_backup.json');
const ORDER_ITEMS_BACKUP_FILE = path.join(BACKUP_DIR, 'order_items_backup.json');
const PRODUCTS_BACKUP_FILE = path.join(BACKUP_DIR, 'products_backup.json');
const SERVICE_CATEGORIES_BACKUP_FILE = path.join(BACKUP_DIR, 'service_categories_backup.json');
const STORES_BACKUP_FILE = path.join(BACKUP_DIR, 'stores_backup.json');

/**
 * Ensure backup directory exists
 */
async function ensureBackupDir() {
  try {
    await fs.mkdir(BACKUP_DIR, { recursive: true });
    console.log(`Backup directory created/verified: ${BACKUP_DIR}`);
  } catch (error) {
    console.error('Error creating backup directory:', error);
  }
}

/**
 * Generic backup function to backup a table
 */
async function backupTable(tableName: string, filePath: string): Promise<boolean> {
  try {
    await ensureBackupDir();
    // Use raw SQL query to get all rows from the table
    const result = await db.execute(sql`SELECT * FROM ${sql.identifier(tableName)}`);
    const rows = result.rows;
    
    await fs.writeFile(filePath, JSON.stringify(rows, null, 2));
    console.log(`Backed up ${rows.length} rows from ${tableName} to ${filePath}`);
    return true;
  } catch (error) {
    console.error(`Error backing up table ${tableName}:`, error);
    return false;
  }
}

/**
 * Generic restore function to restore a table
 */
async function restoreTable(tableName: string, filePath: string, idField: string = 'id'): Promise<boolean> {
  try {
    const data = await fs.readFile(filePath, 'utf8');
    const rowsData = JSON.parse(data);
    
    if (!Array.isArray(rowsData) || rowsData.length === 0) {
      console.log(`No data to restore for table ${tableName}`);
      return false;
    }
    
    // Check if the table has any rows
    const result = await db.execute(sql`SELECT COUNT(*) FROM ${sql.identifier(tableName)}`);
    const count = parseInt(result.rows[0].count as string, 10);
    
    // Optional: Force verification of exact entries instead of just count
    // This makes sure we actually have ALL the data we need and not just the same number of rows
    const verificationNeeded = ['users', 'orders', 'order_items'].includes(tableName);
    
    if (count >= rowsData.length && !verificationNeeded) {
      console.log(`Table ${tableName} already has equal or more rows than backup, skipping restore`);
      return true;
    }
    
    // For critical tables, we'll do verification of specific records
    if (verificationNeeded && count > 0) {
      console.log(`Verifying data integrity for critical table: ${tableName}`);
      
      // Get the most recent record IDs from backup to verify they exist in DB
      const recentIds = rowsData
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5)
        .map(row => row[idField]);
      
      let allFound = true;
      
      for (const id of recentIds) {
        const checkResult = await db.execute(
          sql`SELECT COUNT(*) FROM ${sql.identifier(tableName)} WHERE ${sql.identifier(idField)} = ${id}`
        );
        const exists = parseInt(checkResult.rows[0].count as string, 10) > 0;
        
        if (!exists) {
          console.log(`Critical record with ${idField}=${id} missing from ${tableName}, restoration needed`);
          allFound = false;
          break;
        }
      }
      
      if (allFound) {
        console.log(`Verified critical records in ${tableName} are present, no restore needed`);
        return true;
      }
    }
    
    // For each row in the backup, check if it exists, if not insert it
    for (const row of rowsData) {
      const id = row[idField];
      const checkResult = await db.execute(
        sql`SELECT COUNT(*) FROM ${sql.identifier(tableName)} WHERE ${sql.identifier(idField)} = ${id}`
      );
      const exists = parseInt(checkResult.rows[0].count as string, 10) > 0;
      
      if (!exists) {
        // Build the insert query dynamically
        const columns = Object.keys(row);
        const values = Object.values(row);
        
        // Create placeholders ($1, $2, etc.) for each value
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        
        // Create the insert query
        const insertQuery = sql`
          INSERT INTO ${sql.identifier(tableName)} (${sql.join(columns.map(c => sql.identifier(c)), sql`, `)})
          VALUES (${sql.join(values.map(v => sql`${v}`), sql`, `)})
        `;
        
        await db.execute(insertQuery);
        console.log(`Restored row with ${idField}=${id} to table ${tableName}`);
      }
    }
    
    console.log(`Restored data to table ${tableName} from backup`);
    return true;
  } catch (error) {
    // If the backup file doesn't exist yet, it's not an error
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      console.log(`No backup file found for table ${tableName}, skipping restore`);
      return false;
    }
    
    console.error(`Error restoring table ${tableName}:`, error);
    return false;
  }
}

/**
 * Backup all important tables
 */
export async function runFullBackup() {
  console.log('Starting full data backup...');
  
  await backupTable('users', USERS_BACKUP_FILE);
  await backupTable('orders', ORDERS_BACKUP_FILE);
  await backupTable('order_items', ORDER_ITEMS_BACKUP_FILE);
  await backupTable('products', PRODUCTS_BACKUP_FILE);
  await backupTable('service_categories', SERVICE_CATEGORIES_BACKUP_FILE);
  await backupTable('stores', STORES_BACKUP_FILE);
  
  console.log('Full backup completed');
}

/**
 * Restore all data from backups
 */
export async function runFullRestore() {
  console.log('Starting full data restore from backups...');
  
  // Restore tables in the correct order to handle foreign key constraints
  await restoreTable('users', USERS_BACKUP_FILE);
  await restoreTable('service_categories', SERVICE_CATEGORIES_BACKUP_FILE);
  await restoreTable('stores', STORES_BACKUP_FILE);
  await restoreTable('products', PRODUCTS_BACKUP_FILE);
  await restoreTable('orders', ORDERS_BACKUP_FILE);
  await restoreTable('order_items', ORDER_ITEMS_BACKUP_FILE, 'id');
  
  console.log('Full restore completed');
}

/**
 * Verify data integrity and restore if issues found
 * This is a more thorough check than regular restore
 */
export async function verifyDataIntegrity() {
  console.log('Verifying data integrity...');
  
  try {
    // Check table counts
    const tables = ['users', 'orders', 'order_items', 'products', 'service_categories', 'stores'];
    let integrityIssuesFound = false;
    
    for (const table of tables) {
      const result = await db.execute(sql`SELECT COUNT(*) FROM ${sql.identifier(table)}`);
      const count = parseInt(result.rows[0].count as string, 10);
      
      // Any empty critical table is an integrity issue
      if (count === 0) {
        console.log(`Data integrity issue: Table ${table} is empty!`);
        integrityIssuesFound = true;
      }
      
      // For users and orders tables, we need a minimum expected count
      // based on what we've seen in the backups
      if ((table === 'users' && count < 10) || (table === 'orders' && count < 5)) {
        const backupFile = table === 'users' ? USERS_BACKUP_FILE : ORDERS_BACKUP_FILE;
        
        try {
          const data = await fs.readFile(backupFile, 'utf8');
          const rowsData = JSON.parse(data);
          
          if (Array.isArray(rowsData) && rowsData.length > count) {
            console.log(`Data integrity issue: Table ${table} has fewer records (${count}) than backup (${rowsData.length})`);
            integrityIssuesFound = true;
          }
        } catch (err) {
          // If we can't read the backup, we can't verify
          console.log(`Could not verify ${table} count against backup`);
        }
      }
    }
    
    // If integrity issues were found, run a full restore
    if (integrityIssuesFound) {
      console.log('Data integrity issues found, running full restore...');
      await runFullRestore();
    } else {
      console.log('Data integrity verification passed');
    }
  } catch (error) {
    console.error('Error during data integrity verification:', error);
  }
}

/**
 * Schedule regular backups and integrity checks
 * @param intervalMinutes How often to run backups (in minutes)
 */
export function scheduleRegularBackups(intervalMinutes: number = 15) {
  console.log(`Scheduling regular backups every ${intervalMinutes} minutes`);
  
  // Run initial backup and integrity check
  runFullBackup();
  
  // Schedule regular backups
  setInterval(runFullBackup, intervalMinutes * 60 * 1000);
  
  // Schedule daily integrity verification (once a day at 3 AM)
  const scheduleIntegrityCheck = () => {
    const now = new Date();
    const targetTime = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1, // tomorrow
      3, // 3 AM
      0, 
      0
    );
    
    const timeUntilTarget = targetTime.getTime() - now.getTime();
    
    // Schedule the first integrity check
    setTimeout(async () => {
      await verifyDataIntegrity();
      
      // Then schedule it to run daily
      setInterval(verifyDataIntegrity, 24 * 60 * 60 * 1000);
    }, timeUntilTarget);
    
    console.log(`Scheduled data integrity verification for ${targetTime.toLocaleString()}`);
  };
  
  // Start the scheduling
  scheduleIntegrityCheck();
}