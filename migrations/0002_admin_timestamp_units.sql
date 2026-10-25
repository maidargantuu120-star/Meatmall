-- Early admin bootstrap used seconds, while SQLite defaultNow() uses milliseconds.
UPDATE users SET created_at = created_at * 1000
WHERE typeof(created_at) = 'integer' AND created_at > 0 AND created_at < 100000000000;
