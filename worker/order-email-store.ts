import type { D1Database } from '@cloudflare/workers-types';
const initialized = new WeakSet<D1Database>();

// Older deployments may have the core order schema but not migration 0004.
// Prepare the outbox before the atomic order/items/inventory transaction.
export async function ensureOrderEmailStore(db: D1Database) {
  if (initialized.has(db)) return;
  await db.batch([
    db.prepare(`CREATE TABLE IF NOT EXISTS order_emails (
      order_id INTEGER PRIMARY KEY,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      attempts INTEGER NOT NULL DEFAULT 0,
      locked_until INTEGER NOT NULL DEFAULT 0,
      provider_message_id TEXT,
      last_error TEXT,
      updated_at INTEGER NOT NULL
    )`),
    db.prepare('CREATE INDEX IF NOT EXISTS order_emails_status_idx ON order_emails(status, updated_at)'),
  ]);
  initialized.add(db);
}
