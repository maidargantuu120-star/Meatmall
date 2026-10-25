import { sql } from "drizzle-orm";
import { sqliteTable, text, integer, uniqueIndex } from "drizzle-orm/sqlite-core";

export async function up(db) {
    // SQLite doesn't support dropping constraints easily, so we need to:
    // 1. Create new table without unique constraint on username
    // 2. Copy data
    // 3. Drop old table
    // 4. Rename new table

    await db.run(sql`
    CREATE TABLE users_new (
      id integer PRIMARY KEY AUTOINCREMENT NOT NULL,
      username text NOT NULL,
      password text NOT NULL,
      email text NOT NULL,
      name text,
      phone text,
      google_id text,
      profile_image_url text,
      is_admin integer DEFAULT false NOT NULL,
      created_at integer
    );
  `);

    await db.run(sql`
    INSERT INTO users_new (id, username, password, email, name, phone, google_id, profile_image_url, is_admin, created_at)
    SELECT id, username, password, email, name, phone, google_id, profile_image_url, is_admin, created_at FROM users;
  `);

    await db.run(sql`DROP TABLE users;`);
    await db.run(sql`ALTER TABLE users_new RENAME TO users;`);

    // Re-create indices (email should still be unique, username should NOT)
    await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique ON users (email);`);
    await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_unique ON users (google_id);`);
}

export async function down(db) {
    // Revert changes - meaningless if data violates unique constraint, but for completeness:
    await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS users_username_unique ON users (username);`);
}
