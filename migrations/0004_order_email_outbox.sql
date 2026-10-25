CREATE TABLE order_emails (
  order_id INTEGER PRIMARY KEY,
  payload TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  locked_until INTEGER NOT NULL DEFAULT 0,
  provider_message_id TEXT,
  last_error TEXT,
  updated_at INTEGER NOT NULL
);
CREATE INDEX order_emails_status_idx ON order_emails(status, updated_at);
